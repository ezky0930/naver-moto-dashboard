// A. POST /api/trends — 검색어 트렌드 (DataLab 쇼핑인사이트)
import { Router } from 'express'
import { getShoppingTrends } from '../services/datalab.js'

const router = Router()

router.post('/trends', async (req, res) => {
  try {
    const { keyword, days, timeUnit, device } = req.body ?? {}
    const result = await getShoppingTrends({ keyword, days, timeUnit, device })
    res.json(result)
  } catch (err) {
    console.error('[routes/trends] 처리 오류:', err)
    res.status(500).json({ error: '트렌드 데이터 조회 중 오류가 발생했습니다.' })
  }
})

export default router
