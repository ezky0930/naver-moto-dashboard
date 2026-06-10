// API 키 미설정 / API 오류 시 사용하는 mock 데이터 생성기
// 같은 입력이면 항상 같은 결과가 나오도록 시드 기반 의사난수 사용 (UI 개발 시 편의)

import { fmtDate, daysAgo } from './naverClient.js'

// 문자열 시드 → 0~1 의사난수 생성기 (mulberry32)
function seededRandom(seedStr) {
  let h = 1779033703
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

// ── A. 검색어 트렌드 (일별 또는 월별 상대 검색량 0~100) ────────────────
export function mockTrendSeries(keyword = '오토바이헬멧', days = 30, timeUnit = 'date') {
  const rand = seededRandom(`trend:${keyword}:${timeUnit}`)
  const series = []
  if (timeUnit === 'month') {
    // 월 단위: 12개월치, 봄·가을 라이딩 시즌 피크 가정
    const months = Math.max(Math.round(days / 30), 2)
    for (let i = months; i >= 1; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i, 1)
      const season = [0, 5, 20, 35, 40, 30, 15, 10, 25, 30, 15, 0][d.getMonth()]
      series.push({ date: fmtDate(d), value: Math.min(100, Math.round(40 + season + rand() * 14 - 7)) })
    }
    return series
  }
  for (let i = days; i >= 1; i--) {
    const date = daysAgo(i)
    const dow = date.getDay()
    const weekendBoost = dow === 0 || dow === 6 ? 12 : 0 // 주말에 검색량 증가 경향
    const trend = (days - i) * 0.4 // 봄 시즌 우상향 가정
    const value = Math.min(100, Math.round(45 + weekendBoost + trend + rand() * 20 - 10))
    series.push({ date: fmtDate(date), value })
  }
  return series
}

// ── B. 쇼핑 상품 검색 결과 ──────────────────────────────────────────
const MOCK_PRODUCTS = [
  { brand: 'HJC', name: 'HJC i70 풀페이스 헬멧', price: 189000, origin: '국내' },
  { brand: 'HJC', name: 'HJC RPHA 12 카본 풀페이스', price: 549000, origin: '국내' },
  { brand: 'HJC', name: 'HJC CS-15 입문용 풀페이스', price: 89000, origin: '국내' },
  { brand: 'SHOEI', name: '쇼에이 Z-8 풀페이스 헬멧', price: 698000, origin: '수입' },
  { brand: 'SHOEI', name: '쇼에이 J-Cruise2 오픈페이스', price: 645000, origin: '수입' },
  { brand: 'Arai', name: '아라이 RX-7X 풀페이스', price: 789000, origin: '수입' },
  { brand: 'Arai', name: '아라이 아스트로 GX', price: 720000, origin: '수입' },
  { brand: 'AGV', name: 'AGV K1 S 풀페이스 헬멧', price: 275000, origin: '수입' },
  { brand: 'AGV', name: 'AGV K6 S 경량 풀페이스', price: 590000, origin: '수입' },
  { brand: 'SHARK', name: '샤크 스파르탄 GT 프로', price: 480000, origin: '수입' },
  { brand: 'VEGA', name: '베가 누오보 오픈페이스 헬멧', price: 45000, origin: '국내' },
  { brand: 'VEGA', name: '베가 팔콘 풀페이스', price: 78000, origin: '국내' },
  { brand: 'KIDO', name: '기도 K-27 오픈페이스 헬멧', price: 38000, origin: '국내' },
  { brand: 'JPX', name: 'JPX 모듈러 시스템 헬멧', price: 95000, origin: '수입' },
  { brand: 'JPX', name: 'JPX 풀페이스 레이싱 헬멧', price: 119000, origin: '수입' },
  { brand: 'LS2', name: 'LS2 FF353 래피드 풀페이스', price: 98000, origin: '수입' },
  { brand: 'LS2', name: 'LS2 OF600 코펜하겐 오픈페이스', price: 125000, origin: '수입' },
  { brand: 'OGK카부토', name: 'OGK 카부토 에어로블레이드6', price: 320000, origin: '수입' },
  { brand: '홍진', name: '홍진 V30 클래식 오픈페이스', price: 152000, origin: '국내' },
  { brand: 'SOL', name: 'SOL SF-6 카본 풀페이스', price: 265000, origin: '수입' },
]

export function mockShoppingItems(keyword = '오토바이헬멧', sort = 'sim', display = 30) {
  const rand = seededRandom(`shop:${keyword}`)
  const items = []
  for (let i = 0; i < display; i++) {
    const base = MOCK_PRODUCTS[i % MOCK_PRODUCTS.length]
    const variant = i >= MOCK_PRODUCTS.length ? ` ${['블랙', '화이트', '매트그레이', '레드'][i % 4]} 에디션` : ''
    const reviewCount = Math.round(rand() * 4800 + 15)
    items.push({
      title: base.name + variant,
      brand: base.brand,
      origin: base.origin, // 국내/수입 (3단계 브랜드 필터용)
      price: base.price + (i >= MOCK_PRODUCTS.length ? Math.round(rand() * 20 - 10) * 1000 : 0),
      mallName: ['네이버', '바이크마트', '모토샵', 'OO스마트스토어'][Math.floor(rand() * 4)],
      link: `https://smartstore.naver.com/mock/products/${100000 + i}`,
      image: '',
      productId: String(100000 + i),
      category: '스포츠/레저>오토바이/스쿠터>헬멧',
      reviewCount,
      purchaseCount: Math.round(reviewCount * (2.5 + rand())), // 리뷰수 기반 판매량 추정
    })
  }
  // 정렬: sim=유사도(원래 순서 유지), review=리뷰많은순
  if (sort === 'review') items.sort((a, b) => b.reviewCount - a.reviewCount)
  return items.map((it, i) => ({ rank: i + 1, ...it }))
}

// ── B-2. 키워드 시장 통계 (총 상품수/해외 비율/카테고리 분포) ──────────
export function mockShoppingStats(keyword = '오토바이헬멧') {
  const rand = seededRandom(`stats:${keyword}`)
  const total = Math.round(rand() * 900_000 + 100_000)
  const overseasTotal = Math.round(total * (0.3 + rand() * 0.3))
  return {
    total,
    domesticTotal: total - overseasTotal,
    overseasTotal,
    overseasRatio: Math.round((overseasTotal / total) * 1000) / 10,
    categoryDist: [{ path: '스포츠/레저>오토바이/스쿠터>헬멧', count: 30, pct: 100 }],
  }
}

// ── C. 키워드 검색량 ────────────────────────────────────────────────
export function mockKeywordVolumes(keywords) {
  const result = keywords.map((keyword) => {
    const rand = seededRandom(`vol:${keyword}`)
    const volumeIndex = Math.round(rand() * 9000 + 500)
    const changePct = Math.round((rand() * 60 - 25) * 10) / 10 // -25% ~ +35%
    return { keyword, volumeIndex, changePct }
  })
  result.sort((a, b) => b.volumeIndex - a.volumeIndex)
  return result.map((r, i) => ({ rank: i + 1, ...r }))
}
