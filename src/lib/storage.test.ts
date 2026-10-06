import { describe, expect, it } from 'vitest'
import { selectRetained, type StoredAnalysis } from './storage'

const record = (id: string, updatedAt: number, expiresAt = 10_000) => ({ id, updatedAt, expiresAt } as StoredAnalysis)

describe('browser history retention', () => {
  it('removes expired records, keeps the latest five, and sorts newest first', () => {
    const records = [
      record('old', 1, 99), record('a', 100), record('b', 200), record('c', 300),
      record('d', 400), record('e', 500), record('f', 600),
    ]
    expect(selectRetained(records, 100).map(item => item.id)).toEqual(['f', 'e', 'd', 'c', 'b'])
  })
})
