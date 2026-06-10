import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Vercel 서버리스: /tmp만 쓰기 가능. 로컬은 backend/db/cache.db 사용
const dbPath = process.env.VERCEL ? '/tmp/cache.db' : path.join(__dirname, 'cache.db')
const db = new Database(dbPath)

export function initDb() {
  db.exec(`
    -- API 응답 캐시 (키워드/엔드포인트 단위, TTL 기반)
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key  TEXT PRIMARY KEY,
      payload    TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    -- 수집 이력 (트렌드/쇼핑 스냅샷 저장용, 이후 단계에서 사용)
    CREATE TABLE IF NOT EXISTS snapshots (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      source     TEXT NOT NULL,        -- 'datalab' | 'shopping' | 'crawl'
      keyword    TEXT,
      payload    TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)
}

// TTL(초) 내의 캐시가 있으면 반환, 없으면 null
export function getCache(key, ttlSeconds) {
  const row = db
    .prepare('SELECT payload, created_at FROM api_cache WHERE cache_key = ?')
    .get(key)
  if (!row) return null
  if (Date.now() / 1000 - row.created_at > ttlSeconds) return null
  return JSON.parse(row.payload)
}

export function setCache(key, payload) {
  db.prepare(
    `INSERT INTO api_cache (cache_key, payload, created_at)
     VALUES (?, ?, unixepoch())
     ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at`,
  ).run(key, JSON.stringify(payload))
}

// ── 스냅샷 (날짜별 수집 이력) ──────────────────────────────────────

export function saveSnapshot(source, keyword, payload) {
  db.prepare(
    'INSERT INTO snapshots (source, keyword, payload, created_at) VALUES (?, ?, ?, unixepoch())',
  ).run(source, keyword, JSON.stringify(payload))
}

// 최근 N일간, 날짜별로 source당 마지막 스냅샷 1건씩 반환 (최신 날짜 우선)
export function getDailySnapshots(source, days = 7) {
  return db
    .prepare(
      `SELECT date(created_at, 'unixepoch', 'localtime') AS day,
              payload, MAX(created_at) AS at
       FROM snapshots
       WHERE source = ? AND created_at >= unixepoch() - ? * 86400
       GROUP BY day
       ORDER BY day DESC`,
    )
    .all(source, days)
    .map((r) => ({ date: r.day, data: JSON.parse(r.payload) }))
}

export default db
