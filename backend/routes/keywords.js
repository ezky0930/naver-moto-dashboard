// C. POST /api/keywords/volume — 키워드 검색량 조회 (body.keywords 생략 시 기본 9개)
// D. POST /api/keywords/discover — 씨앗 키워드로 연관 키워드 전체 탐색 (광고 API)
// E. GET  /api/keywords/adtest  — 광고 API 원본 응답 진단
import { Router } from 'express'
import { getKeywordVolumes, DEFAULT_KEYWORDS } from '../services/datalab.js'
import { discoverRelatedKeywords, isAdConfigured, makeRawAdRequest } from '../services/searchad.js'

const router = Router()

router.post('/keywords/volume', async (req, res) => {
  try {
    const keywords = Array.isArray(req.body?.keywords) && req.body.keywords.length > 0
      ? req.body.keywords.slice(0, 20)
      : DEFAULT_KEYWORDS
    const result = await getKeywordVolumes(keywords)
    res.json(result)
  } catch (err) {
    console.error('[routes/keywords] 처리 오류:', err)
    res.status(500).json({ error: '키워드 검색량 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/keywords/discover', async (req, res) => {
  if (!isAdConfigured()) {
    return res.status(503).json({ error: '네이버 광고 API 미설정 — NAVER_AD_* 환경변수를 확인하세요.' })
  }
  try {
    const seeds = Array.isArray(req.body?.seeds) && req.body.seeds.length > 0
      ? req.body.seeds.slice(0, 10)
      : ['오토바이헬멧', '오토바이장갑', '오토바이자켓', '오토바이부츠', '바이크용품', '오토바이바지']
    const keywords = await discoverRelatedKeywords(seeds)
    res.json({ seeds, keywords, total: keywords.length })
  } catch (err) {
    console.error('[routes/keywords/discover] 처리 오류:', err)
    res.status(500).json({ error: '키워드 탐색 중 오류가 발생했습니다.' })
  }
})

// 광고 API 원본 응답 진단 — /api/keywords/adtest?kw=오토바이헬멧
router.get('/keywords/adtest', async (req, res) => {
  if (!isAdConfigured()) return res.status(503).json({ error: '광고 API 미설정' })
  try {
    const kw = req.query.kw || '오토바이헬멧'
    const raw = await makeRawAdRequest(kw)
    res.json({ kw, listLength: raw.keywordList?.length ?? 0, sample: raw.keywordList?.slice(0, 3), full: raw })
  } catch (err) {
    res.status(500).json({ error: err.message, detail: err.response?.data })
  }
})

export default router
