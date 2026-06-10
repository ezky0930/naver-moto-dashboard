// 네이버 DataLab API 연동
//  - 쇼핑인사이트: 카테고리 내 키워드 클릭 트렌드 (A. /api/trends)
//  - 검색어트렌드: 키워드별 상대 검색량      (C. /api/keywords/volume)

import { createNaverClient, isNaverConfigured, fmtDate, daysAgo } from './naverClient.js'
import { getCache, setCache } from '../db/database.js'
import { mockTrendSeries, mockKeywordVolumes } from './mock.js'
import { getMonthlySearchCounts, isAdConfigured } from './searchad.js'

const CACHE_TTL = 3600 // 1시간 캐싱 (API 한도 보호)
const SPORTS_LEISURE_CID = '50000007' // 네이버쇼핑 대분류: 스포츠/레저 (헬멧 상위 카테고리)

export const DEFAULT_KEYWORDS = [
  '오토바이헬멧', '바이크헬멧', '풀페이스헬멧', '오픈페이스헬멧',
  '모터사이클헬멧', '헬멧추천', 'JPX헬멧', '아라이헬멧', '쇼에이헬멧',
]

// 전체 오토바이 관련 키워드 — DataLab 기반 광범위 조회용
export const MOTO_BROAD_KEYWORDS = [
  // 헬멧
  '오토바이헬멧', '바이크헬멧', '풀페이스헬멧', '오픈페이스헬멧', '모터사이클헬멧',
  '아라이헬멧', '쇼에이헬멧', 'JPX헬멧', 'HJC헬멧', 'AGV헬멧',
  '클래식헬멧', '반모헬멧', '오토바이반모', '어린이오토바이헬멧', '바이크풀페이스',
  // 장갑·보호대
  '오토바이장갑', '바이크장갑', '라이딩장갑', '오토바이무릎보호대', '오토바이척추보호대',
  // 자켓·의류
  '오토바이자켓', '바이크자켓', '라이딩자켓', '오토바이바지', '라이딩수트',
  '오토바이점퍼', '메시자켓', '오토바이조끼', '오토바이티셔츠',
  // 부츠·신발
  '오토바이부츠', '바이크부츠', '라이딩부츠', '오토바이슈즈',
  // 용품·악세서리
  '오토바이용품', '바이크용품', '오토바이블랙박스', '오토바이거치대', '오토바이가방',
  '오토바이탱크백', '바이크가방', '오토바이인터컴', '오토바이핸들바', '오토바이미러',
  // 부품·소모품
  '오토바이타이어', '오토바이배터리', '오토바이오일', '바이크체인', '오토바이브레이크',
  '오토바이엔진오일', '오토바이점화플러그', '오토바이미션오일',
  // 정비·관리
  '오토바이커버', '오토바이자물쇠', '오토바이잠금장치', '오토바이블루투스',
]

// ── A. 검색어(쇼핑 클릭) 트렌드: 모바일+PC ─────────────────────────────
// days=30(1개월)·90(3개월)은 일 단위, days=365 + timeUnit='month'는 월 단위 장기 추이
export async function getShoppingTrends({ keyword = '오토바이헬멧', days = 30, timeUnit = 'date', device = '' } = {}) {
  days = Math.min(Math.max(Number(days) || 30, 7), 730)
  if (!['date', 'week', 'month'].includes(timeUnit)) timeUnit = 'date'
  const startDate = fmtDate(daysAgo(days))
  const endDate = fmtDate(daysAgo(1)) // DataLab은 당일 데이터 미제공
  // 캐시 키에 모드를 포함 — API 키를 넣는 즉시 mock 캐시를 무시하고 실데이터로 전환
  const mode = isNaverConfigured() ? 'naver' : 'mock'
  const cacheKey = `${mode}:trends:${keyword}:${startDate}:${endDate}:${timeUnit}:${device || 'all'}`

  const cached = getCache(cacheKey, CACHE_TTL)
  if (cached) return { ...cached, cached: true }

  if (!isNaverConfigured()) {
    const result = {
      source: 'mock',
      note: 'NAVER API 키 미설정 — mock 데이터입니다. .env 설정 후 실데이터로 전환됩니다.',
      cached: false,
      keyword,
      timeUnit,
      period: { startDate, endDate },
      series: mockTrendSeries(keyword, days, timeUnit),
    }
    setCache(cacheKey, result)
    return result
  }

  try {
    const client = createNaverClient()
    const body = {
      startDate,
      endDate,
      timeUnit,
      category: SPORTS_LEISURE_CID,
      keyword: [{ name: keyword, param: [keyword] }],
    }
    if (device) body.device = device // 미지정 시 모바일+PC 전체
    const { data } = await client.post('/v1/datalab/shopping/category/keywords', body)

    let series = (data.results?.[0]?.data ?? []).map((d) => ({ date: d.period, value: d.ratio }))
    if (timeUnit === 'month') {
      // 진행 중인 달은 며칠치만 집계되어 급락처럼 보이므로 제외
      const thisMonth = fmtDate(new Date()).slice(0, 7)
      series = series.filter((p) => !p.date.startsWith(thisMonth))
    }
    const result = { source: 'naver', cached: false, keyword, timeUnit, period: { startDate, endDate }, series }
    setCache(cacheKey, result)
    return result
  } catch (err) {
    console.error('[datalab/trends] API 오류:', err.response?.data ?? err.message)
    return {
      source: 'mock',
      note: `NAVER API 호출 실패로 mock 데이터로 대체: ${err.response?.data?.errorMessage ?? err.message}`,
      cached: false,
      keyword,
      timeUnit,
      period: { startDate, endDate },
      series: mockTrendSeries(keyword, days, timeUnit),
    }
  }
}

