import type { Dataset, ScopeMode } from './eda'

const DB_NAME = 'csv-insight-browser-store'
const DB_VERSION = 1
const STORE_NAME = 'analyses'
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ANALYSES = 5

export interface StoredAnalysis {
  id: string
  createdAt: number
  updatedAt: number
  expiresAt: number
  dataset: Dataset
  target: string
  scope: ScopeMode
  groupColumn: string
  groupValue: string
}

export type StoredAnalysisInput = Omit<StoredAnalysis, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('브라우저 저장소 요청에 실패했습니다.'))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('브라우저 저장소 처리에 실패했습니다.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('브라우저 저장소 처리가 중단됐습니다.'))
  })
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('이 브라우저는 임시 저장을 지원하지 않습니다.'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
        store.createIndex('expiresAt', 'expiresAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('브라우저 저장소를 열지 못했습니다.'))
  })
}

export function selectRetained(records: StoredAnalysis[], now = Date.now()) {
  return records
    .filter(record => record.expiresAt > now)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ANALYSES)
}

async function reconcile(db: IDBDatabase) {
  const readTx = db.transaction(STORE_NAME, 'readonly')
  const records = await requestResult(readTx.objectStore(STORE_NAME).getAll() as IDBRequest<StoredAnalysis[]>)
  const retained = selectRetained(records)
  const retainedIds = new Set(retained.map(record => record.id))
  const stale = records.filter(record => !retainedIds.has(record.id))
  if (stale.length) {
    const writeTx = db.transaction(STORE_NAME, 'readwrite')
    stale.forEach(record => writeTx.objectStore(STORE_NAME).delete(record.id))
    await transactionDone(writeTx)
  }
  return retained
}

export async function listStoredAnalyses() {
  const db = await openDatabase()
  try { return await reconcile(db) } finally { db.close() }
}

export async function createStoredAnalysis(input: StoredAnalysisInput) {
  const now = Date.now()
  const record: StoredAnalysis = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    expiresAt: now + RETENTION_MS,
  }
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    await transactionDone(tx)
    await reconcile(db)
    return record
  } finally { db.close() }
}

export async function updateStoredAnalysis(id: string, updates: Partial<Pick<StoredAnalysis, 'target' | 'scope' | 'groupColumn' | 'groupValue'>>) {
  const db = await openDatabase()
  try {
    const readTx = db.transaction(STORE_NAME, 'readonly')
    const existing = await requestResult(readTx.objectStore(STORE_NAME).get(id) as IDBRequest<StoredAnalysis | undefined>)
    if (!existing) return
    const now = Date.now()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ ...existing, ...updates, updatedAt: now, expiresAt: now + RETENTION_MS })
    await transactionDone(tx)
  } finally { db.close() }
}

export async function deleteStoredAnalysis(id: string) {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    await transactionDone(tx)
  } finally { db.close() }
}
