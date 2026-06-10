// 데이터 수집기 — 캐시를 비우고 새로 수집한 뒤 날짜별 스냅샷으로 저장
// (스케줄러와 수동 새로고침 버튼이 공용으로 사용)

import db, { saveSnapshot, getDailySnapshots } from '../db/database.js'
import { getShoppingTrends, getKeywordVolumes } from './datalab.js'
import { searchShopping } from './shopping.js'

const MAIN_KEYWORD = '오토바이헬멧'

// 트렌드 + 키워드 검색량 수집 (매일 09:00)
export async function collectTrends() {
  console.log('[collector] 트렌드/키워드 수집 시작')
  db.prepare("DELETE FROM api_cache WHERE cache_key LIKE '%:trends:%' OR cache_key LIKE '%:volume:%'").run()

  const trends = await getShoppingTrends({ keyword: MAIN_KEYWORD })
  const volumes = await getKeywordVolumes()
  saveSnapshot('datalab', MAIN_KEYWORD, trends)
  saveSnapshot('keywords', null, volumes)

  console.log(`[collector] 트렌드 ${trends.series.length}일치 + 키워드 ${volumes.keywords.length}개 저장 (source: ${trends.source})`)
  return { trends, volumes }
}

// 판매 순위 수집 (매일 09:30)
export async function collectShopping() {
  console.log('[collector] 판매 순위 수집 시작')
  db.prepare("DELETE FROM api_cache WHERE cache_key LIKE '%:shopping:%'").run()

  const shopping = await searchShopping({ keyword: MAIN_KEYWORD, sort: 'sim', display: 30 })
  saveSnapshot('shopping', MAIN_KEYWORD, shopping)

  console.log(`[collector] 상품 ${shopping.items.length}개 저장 (source: ${shopping.source})`)
  return { shopping }
}

// 전체 수집 (수동 새로고침 버튼)
export async function collectAll() {
  const { trends, volumes } = await collectTrends()
  const { shopping } = await collectShopping()
  return { trends, volumes, shopping }
}

// 어제 vs 오늘 판매 순위 변동 계산
// change > 0 = 순위 상승 (예: 5위 → 2위면 +3)
export function getRankChanges() {
  const snaps = getDailySnapshots('shopping', 30).slice(0, 2)
  if (snaps.length < 2) {
    return { available: false, note: '비교할 이전 날짜의 스냅샷이 없습니다. 수집 2일차부터 제공됩니다.' }
  }
  const [today, prev] = snaps
  const prevRank = new Map(prev.data.items.map((it) => [it.productId, it.rank]))

  return {
    available: true,
    todayDate: today.date,
    baseDate: prev.date,
    items: today.data.items.map((it) => {
      const before = prevRank.get(it.productId) ?? null
      return {
        productId: it.productId,
        title: it.title,
        rank: it.rank,
        prevRank: before,
        change: before === null ? null : before - it.rank, // null = 신규 진입
      }
    }),
  }
}
