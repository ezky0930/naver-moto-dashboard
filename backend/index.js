import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const app = (await import('./app.js')).default
const { isNaverConfigured } = await import('./services/naverClient.js')

const PORT = process.env.PORT || 3001

// 프로덕션: 프론트엔드 빌드 결과가 있으면 함께 서빙
const distDir = path.join(__dirname, '..', 'frontend', 'dist')
if (fs.existsSync(distDir)) {
  const { default: express } = await import('express')
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'))
    }
    next()
  })
}

app.listen(PORT, () => {
  console.log(`✅ 서버 실행: http://localhost:${PORT}`)
  console.log(`   네이버 API 키: ${isNaverConfigured() ? '설정됨 (실데이터 모드)' : '미설정 (mock 모드)'}`)
  console.log('   스케줄러: 매일 09:00 트렌드/키워드, 09:30 판매 순위 갱신 (Asia/Seoul)')
  if (fs.existsSync(distDir)) console.log(`   프론트엔드: 빌드본 서빙 중 → http://localhost:${PORT}`)
})