// 기간 내 평균 ratio 계산 헬퍼
function avgRatio(data, from, to) {
  const rows = data.filter((d) => d.period >= from && d.period <= to)
  if (rows.length === 0) return 0
  return rows.reduce((sum, d) => sum + d.ratio, 0) / rows.length
}

// ── C. 키워드 검색량 조회 (DataLab 검색어트렌드 기반 상대 지수) ─────────
// DataLab은 요청 1건당 최대 5개 키워드 그룹만 허용하고, 결과 ratio는 요청 내
// 상대값이다. 그래서 모든 요청에 공통 앵커 키워드(첫 번째 키워드)를 포함시켜
// 요청 간 값을 정규화한다. (절대 월간 검색수는 네이버 광고 API 필요 — 추후 업그레이드 가능)
export async function getKeywordVolumes(keywords = DEFAULT_KEYWORDS) {
  const startDate = fmtDate(daysAgo(60)) // 전월 대비 증감 계산을 위해 60일 조회
  const endDate = fmtDate(daysAgo(1))
  const last30Start = fmtDate(daysAgo(30))
  const mode = isNaverConfigured() ? 'naver' : 'mock'
  const cacheKey = `${mode}:volume:${keywords.join(',')}:${startDate}:${endDate}`

  const cached = getCache(cacheKey, CACHE_TTL)
  if (cached) {
    // 광고 API는 자체 6시간 캐시가 있으므로 DataLab 캐시 hit시에도 항상 병합
    if (isAdConfigured() && cached.keywords?.length) {
      try {
        const counts = await getMonthlySearchCounts(keywords)
        if (counts.size > 0) {
          for (const r of cached.keywords) {
            const c = counts.get(r.keyword)
            if (c) { r.monthlyPc = c.pc; r.monthlyMobile = c.mobile; r.monthlyTotal = c.total; r.compIdx = c.compIdx }
          }
        }
      } catch (e) { /* 광고 API 실패해도 DataLab 캐시 결과는 반환 */ }
    }
    return { ...cached, cached: true }
  }

  if (!isNaverConfigured()) {
    const result = {
      source: 'mock',
      note: 'NAVER API 키 미설정 — mock 데이터입니다.',
      cached: false,
      period: { startDate, endDate },
      keywords: mockKeywordVolumes(keywords),
    }
    setCache(cacheKey, result)
    return result
  }

  try {
    const client = createNaverClient()
    const anchor = keywords[0]
    const rest = keywords.slice(1)

    // 앵커 + 4개씩 묶어서 요청 (요청당 최대 5그룹 제한)
    // 키워드가 1개(앵커만)일 때는 그 키워드 단독으로 1개 청크 생성
    const chunks = []
    if (rest.length === 0) {
      chunks.push([anchor])
    } else {
      for (let i = 0; i < rest.length; i += 4) chunks.push([anchor, ...rest.slice(i, i + 4)])
    }

    const rows = new Map() // keyword → { volumeIndex, changePct }
    let anchorRefAvg = null

    // 청크를 병렬 요청 (55개 키워드 = 14청크 — 직렬이면 Vercel 30초 제한 초과 위험)
    const responses = await Promise.all(
      chunks.map((chunk) =>
        client.post('/v1/datalab/search', {
          startDate,
          endDate,
          timeUnit: 'date',
          keywordGroups: chunk.map((k) => ({ groupName: k, keywords: [k] })),
        }).then(({ data }) => data),
      ),
    )

    for (const data of responses) {
      // 주의: 요청은 groupName이지만 응답은 title 필드로 돌아온다
      const anchorData = data.results.find((r) => r.title === anchor)?.data ?? []
      const anchorAvg = avgRatio(anchorData, last30Start, endDate) || 1
      if (anchorRefAvg === null) anchorRefAvg = anchorAvg
      const scale = anchorRefAvg / anchorAvg // 요청 간 정규화 계수

      for (const r of data.results) {
        if (rows.has(r.title)) continue
        const avgLast30 = avgRatio(r.data, last30Start, endDate) * scale
        const avgPrev30 = avgRatio(r.data, startDate, last30Start) * scale
        const changePct = avgPrev30 > 0 ? ((avgLast30 - avgPrev30) / avgPrev30) * 100 : 0
        rows.set(r.title, {
          keyword: r.title,
          volumeIndex: Math.round(avgLast30 * 100), // 앵커 기준 상대 지수
          changePct: Math.round(changePct * 10) / 10,
        })
      }
    }

    const list = [...rows.values()].sort((a, b) => b.volumeIndex - a.volumeIndex)
      .map((r, i) => ({ rank: i + 1, ...r }))

    // 광고 API로 절대 월간 검색수 병합 (설정된 경우만)
    if (isAdConfigured()) {
      try {
        const counts = await getMonthlySearchCounts(keywords)
        for (const r of list) {
          const c = counts.get(r.keyword)
          if (c) { r.monthlyPc = c.pc; r.monthlyMobile = c.mobile; r.monthlyTotal = c.total; r.compIdx = c.compIdx }
        }
      } catch (e) {
        console.error('[datalab/volume] 광고 API 병합 실패:', e.message)
      }
    }

    const result = {
      source: 'naver',
      note: isAdConfigured() ? null : 'volumeIndex는 DataLab 상대 검색량 지수입니다.',
      cached: false,
      period: { startDate, endDate },
      keywords: list,
    }
    setCache(cacheKey, result)
    return result
  } catch (err) {
    console.error('[datalab/volume] API 오류:', err.response?.data ?? err.message)
    return {
      source: 'mock',
      note: `NAVER API 호출 실패로 mock 데이터로 대체: ${err.response?.data?.errorMessage ?? err.message}`,
      cached: false,
      period: { startDate, endDate },
      keywords: mockKeywordVolumes(keywords),
    }
  }
}
