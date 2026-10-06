import { useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { BarChart3, ChevronDown, CircleAlert, Database, Download, FileBarChart, FileText, Filter, FlaskConical, History, Info, LayoutDashboard, LoaderCircle, Menu, Plus, Search, Sparkles, Table2, Trash2, UploadCloud, X } from 'lucide-react'
import { Analysis, categories, Dataset, histogram, parseText, recommendTarget, ScopeMode, analyze } from './lib/eda'

type Stage = 'start' | 'confirm' | 'dashboard'
type Tab = '개요' | '품질' | '분포' | '관계' | '그룹 비교' | '데이터 미리보기'

const samples = [
  { id: 'benz', title: '벤츠 제조', file: '/samples/mercedes-train.csv', meta: '4,209행 · 378열', detail: '검사 시간과 익명 옵션', target: 'y', color: 'mint' },
  { id: 'naval', title: '해군 추진계통', file: '/samples/naval-cbm.csv', meta: '11,934행 · 18열', detail: '선속별 열화 계수 비교', target: 'kMc', color: 'blue' },
  { id: 'wine', title: '와인 품질', file: '/samples/wine-quality-combined.csv', meta: '6,497행 · 13열', detail: '성분과 품질 점수', target: 'quality', color: 'plum' },
]

const fmt = (v?: number | null, digits = 2) => v == null || !Number.isFinite(v) ? '—' : Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits }).format(v)
const bytes = (n: number) => n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1e3).toFixed(0)} KB`

function App() {
  const [stage, setStage] = useState<Stage>('start')
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [target, setTarget] = useState('')
  const [scope, setScope] = useState<ScopeMode>('all')
  const [tab, setTab] = useState<Tab>('개요')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [groupColumn, setGroupColumn] = useState('')
  const [groupValue, setGroupValue] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const analysis = useMemo<Analysis | null>(() => dataset && target ? analyze(dataset, target, scope, groupColumn && groupValue ? { column: groupColumn, value: groupValue } : undefined) : null, [dataset, target, scope, groupColumn, groupValue])
  const groupValues = useMemo(() => dataset && groupColumn ? categories(dataset.rows, groupColumn).map(x => x[0]) : [], [dataset, groupColumn])

  const readFile = async (file: File) => {
    setError('')
    if (!/\.(csv|tsv)$/i.test(file.name)) return setError('CSV 또는 TSV 파일만 업로드할 수 있습니다.')
    if (file.size > 3_500_000) return setError('파일 크기는 3.5MB 이하여야 합니다.')
    setLoading(true)
    try { const text = await file.text(); const ds = parseText(text, file.name, file.size, file.name.endsWith('.tsv') ? '\t' : undefined); acceptDataset(ds) }
    catch (e) { setError(e instanceof Error ? e.message : '파일을 읽지 못했습니다.') }
    finally { setLoading(false) }
  }

  const loadSample = async (sample: typeof samples[number]) => {
    setLoading(true); setError('')
    try { const res = await fetch(sample.file); if (!res.ok) throw new Error('샘플을 불러오지 못했습니다.'); const text = await res.text(); const ds = parseText(text, `${sample.title}.csv`, new Blob([text]).size, ','); acceptDataset(ds, sample.target) }
    catch (e) { setError(e instanceof Error ? e.message : '샘플을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }

  const acceptDataset = (ds: Dataset, preferred?: string) => {
    if (ds.rows.length > 20_000 || ds.columns.length > 500 || ds.rows.length * ds.columns.length > 2_000_000) throw new Error('20,000행·500열·2,000,000셀 한도를 확인해 주세요.')
    setDataset(ds); setTarget(preferred && ds.columns.includes(preferred) ? preferred : recommendTarget(ds)); setGroupColumn(''); setGroupValue(''); setStage('confirm')
  }

  const reset = () => { setStage('start'); setDataset(null); setTarget(''); setError(''); setTab('개요') }
  const download = (format: 'json' | 'csv' | 'md') => {
    if (!analysis) return
    let body = '', type = 'text/plain'
    if (format === 'json') { body = JSON.stringify({ population: { sourceRows: dataset?.rows.length, scopeRows: analysis.scopedRows.length, filteredRows: analysis.filteredRows.length }, overview: analysis.profiles, correlations: analysis.correlations, findings: analysis.findings }, null, 2); type = 'application/json' }
    if (format === 'csv') { body = ['column,type,valid,missing,unique,mean,median,std,min,max', ...analysis.profiles.map(p => [p.name, p.kind, p.valid, p.missing, p.unique, p.mean ?? '', p.median ?? '', p.std ?? '', p.min ?? '', p.max ?? ''].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n'); type = 'text/csv' }
    if (format === 'md') body = `# ${dataset?.name} 분석 보고서\n\n- 원본: ${dataset?.rows.length.toLocaleString()}행 × ${dataset?.columns.length}열\n- 현재 범위: ${analysis.filteredRows.length.toLocaleString()}행\n- 대상 열: ${target}\n\n## 자동 발견\n\n${analysis.findings.map(f => `- **${f.title}** — ${f.message}`).join('\n')}\n`
    const url = URL.createObjectURL(new Blob([body], { type: `${type};charset=utf-8` })); const a = document.createElement('a'); a.href = url; a.download = `csv-insight-report.${format}`; a.click(); URL.revokeObjectURL(url)
  }

  return <div className="app-shell">
    <Sidebar open={sidebar} close={() => setSidebar(false)} active={stage === 'dashboard' ? 'analysis' : 'new'} reset={reset} />
    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" aria-label="메뉴 열기" onClick={() => setSidebar(true)}><Menu size={20} /></button>
        <div className="crumb"><span>CSV Insight</span><b>/</b><strong>{stage === 'start' ? '새 분석' : dataset?.name}</strong></div>
        {stage === 'dashboard' && <div className="top-actions"><span className="saved"><span />브라우저에 임시 저장됨</span><div className="dropdown"><button className="secondary"><Download size={16} /> 내보내기 <ChevronDown size={14} /></button><div className="dropdown-menu"><button onClick={() => download('json')}>JSON 결과</button><button onClick={() => download('csv')}>CSV 통계</button><button onClick={() => download('md')}>Markdown 보고서</button></div></div></div>}
      </header>
      {stage === 'start' && <StartScreen loading={loading} error={error} drag={drag} setDrag={setDrag} inputRef={inputRef} readFile={readFile} loadSample={loadSample} />}
      {stage === 'confirm' && dataset && <ConfirmScreen dataset={dataset} target={target} setTarget={setTarget} back={reset} run={() => setStage('dashboard')} />}
      {stage === 'dashboard' && analysis && <Dashboard analysis={analysis} tab={tab} setTab={setTab} target={target} setTarget={setTarget} scope={scope} setScope={setScope} groupColumn={groupColumn} setGroupColumn={(v: string) => { setGroupColumn(v); setGroupValue('') }} groupValue={groupValue} setGroupValue={setGroupValue} groupValues={groupValues} />}
    </main>
  </div>
}

