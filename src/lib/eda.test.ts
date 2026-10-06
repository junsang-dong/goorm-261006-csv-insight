import { describe, expect, it } from 'vitest'
import { analyze, parseText, profileColumn } from './eda'

describe('EDA engine', () => {
  it('detects semicolon data and keeps zero as a valid value', () => {
    const ds = parseText('x;y\n0;1\n2;3\n', 'tiny.csv')
    expect(ds.delimiter).toBe(';')
    expect(profileColumn(ds.rows, 'x').valid).toBe(2)
  })

  it('uses type 7 quartiles and sample standard deviation', () => {
    const ds = parseText('x,y\n1,2\n2,4\n3,6\n4,8\n', 'tiny.csv')
    const p = analyze(ds, 'y', 'all').targetProfile!
    expect(p.q1).toBe(3.5)
    expect(p.q3).toBe(6.5)
    expect(p.std).toBeCloseTo(2.581988897)
  })

  it('counts complete duplicate rows without deleting them', () => {
    const ds = parseText('x,y\n1,2\n1,2\n2,3\n', 'tiny.csv')
    expect(analyze(ds, 'y', 'all').duplicateRows).toBe(1)
  })
})
