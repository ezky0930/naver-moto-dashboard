// Express 앱 설정 — listen 없이 app만 export (Vercel 서버리스 + 로컬 공용)
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IS_VERCEL = !!process.env.VERCEL

const { initDb } = await import('./db/database.js')
const { isNaverConfigured } = await import('./services/naverClient.js')
const trendsRouter = (await import('./routes/trends.js')).default
const shoppingRouter = (await import('./routes/shopping.js')).default
const keywordsRouter = (await import('./routes/keywords.js')).default
const historyRouter = (await import('./routes/history.js')).default

const app = express()
app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`)
  })
  next()
})

initDb()

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'naver-moto-dashboard',
    env: IS_VERCEL ? 'vercel' : 'local',
    naverApiConfigured: isNaverConfigured(),
    timestamp: new Date().toISOString(),
  })
})

app.use('/api', trendsRouter)
app.use('/api', shoppingRouter)
app.use('/api', keywordsRouter)
app.use('/api', historyRouter)

// 크론 스케줄러 — Vercel 서버리스에서는 비활성 (상태 없는 함수 환경)
if (!IS_VERCEL) {
  const { collectTrends, collectShopping } = await import('./services/collector.js')
  const cron = (await import('node-cron')).default
  cron.schedule('0 9 * * *', () => {
    collectTrends().catch((err) => console.error('[cron] 트렌드 수집 실패:', err.message))
  }, { timezone: 'Asia/Seoul' })
  cron.schedule('30 9 * * *', () => {
    collectShopping().catch((err) => console.error('[cron] 판매 순위 수집 실패:', err.message))
  }, { timezone: 'Asia/Seoul' })
}

export default app