function Sidebar({ open, close, active, reset }: { open: boolean; close: () => void; active: string; reset: () => void }) {
  return <><aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="brand"><div className="brand-mark"><BarChart3 size={21} /></div><div><strong>CSV Insight</strong><span>Auto EDA Workspace</span></div><button className="icon-btn sidebar-close" onClick={close}><X size={18}/></button></div>
    <nav aria-label="주요 메뉴">
      <button className={active === 'new' ? 'active' : ''} onClick={reset}><Plus size={18}/> 새 분석</button>
      <button className={active === 'analysis' ? 'active' : ''}><LayoutDashboard size={18}/> 분석 대시보드</button>
      <button><History size={18}/> 분석 이력 <span className="badge">0</span></button>
    </nav>
    <div className="sidebar-note"><Database size={17}/><div><strong>7일 보관 안내</strong><p>이 버전은 브라우저 세션 동안만 결과를 유지합니다.</p></div></div>
    <div className="side-footer"><div className="avatar">J</div><div><strong>익명 세션</strong><span>개인 워크스페이스</span></div></div>
  </aside>{open && <button className="scrim" aria-label="메뉴 닫기" onClick={close}/>}</>
}

function StartScreen({ loading, error, drag, setDrag, inputRef, readFile, loadSample }: any) {
  return <div className="start page-wrap">
    <div className="eyebrow"><Sparkles size={14}/> 코드 없이 시작하는 탐색적 분석</div>
    <h1>데이터를 올리면,<br/><em>볼 지점을 먼저 찾습니다.</em></h1>
    <p className="lead">구조, 품질, 분포, 변수 간 관계를 한 번에 계산하고<br className="desktop-only"/> 근거가 연결된 한국어 요약으로 정리합니다.</p>
    <section className={`dropzone ${drag ? 'drag' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}>
      <input ref={inputRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" hidden onChange={e => e.target.files?.[0] && readFile(e.target.files[0])}/>
      <div className="upload-icon">{loading ? <LoaderCircle className="spin" size={27}/> : <UploadCloud size={27}/>}</div>
      <h2>{loading ? '데이터를 읽고 있습니다' : 'CSV 또는 TSV를 여기에 놓으세요'}</h2>
      <p>또는 파일을 직접 선택할 수 있습니다</p>
      <button className="primary" onClick={() => inputRef.current?.click()} disabled={loading}>파일 선택</button>
      <div className="limits"><span>최대 3.5MB</span><i/> <span>20,000행</span><i/> <span>500열</span><i/> <span>UTF-8 · EUC-KR</span></div>
    </section>
    {error && <div className="error"><CircleAlert size={17}/>{error}</div>}
    <div className="section-heading"><div><span>직접 살펴보기</span><h2>검증된 샘플 데이터</h2></div><p>실제 데이터셋으로 분석 흐름을 바로 확인해 보세요.</p></div>
    <div className="sample-grid">{samples.map((s, i) => <button key={s.id} className={`sample-card ${s.color}`} onClick={() => loadSample(s)} disabled={loading}>
      <div className="sample-top"><div className="dataset-icon"><FileBarChart size={21}/></div><span>0{i + 1}</span></div><h3>{s.title}</h3><p>{s.detail}</p><div className="sample-meta"><span>{s.meta}</span><strong>불러오기</strong></div>
    </button>)}</div>
    <div className="privacy"><Info size={16}/><span><strong>데이터 처리 안내</strong> 업로드 파일은 이 프로토타입에서 브라우저 안에서만 계산됩니다. 운영 버전은 서버 분석·7일 보관 정책을 적용하도록 설계되어 있습니다.</span></div>
  </div>
}

function ConfirmScreen({ dataset, target, setTarget, back, run }: { dataset: Dataset; target: string; setTarget: (v: string) => void; back: () => void; run: () => void }) {
  const profiles = dataset.columns.slice(0, 12).map(c => ({ name: c, kind: dataset.rows.slice(0, 100).every(r => r[c] === '' || Number.isFinite(Number(r[c]))) ? '숫자' : '범주' }))
  return <div className="page-wrap confirm-page"><div className="page-kicker">2단계 중 1단계</div><h1>형식을 확인해 주세요</h1><p className="page-sub">분석 전에 감지한 구분자와 열 구조입니다. 대상 열은 언제든 바꿀 수 있습니다.</p>
    <div className="confirm-grid"><section className="panel settings-panel"><h2>파일 설정</h2><label>파일명<input value={dataset.name} readOnly/></label><div className="field-row"><label>구분자<select value={dataset.delimiter}><option value=",">쉼표 (,)</option><option value=";">세미콜론 (;)</option><option value="\t">탭</option></select></label><label>인코딩<select><option>UTF-8</option><option>EUC-KR</option></select></label></div><label>추천 대상 열<select value={target} onChange={e => setTarget(e.target.value)}>{dataset.columns.map(c => <option key={c}>{c}</option>)}</select></label><div className="detected"><Sparkles size={16}/><span><strong>{dataset.rows.length.toLocaleString()}행 × {dataset.columns.length}열</strong>을 감지했습니다.</span></div></section>
      <section className="panel preview-panel"><div className="panel-title"><div><h2>처음 20행</h2><span>{bytes(dataset.bytes)} · 빈 행 {dataset.emptyLines}개 제외</span></div><div className="type-legend"><span><i className="dot num"/>숫자</span><span><i className="dot cat"/>범주</span></div></div><div className="table-scroll"><table><thead><tr>{profiles.map(p => <th key={p.name}>{p.name}<small>{p.kind}</small></th>)}</tr></thead><tbody>{dataset.rows.slice(0, 20).map((r, i) => <tr key={i}>{profiles.map(p => <td key={p.name}>{r[p.name] || <span className="muted">결측</span>}</td>)}</tr>)}</tbody></table></div></section></div>
    <div className="confirm-actions"><button className="secondary" onClick={back}>다른 파일 선택</button><button className="primary wide" onClick={run}><FlaskConical size={17}/> 자동 분석 시작</button></div>
  </div>
}

function Dashboard({ analysis, tab, setTab, target, setTarget, scope, setScope, groupColumn, setGroupColumn, groupValue, setGroupValue, groupValues }: any) {
  const { dataset, profiles, targetProfile, filteredRows } = analysis as Analysis
  const numeric = profiles.filter((p: any) => ['numeric', 'binary'].includes(p.kind))
  const groups = profiles.filter((p: any) => p.unique <= 20 && p.unique > 1)
  const dist = targetProfile && ['numeric', 'binary'].includes(targetProfile.kind) ? histogram(filteredRows, target) : null
  const cats = categories(filteredRows, target)
  const tabs: Tab[] = ['개요', '품질', '분포', '관계', '그룹 비교', '데이터 미리보기']
  const chartBase = { textStyle: { fontFamily: 'Inter, Pretendard, sans-serif' }, grid: { top: 18, right: 18, bottom: 42, left: 52 }, tooltip: { trigger: 'axis' }, xAxis: { axisLine: { lineStyle: { color: '#cad2da' } }, axisLabel: { color: '#697586' } }, yAxis: { axisLine: { show: false }, splitLine: { lineStyle: { color: '#edf1f4' } }, axisLabel: { color: '#697586' } } }
  return <div className="dashboard">
    <div className="dashboard-head"><div><div className="page-kicker">분석 완료 · engine 1.0</div><h1>{dataset.name}</h1><p>{dataset.rows.length.toLocaleString()}행 × {dataset.columns.length}열 · 현재 {filteredRows.length.toLocaleString()}행 분석 중</p></div><div className="head-controls"><label>분석 범위<select value={scope} onChange={e => setScope(e.target.value)}><option value="all">전체 데이터</option><option value="first100">첫 100행</option><option value="random100">무작위 100행 · seed 42</option></select></label><label>대상 열<select value={target} onChange={e => setTarget(e.target.value)}>{numeric.map((p: any) => <option key={p.name}>{p.name}</option>)}</select></label></div></div>
    <div className="tabs" role="tablist">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    <div className="dashboard-body">
      {(tab === '개요' || tab === '품질') && <>
        <div className="metric-grid"><Metric label="분석 행" value={filteredRows.length.toLocaleString()} note={`원본 ${dataset.rows.length.toLocaleString()}행`} tone="dark"/><Metric label="열" value={dataset.columns.length.toLocaleString()} note={`숫자 ${numeric.length} · 범주 ${profiles.filter((p: any) => p.kind === 'categorical').length}`}/><Metric label="결측 셀" value={analysis.missingCells.toLocaleString()} note={`${fmt(analysis.missingCells / Math.max(1, filteredRows.length * dataset.columns.length) * 100, 1)}%`}/><Metric label="완전 중복" value={analysis.duplicateRows.toLocaleString()} note="자동 삭제하지 않음"/></div>
        <section className="insights"><div className="insight-heading"><div className="spark"><Sparkles size={19}/></div><div><span>AUTO FINDINGS</span><h2>먼저 확인할 점</h2></div><p>현재 범위의 실제 계산값에 근거합니다</p></div><div className="finding-list">{analysis.findings.slice(0, 5).map((f: any, i: number) => <article key={i}><span className={`severity ${f.severity}`}>{f.severity}</span><div><h3>{f.title}</h3><p>{f.message}</p></div><b>0{i + 1}</b></article>)}</div></section>
      </>}
      {(tab === '개요' || tab === '분포') && <div className="chart-grid"><ChartPanel title={`${target} 분포`} meta={`유효 n=${targetProfile?.valid.toLocaleString()} · 결측 ${targetProfile?.missing.toLocaleString()}`} option={{ ...chartBase, xAxis: { ...chartBase.xAxis, type: 'category', data: dist ? dist.labels : cats.map(x => x[0]) }, yAxis: { ...chartBase.yAxis, type: 'value' }, series: [{ type: 'bar', data: dist ? dist.values : cats.map(x => x[1]), itemStyle: { color: '#2b7d6b', borderRadius: [5, 5, 0, 0] }, barMaxWidth: 38 }] }}/><StatsPanel p={targetProfile}/></div>}
      {(tab === '개요' || tab === '관계') && <div className="chart-grid relation-grid"><ChartPanel title={`${target}와 숫자 열의 상관`} meta="Pearson · pairwise 유효값" option={{ ...chartBase, grid: { top: 10, right: 24, bottom: 36, left: 100 }, xAxis: { ...chartBase.xAxis, type: 'value', min: -1, max: 1 }, yAxis: { type: 'category', data: analysis.correlations.slice(0, 8).map((x: any) => x.name).reverse(), axisLabel: { color: '#3b4654' } }, series: [{ type: 'bar', data: analysis.correlations.slice(0, 8).map((x: any) => x.value).reverse(), itemStyle: { color: (p: any) => p.value >= 0 ? '#286fcb' : '#b05f77', borderRadius: 4 }, barMaxWidth: 18 }] }}/><section className="panel relation-table"><div className="panel-title"><div><h2>연관성 순위</h2><span>상관은 인과관계를 의미하지 않습니다</span></div></div>{analysis.correlations.slice(0, 7).map((x: any, i: number) => <div className="corr-row" key={x.name}><span>{i + 1}</span><strong>{x.name}</strong><div className="corr-track"><i style={{ width: `${Math.abs(x.value || 0) * 100}%` }}/></div><b>{x.value == null ? '—' : x.value.toFixed(3)}</b><small>n={x.n.toLocaleString()}</small></div>)}</section></div>}
      {tab === '품질' && <QualityTable profiles={profiles}/>}
      {tab === '그룹 비교' && <section className="panel group-panel"><div className="panel-title"><div><h2>조건 비교</h2><span>범위 선택 후 필터를 적용합니다</span></div></div><div className="filter-row"><Filter size={17}/><label>그룹 열<select value={groupColumn} onChange={e => setGroupColumn(e.target.value)}><option value="">선택 안 함</option>{groups.map((p: any) => <option key={p.name}>{p.name}</option>)}</select></label><label>값<select value={groupValue} onChange={e => setGroupValue(e.target.value)} disabled={!groupColumn}><option value="">전체 값</option>{groupValues.map((v: string) => <option key={v}>{v}</option>)}</select></label><div className="filter-result"><strong>{filteredRows.length.toLocaleString()}행</strong><span>현재 조건 표본</span></div></div>{filteredRows.length === 0 ? <div className="empty-state"><Search size={27}/><h3>조건에 맞는 행이 없습니다</h3><p>다른 값을 선택하면 통계를 다시 계산합니다.</p></div> : <div className="group-summary"><Metric label={`${target} 평균`} value={fmt(targetProfile?.mean)} note={`중앙값 ${fmt(targetProfile?.median)}`}/><Metric label="유효 표본" value={fmt(targetProfile?.valid, 0)} note={`결측 ${targetProfile?.missing || 0}`}/><Metric label="표준편차" value={fmt(targetProfile?.std)} note="표본 표준편차 · ddof=1"/></div>}</section>}
      {tab === '데이터 미리보기' && <DataTable dataset={dataset} rows={filteredRows.slice(0, 100)}/>}
    </div>
  </div>
}

function Metric({ label, value, note, tone }: any) { return <section className={`metric ${tone || ''}`}><span>{label}</span><strong>{value}</strong><p>{note}</p></section> }
function ChartPanel({ title, meta, option }: any) { const ref = useRef<ReactECharts>(null); const save = () => { const url = ref.current?.getEchartsInstance().getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); if (url) { const a = document.createElement('a'); a.href = url; a.download = `${title}.png`; a.click() } }; return <section className="panel chart-panel"><div className="panel-title"><div><h2>{title}</h2><span>{meta}</span></div><button className="icon-btn" onClick={save} title="PNG 저장"><Download size={16}/></button></div><ReactECharts ref={ref} option={option} style={{ height: 300 }}/></section> }
function StatsPanel({ p }: any) { const stats = [['평균', p?.mean], ['중앙값', p?.median], ['표준편차', p?.std], ['최솟값', p?.min], ['Q1', p?.q1], ['Q3', p?.q3], ['최댓값', p?.max], ['왜도', p?.skew]]; return <section className="panel stats-panel"><div className="panel-title"><div><h2>기술통계</h2><span>Type 7 분위수 · 반올림 표시</span></div></div><div className="stats-grid">{stats.map(([k, v]) => <div key={String(k)}><span>{k}</span><strong>{fmt(v as number)}</strong></div>)}</div>{p?.outliers > 0 && <div className="stat-callout"><CircleAlert size={16}/><span>IQR 기준 이상치 후보 <strong>{p.outliers.toLocaleString()}개</strong></span></div>}</section> }
function QualityTable({ profiles }: any) { return <section className="panel quality-table"><div className="panel-title"><div><h2>열 품질 진단</h2><span>상수·결측·고유값을 함께 확인하세요</span></div></div><div className="table-scroll"><table><thead><tr><th>열</th><th>분석 역할</th><th>유효</th><th>결측</th><th>고유값</th><th>상태</th></tr></thead><tbody>{profiles.map((p: any) => <tr key={p.name}><td><strong>{p.name}</strong></td><td><span className="type-pill">{p.kind}</span></td><td>{p.valid.toLocaleString()}</td><td>{p.missing.toLocaleString()}</td><td>{p.unique.toLocaleString()}</td><td>{p.kind === 'constant' || p.kind === 'empty' ? <span className="status-warn">확인 필요</span> : <span className="status-ok">사용 가능</span>}</td></tr>)}</tbody></table></div></section> }
function DataTable({ dataset, rows }: any) { return <section className="panel preview-panel data-panel"><div className="panel-title"><div><h2>데이터 미리보기</h2><span>현재 범위의 첫 {rows.length}행 · 원본 문자열</span></div><Table2 size={18}/></div><div className="table-scroll"><table><thead><tr>{dataset.columns.map((c: string) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r: any, i: number) => <tr key={i}>{dataset.columns.map((c: string) => <td key={c}>{r[c] || <span className="muted">결측</span>}</td>)}</tr>)}</tbody></table></div></section> }

export default App
