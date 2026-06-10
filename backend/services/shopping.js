// B. 네이버 검색 API (shopping 타입) — 상품 검색
// 참고: 쇼핑 검색 API의 공식 정렬은 sim(유사도)/date/asc/dsc 뿐이고,
// 리뷰수·구매건수 필드는 제공되지 않는다. sort=review 요청 시
//  - 실데이터 모드: sim으로 조회 후 안내 메시지 포함 (리뷰수는 4단계 크롤링 보조로 수집 예정)
//  - mock 모드: 리뷰수 기준 정렬 제공

import { createNaverClient, isNaverConfigured } from './naverClient.js'
import { getCache, setCache } from '../db/database.js'
import { mockShoppingItems, mockShoppingStats } from './mock.js'
import { mergeReviewCounts } from './crawler.js'

const CACHE_TTL = 3600 // 1시간 캐싱

// 응답 title의 <b></b> 강조 태그 제거
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '')
}

export async function searchShopping({ keyword = '오토바이헬멧', sort = 'sim', display = 30 } = {}) {
  // 캐시 키에 모드를 포함 — API 키를 넣는 즉시 mock 캐시를 무시하고 실데이터로 전환
  const mode = isNaverConfigured() ? 'naver' : 'mock'
  const cacheKey = `${mode}:shopping:${keyword}:${sort}:${display}`
  const cached = getCache(cacheKey, CACHE_TTL)
  if (cached) {
    const { items: enriched, crawlPending } = mergeReviewCounts(cached.items ?? [])
    return { ...cached, items: enriched, crawlPending, cached: true }
  }

  if (!isNaverConfigured()) {
    const result = {
      source: 'mock',
      note: 'NAVER API 키 미설정 — mock 데이터입니다.',
      cached: false,
      keyword,
      sort,
      total: display,
      items: mockShoppingItems(keyword, sort, display),
    }
    setCache(cacheKey, result)
    return result
  }

  try {
    const client = createNaverClient()
    const { data } = await client.get('/v1/search/shop.json', {
      params: {
        query: keyword,
        display: Math.min(display, 100),
        sort: 'sim', // review 정렬은 API 미지원 → sim으로 조회
        exclude: 'used:rental:cbshop', // 중고/렌탈/해외직구 제외
      },
    })

    const items = (data.items ?? []).map((it, i) => ({
      rank: i + 1,
      title: stripTags(it.title),
      brand: it.brand || it.maker || '',
      price: Number(it.lprice) || 0,
      mallName: it.mallName,
      link: it.link,
      image: it.image,
      productId: it.productId,
      category: [it.category3, it.category4].filter(Boolean).join('>'),
      reviewCount: null,   // 검색 API 미제공 — 4단계 크롤링 보조에서 수집
      purchaseCount: null, // 〃
    }))

    const result = {
      source: 'naver',
      note: sort === 'review'
        ? '쇼핑 검색 API는 리뷰순 정렬을 지원하지 않아 유사도순으로 반환합니다.'
        : undefined,
      cached: false,
      keyword,
      sort,
      total: data.total,
      items,
    }
    setCache(cacheKey, result)
    // 리뷰수 크롤 캐시 병합 (미수집 항목은 백그라운드 크롤 자동 시작)
    const { items: enriched, crawlPending } = mergeReviewCounts(result.items)
    return { ...result, items: enriched, crawlPending }
  } catch (err) {
    console.error('[shopping/search] API 오류:', err.response?.data ?? err.message)
    return {
      source: 'mock',
      note: `NAVER API 호출 실패로 mock 데이터로 대체: ${err.response?.data?.errorMessage ?? err.message}`,
      cached: false,
      keyword,
      sort,
      total: display,
      items: mockShoppingItems(keyword, sort, display),
    }
  }
}

// 키워드 시장 통계 — 총 상품수 / 해외 상품수·비율 / 카테고리 분포 (SellerLife 참고)
// 해외 상품수 = (중고·렌탈 제외 전체) - (해외직구까지 제외한 국내) 의 차이로 계산
export async function getShoppingStats(keyword = '오토바이헬멧') {
  const mode = isNaverConfigured() ? 'naver' : 'mock'
  const cacheKey = `${mode}:shopstats:${keyword}`
  const cached = getCache(cacheKey, CACHE_TTL)
  if (cached) return { ...cached, cached: true }

  if (!isNaverConfigured()) {
    const result = { source: 'mock', note: 'NAVER API 키 미설정 — mock 데이터입니다.', cached: false, keyword, ...mockShoppingStats(keyword) }
    setCache(cacheKey, result)
    return result
  }

  try {
    const client = createNaverClient()
    const [all, domestic] = await Promise.all([
      client.get('/v1/search/shop.json', { params: { query: keyword, display: 1, exclude: 'used:rental' } }),
      client.get('/v1/search/shop.json', { params: { query: keyword, display: 1, exclude: 'used:rental:cbshop' } }),
    ])
    const total = all.data.total ?? 0
    const domesticTotal = domestic.data.total ?? 0
    const overseasTotal = Math.max(0, total - domesticTotal)

    // 카테고리 분포: 수집된 상위 30개 상품 기준 (캐시 공유)
    const { items } = await searchShopping({ keyword, sort: 'sim', display: 30 })
    const catCount = {}
    for (const it of items) {
      const path = it.category || '기타'
      catCount[path] = (catCount[path] || 0) + 1
    }
    const categoryDist = Object.entries(catCount)
      .map(([path, count]) => ({ path, count, pct: Math.round((count / (items.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count)

    const result = {
      source: 'naver',
      cached: false,
      keyword,
      total,
      domesticTotal,
      overseasTotal,
      overseasRatio: total > 0 ? Math.round((overseasTotal / total) * 1000) / 10 : 0,
      categoryDist,
    }
    setCache(cacheKey, result)
    return result
  } catch (err) {
    console.error('[shopping/stats] API 오류:', err.response?.data ?? err.message)
    return { source: 'mock', note: `NAVER API 호출 실패로 mock 데이터로 대체: ${err.response?.data?.errorMessage ?? err.message}`, cached: false, keyword, ...mockShoppingStats(keyword) }
  }
}
