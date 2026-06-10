import axios from 'axios'

// 네이버 API 키 설정 여부 (미설정 시 각 서비스가 mock 데이터로 폴백)
export function isNaverConfigured() {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET)
}

// 네이버 오픈 API 공통 클라이언트
export function createNaverClient() {
  return axios.create({
    baseURL: 'https://openapi.naver.com',
    timeout: 10_000,
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
    },
  })
}

// 날짜 유틸: yyyy-mm-dd 포맷 / n일 전 날짜
export function fmtDate(d) {
  return d.toISOString().slice(0, 10)
}

export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
