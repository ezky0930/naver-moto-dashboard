// C. POST /api/keywords/volume — 키워드 검색량 조회 (body.keywords 생략 시 기본 9개)
import { Router } from 'express'
import { getKeywordVolumes, DEFAULT_KEYWORDS } from '../services/datalab.js'

const router = Router()

router.post('/keywords/volume', async (req, res) => {
  try {
    const keywords = Array.isArray(req.body?.keywords) && req.body.keywords.length > 0
      ? req.body.keywords.slice(0, 20) // 과도한 요청 방지
      : DEFAULT_KEYWORDS
    const result = await getKeywordVolumes(keywords)
    res.json(result)
  } catch (err) {
    console.error('[routes/keywords] 처리 오류:', err)
    res.status(500).json({ error: '키워드 검색량 조회 중 오류가 발생했습니다.' })
  }
})

export default router
