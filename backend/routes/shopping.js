// B. GET /api/shopping/search?keyword=오토바이헬멧&sort=sim|review
import { Router } from 'express'
import { searchShopping, getShoppingStats } from '../services/shopping.js'

const router = Router()

// 키워드 시장 통계 (총 상품수/해외 비율/카테고리 분포)
router.get('/shopping/stats', async (req, res) => {
  try {
    const { keyword = '오토바이헬멧' } = req.query
    res.json(await getShoppingStats(keyword))
  } catch (err) {
    console.error('[routes/shopping/stats] 처리 오류:', err)
    res.status(500).json({ error: '시장 통계 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/shopping/search', async (req, res) => {
  try {
    const { keyword = '오토바이헬멧', sort = 'sim' } = req.query
    if (!['sim', 'review'].includes(sort)) {
      return res.status(400).json({ error: "sort는 'sim'(판매량/유사도순) 또는 'review'(리뷰많은순)만 가능합니다." })
    }
    const display = Math.min(Number(req.query.display) || 30, 100)
    const result = await searchShopping({ keyword, sort, display })
    res.json(result)
  } catch (err) {
    console.error('[routes/shopping] 처리 오류:', err)
    res.status(500).json({ error: '쇼핑 검색 중 오류가 발생했습니다.' })
  }
})

export default router
