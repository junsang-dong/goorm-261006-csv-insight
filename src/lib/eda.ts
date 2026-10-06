import Papa from 'papaparse'

export type Row = Record<string, string>
export type ScopeMode = 'all' | 'first100' | 'random100'
export type ColumnKind = 'numeric' | 'binary' | 'categorical' | 'identifier' | 'constant' | 'empty'

export interface ColumnProfile {
  name: string; kind: ColumnKind; valid: number; missing: number; unique: number;
  mean?: number; median?: number; std?: number | null; min?: number; max?: number;
  q1?: number; q3?: number; p5?: number; p95?: number; skew?: number | null; outliers?: number;
}

export interface Dataset {
  name: string; rows: Row[]; columns: string[]; delimiter: string; emptyLines: number; bytes: number;
}

export interface Analysis {
  dataset: Dataset; scopedRows: Row[]; filteredRows: Row[]; profiles: ColumnProfile[];
  target: string; targetProfile?: ColumnProfile; duplicateRows: number; missingCells: number;
  correlations: { name: string; value: number | null; n: number }[];
  findings: { severity: '주의' | '발견' | '정보'; title: string; message: string }[];
}

const missing = (v: unknown) => v == null || String(v).trim() === ''
const finite = (v: string) => v.trim() !== '' && Number.isFinite(Number(v))
const quantile = (sorted: number[], p: number) => {
  if (!sorted.length) return NaN
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length

export function parseText(text: string, name: string, bytes = new Blob([text]).size, forcedDelimiter?: string): Dataset {
  const clean = text.replace(/^\uFEFF/, '')
  const parsed = Papa.parse<string[]>(clean, { delimiter: forcedDelimiter || '', skipEmptyLines: 'greedy' })
  if (parsed.errors.some(e => e.code === 'TooManyFields' || e.code === 'TooFewFields')) {
    const issue = parsed.errors.find(e => e.row != null)!
    throw new Error(`${(issue.row ?? 0) + 1}번째 행의 열 수가 일치하지 않습니다.`)
  }
  const raw = parsed.data
  if (raw.length < 2) throw new Error('헤더와 데이터 행을 확인해 주세요.')
  const seen = new Map<string, number>()
  const columns = raw[0].map((h, i) => {
    const base = String(h || `column_${i + 1}`).trim() || `column_${i + 1}`
    const count = (seen.get(base) || 0) + 1; seen.set(base, count)
    return count > 1 ? `${base}_${count}` : base
  })
  const rows = raw.slice(1).map(values => Object.fromEntries(columns.map((c, i) => [c, String(values[i] ?? '').trim()])))
  return { name, rows, columns, delimiter: parsed.meta.delimiter || forcedDelimiter || ',', emptyLines: Math.max(0, clean.split(/\r?\n/).length - raw.length), bytes }
}

function sampleRows(rows: Row[], mode: ScopeMode): Row[] {
  if (mode === 'all' || rows.length <= 100) return rows
  if (mode === 'first100') return rows.slice(0, 100)
  let seed = 42
  const ranked = rows.map((row, index) => { seed = (seed * 1664525 + 1013904223) >>> 0; return { row, index, rank: seed } })
  return ranked.sort((a, b) => a.rank - b.rank).slice(0, 100).sort((a, b) => a.index - b.index).map(x => x.row)
}

export function profileColumn(rows: Row[], name: string): ColumnProfile {
  const raw = rows.map(r => r[name]).filter(v => !missing(v))
  const unique = new Set(raw).size
  if (!raw.length) return { name, kind: 'empty', valid: 0, missing: rows.length, unique: 0 }
  const allNumeric = raw.every(finite)
  let kind: ColumnKind = allNumeric ? 'numeric' : 'categorical'
  if (unique === 1) kind = 'constant'
  else if (unique === 2 && raw.every(v => ['0', '1', 'true', 'false'].includes(v.toLowerCase()))) kind = 'binary'
  else if (/^(id|index|uuid)$/i.test(name)) kind = 'identifier'
  const result: ColumnProfile = { name, kind, valid: raw.length, missing: rows.length - raw.length, unique }
  if (allNumeric && kind !== 'identifier') {
    const nums = raw.map(Number).sort((a, b) => a - b), avg = mean(nums)
    const q1 = quantile(nums, .25), q3 = quantile(nums, .75), iqr = q3 - q1
    const variance = nums.length > 1 ? nums.reduce((s, x) => s + (x - avg) ** 2, 0) / (nums.length - 1) : NaN
    const std = Number.isFinite(variance) ? Math.sqrt(variance) : null
    const skew = nums.length >= 3 && std && std > 0
      ? (nums.length / ((nums.length - 1) * (nums.length - 2))) * nums.reduce((s, x) => s + ((x - avg) / std) ** 3, 0)
      : null
    Object.assign(result, { mean: avg, median: quantile(nums, .5), std, min: nums[0], max: nums.at(-1), q1, q3, p5: quantile(nums, .05), p95: quantile(nums, .95), skew, outliers: iqr === 0 ? 0 : nums.filter(x => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr).length })
  }
  return result
}

function pearson(rows: Row[], a: string, b: string) {
  const pairs = rows.map(r => [Number(r[a]), Number(r[b])]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
  if (pairs.length < 3) return { value: null, n: pairs.length }
  const ax = mean(pairs.map(p => p[0])), bx = mean(pairs.map(p => p[1]))
  let num = 0, da = 0, db = 0
  for (const [x, y] of pairs) { num += (x - ax) * (y - bx); da += (x - ax) ** 2; db += (y - bx) ** 2 }
  return { value: da && db ? num / Math.sqrt(da * db) : null, n: pairs.length }
}

export function analyze(dataset: Dataset, target: string, scope: ScopeMode, filter?: { column: string; value: string }): Analysis {
  const scopedRows = sampleRows(dataset.rows, scope)
  const filteredRows = filter?.column && filter.value !== '' ? scopedRows.filter(r => r[filter.column] === filter.value) : scopedRows
  const profiles = dataset.columns.map(c => profileColumn(filteredRows, c))
  const duplicateRows = filteredRows.length - new Set(filteredRows.map(r => dataset.columns.map(c => `${typeof r[c]}:${r[c]}`).join('\u001f'))).size
  const missingCells = profiles.reduce((s, p) => s + p.missing, 0)
  const numeric = profiles.filter(p => ['numeric', 'binary'].includes(p.kind) && p.name !== target)
  const correlations = numeric.map(p => ({ name: p.name, ...pearson(filteredRows, p.name, target) })).sort((a, b) => Math.abs(b.value || 0) - Math.abs(a.value || 0)).slice(0, 12)
  const targetProfile = profiles.find(p => p.name === target)
  const findings: Analysis['findings'] = []
  const constants = profiles.filter(p => p.kind === 'constant').length
  if (missingCells) findings.push({ severity: '주의', title: '결측값을 확인하세요', message: `${missingCells.toLocaleString()}개 셀이 비어 있습니다. 통계마다 유효한 행만 사용했습니다.` })
  if (duplicateRows) findings.push({ severity: '발견', title: '완전 중복 행이 있습니다', message: `${duplicateRows.toLocaleString()}개 행이 앞선 행과 모든 열에서 같습니다. 자동 삭제하지 않았습니다.` })
  if (constants) findings.push({ severity: '정보', title: '변화가 없는 열', message: `${constants}개 상수 열은 관계 분석에서 제외하는 편이 안전합니다.` })
  if (targetProfile?.outliers) findings.push({ severity: '발견', title: '대상 열의 이상치 후보', message: `1.5×IQR 기준으로 ${targetProfile.outliers.toLocaleString()}개 후보가 있습니다. 오류가 아니라 확인 대상입니다.` })
  const top = correlations[0]
  if (top?.value != null) findings.push({ severity: '발견', title: '가장 큰 선형 연관', message: `${top.name}와 ${target}의 Pearson r은 ${top.value.toFixed(3)}입니다 (유효 n=${top.n.toLocaleString()}). 인과관계를 뜻하지 않습니다.` })
  if (filteredRows.length < 30) findings.push({ severity: '주의', title: '표본 수가 작습니다', message: `현재 조건의 표본은 ${filteredRows.length}행입니다. 차이는 탐색 단서로만 해석하세요.` })
  return { dataset, scopedRows, filteredRows, profiles, target, targetProfile, duplicateRows, missingCells, correlations, findings }
}

export function recommendTarget(ds: Dataset) {
  return ['quality', 'y', 'kMc', 'kMt', 'target'].find(c => ds.columns.includes(c)) || ds.columns.find(c => profileColumn(ds.rows.slice(0, 500), c).kind === 'numeric') || ds.columns[0]
}

export function histogram(rows: Row[], column: string) {
  const v = rows.map(r => Number(r[column])).filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return { labels: [], values: [] }
  const q1 = quantile(v, .25), q3 = quantile(v, .75), width = 2 * (q3 - q1) / Math.cbrt(v.length)
  const bins = Math.max(10, Math.min(50, width > 0 ? Math.ceil((v.at(-1)! - v[0]) / width) : Math.ceil(Math.log2(v.length) + 1)))
  const step = (v.at(-1)! - v[0]) / bins || 1
  const values = Array(bins).fill(0)
  v.forEach(x => values[Math.min(bins - 1, Math.floor((x - v[0]) / step))]++)
  return { labels: values.map((_, i) => `${(v[0] + i * step).toFixed(1)}`), values }
}

export function categories(rows: Row[], column: string) {
  const counts = new Map<string, number>()
  rows.forEach(r => { const v = r[column] || '(결측)'; counts.set(v, (counts.get(v) || 0) + 1) })
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 20)
}
