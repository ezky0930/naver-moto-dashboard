// GET  /api/history?days=7 — 최근 N일 수집 히스토리 + 순위 변동
// POST /api/collect        — 수동 전체 갱신 (UI 새로고침 버튼)
import { Router } from 'express'
import { getDailySnapshots } from '../db/database.js'
import { collectAll, getRankChanges } from '../services/collector.js'

const router = Router()

router.get('/history', (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30)

    const shoppingDays = getDailySnapshots('shopping', days)
    const keywordDays = getDailySnapshots('keywords', days)
    const datalabDays = getDailySnapshots('datalab', days)

    // 날짜별 요약으로 병합
    const byDate = new Map()
    const day = (date) => {
      if (!byDate.has(date)) byDate.set(date, { date })
      return byDate.get(date)
    }
    for (const s of shoppingDays) {
      const items = s.data.items
      day(s.date).shopping = {
        itemCount: items.length,
        avgPrice: Math.round(items.reduce((sum, it) => sum + it.price, 0) / (items.length || 1)),
        topProduct: items[0]?.title ?? null,
      }
    }
    for (const s of keywordDays) {
      day(s.date).topKeywords = s.data.keywords.slice(0, 5)
        .map((k) => ({ keyword: k.keyword, volumeIndex: k.volumeIndex }))
    }
    for (const s of datalabDays) {
      const series = s.data.series
      day(s.date).trendAvg = Math.round(
        (series.reduce((sum, p) => sum + p.value, 0) / (series.length || 1)) * 10,
      ) / 10
    }

    const result = {
      days: [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1)),
      rankChanges: getRankChanges(),
    }
    res.json(result)
  } catch (err) {
    console.error('[routes/history] 처리 오류:', err)
    res.status(500).json({ error: '히스토리 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/collect', async (req, res) => {
  try {
    const { trends, volumes, shopping } = await collectAll()
    res.json({
      ok: true,
      collectedAt: new Date().toISOString(),
      source: shopping.source,
      summary: {
        trendDays: trends.series.length,
        keywords: volumes.keywords.length,
        products: shopping.items.length,
      },
    })
  } catch (err) {
    console.error('[routes/collect] 수집 오류:', err)
    res.status(500).json({ error: '데이터 수집 중 오류가 발생했습니다.' })
  }
})

export default router
