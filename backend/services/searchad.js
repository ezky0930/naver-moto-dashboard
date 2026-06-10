// 네이버 검색광고 API — 키워드 월간 절대 검색수 (PC + 모바일)
// 엔드포인트: GET https://api.searchad.naver.com/keywordstool
// 인증: HMAC-SHA256(timestamp.method.uri, base64decode(secretKey)) → Base64

import crypto from 'node:crypto'
import axios from 'axios'
import { getCache, setCache } from '../db/database.js'

const BASE_URL = 'https://api.searchad.naver.com'
const CACHE_TTL = 3600 * 6 // 6시간 (광고 API는 일일 한도 엄격)

export function isAdConfigured() {
  return !!(process.env.NAVER_AD_API_KEY && process.env.NAVER_AD_SECRET_KEY && process.env.NAVER_AD_CUSTOMER_ID)
}

function makeSignature(timestamp, method, uri) {
  const message = `${timestamp}.${method}.${uri}`
  // Naver 광고 API: 시크릿 키를 UTF-8 바이트 그대로 사용 (base64 디코드 X)
  const secretKey = Buffer.from(process.env.NAVER_AD_SECRET_KEY, 'utf-8')
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

function createAdClient() {
  const instance = axios.create({ baseURL: BASE_URL })
  instance.interceptors.request.use((config) => {
    const timestamp = Date.now().toString()
    const uri = config.url.split('?')[0]
    config.headers['X-Timestamp'] = timestamp
    config.headers['X-API-KEY'] = process.env.NAVER_AD_API_KEY
    config.headers['X-Customer'] = process.env.NAVER_AD_CUSTOMER_ID
    config.headers['X-Signature'] = makeSignature(timestamp, config.method.toUpperCase(), uri)
    return config
  })
  return instance
}

// "< 10" 문자열 처리 — 5로 근사
function parseQcCnt(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.includes('<')) return 5
  return Number(v) || 0
}

// 씨앗 키워드 → API가 반환하는 연관 키워드 전체 (필터 없음)
// 반환: { keyword, pc, mobile, total, compIdx }[] 검색수 내림차순
export async function discoverRelatedKeywords(seedKeywords = ['오토바이', '바이크', '헬멧', '모터사이클', '라이딩']) {
  if (!isAdConfigured()) return []
  const cacheKey = `ad:discover:${seedKeywords.slice().sort().join(',')}`
  const cached = getCache(cacheKey, CACHE_TTL)
  if (cached) return cached

  const client = createAdClient()
  const seen = new Map() // keyword → { pc, mobile, total, compIdx }

  const CHUNK = 5
  for (let i = 0; i < seedKeywords.length; i += CHUNK) {
    const chunk = seedKeywords.slice(i, i + CHUNK)
    try {
      const { data } = await client.get('/keywordstool', {
        params: { hintKeywords: chunk.join(','), showDetail: 1 },
      })
      for (const item of data.keywordList ?? []) {
        const kw = item.relKeyword
        if (!kw || seen.has(kw)) continue
        const pc = parseQcCnt(item.monthlyPcQcCnt)
        const mobile = parseQcCnt(item.monthlyMobileQcCnt)
        seen.set(kw, { keyword: kw, pc, mobile, total: pc + mobile, compIdx: item.compIdx ?? null })
      }
    } catch (err) {
      console.error('[searchad/discover] 오류:', chunk, err.response?.data ?? err.message)
    }
  }

  const result = [...seen.values()].sort((a, b) => b.total - a.total)
  if (result.length > 0) setCache(cacheKey, result)
  return result
}

// keywords: string[] (최대 100개, 한 번에 5개씩 요청)
// 반환: Map<keyword, { pc: number, mobile: number, total: number }>
export async function getMonthlySearchCounts(keywords) {
  if (!isAdConfigured()) return new Map()

  const cacheKey = `ad:monthly:${keywords.slice().sort().join(',')}`
  const cached = getCache(cacheKey, CACHE_TTL)
  if (cached) return new Map(Object.entries(cached))

  const client = createAdClient()
  const result = new Map()

  // 광고 API는 hintKeywords 파라미터를 5개씩 처리
  const CHUNK = 5
  for (let i = 0; i < keywords.length; i += CHUNK) {
    const chunk = keywords.slice(i, i + CHUNK)
    try {
      const { data } = await client.get('/keywordstool', {
        params: { hintKeywords: chunk.join(','), showDetail: 1 },
      })
      for (const item of data.keywordList ?? []) {
        const kw = item.relKeyword
        if (!kw) continue
        const pc = parseQcCnt(item.monthlyPcQcCnt)
        const mobile = parseQcCnt(item.monthlyMobileQcCnt)
        // 정확히 요청한 키워드만 포함 (API가 연관어도 돌려줌)
        if (chunk.includes(kw)) {
          result.set(kw, { pc, mobile, total: pc + mobile, compIdx: item.compIdx ?? null })
        }
      }
    } catch (err) {
      console.error('[searchad] 청크 오류:', chunk, err.response?.data ?? err.message)
    }
  }

  // 빈 결과는 캐시하지 않음 (API 오류로 인한 빈 결과가 굳어지는 것 방지)
  if (result.size > 0) setCache(cacheKey, Object.fromEntries(result))
  return result
}
