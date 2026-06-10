// 백엔드 API 호출 래퍼 (vite 프록시로 /api → localhost:3001)

async function request(path, options = {}) {
  const res = await fetch(path, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API 오류 (HTTP ${res.status})`)
  }
  return res.json()
}

// A. 검색어 트렌드 (days: 30/90=일 단위, 365=월 단위)
export function fetchTrends(keyword = '오토바이헬멧', days = 30, timeUnit = 'date') {
  return request('/api/trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, days, timeUnit }),
  })
}

// B-2. 키워드 시장 통계 (총 상품수/해외 비율/카테고리 분포)
export function fetchShoppingStats(keyword = '오토바이헬멧') {
  const qs = new URLSearchParams({ keyword })
  return request(`/api/shopping/stats?${qs}`)
}

// C. 키워드 검색량 순위 (keywords 생략 시 기본 9개, 배열 전달 시 해당 키워드만 조회)
export function fetchKeywordVolumes(keywords) {
  return request('/api/keywords/volume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keywords?.length ? { keywords } : {}),
  })
}

// B. 쇼핑 상품 검색 (헬멧 판매 순위)
export function fetchShopping(keyword = '오토바이헬멧', sort = 'sim', display = 30) {
  const qs = new URLSearchParams({ keyword, sort, display })
  return request(`/api/shopping/search?${qs}`)
}

// 수동 전체 갱신 (캐시 무시하고 재수집 + 스냅샷 저장)
export function collectNow() {
  return request('/api/collect', { method: 'POST' })
}

// 최근 N일 수집 히스토리 + 순위 변동
export function fetchHistory(days = 7) {
  return request(`/api/history?days=${days}`)
}
