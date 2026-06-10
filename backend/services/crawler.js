// Puppeteer 크롤러 — 네이버 쇼핑 리뷰수 수집 (stealth 모드)
// Vercel 서버리스 환경에서는 Puppeteer를 동적 import하지 않아 스킵
import { getCache, setCache } from '../db/database.js'

const IS_VERCEL = !!process.env.VERCEL

// puppeteer-extra + stealth: 로컬 환경에서만 동적 import
let puppeteerExtra = null
async function getPuppeteer() {
  if (IS_VERCEL) return null
  if (puppeteerExtra) return puppeteerExtra
  const mod = await import('puppeteer-extra')
  const stealth = await import('puppeteer-extra-plugin-stealth')
  puppeteerExtra = mod.default
  puppeteerExtra.use(stealth.default())
  return puppeteerExtra
}

const CRAWL_CACHE_TTL = 3600 * 6  // 6시간
const PAGE_TIMEOUT = 20000         // 페이지 로딩 최대 20초
const CRAWL_DELAY = 2000           // 요청 간격 2초 (서버 부하 방지)

let crawlRunning = false

// 네이버 카탈로그 페이지에서 리뷰수 추출 (여러 셀렉터 순서대로 시도)
async function extractReviewCount(page) {
  return page.evaluate(() => {
    // 셀렉터 후보 목록 (최신 클래스명 우선)
    const selectors = [
      '[class*="num_review"]',
      '[class*="reviewCount"]',
      '[class*="review_count"]',
      '[class*="cnt_review"]',
      '.rating_num',
    ]
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) {
        const n = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10)
        if (!isNaN(n)) return n
      }
    }
    // 셀렉터 실패 시 페이지 텍스트에서 "리뷰 N건" 패턴 파싱
    const text = document.body.innerText
    const m = text.match(/리뷰\s*([\d,]+)\s*건/)
    if (m) return parseInt(m[1].replace(/,/g, ''), 10)
    return null
  })
}

async function crawlOne(browser, item) {
  const cacheKey = `crawl:review:${item.productId}`
  const page = await browser.newPage()
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )
    // 이미지/폰트 등 불필요한 리소스 차단해 속도 향상
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      if (['image', 'font', 'stylesheet', 'media'].includes(req.resourceType())) req.abort()
      else req.continue()
    })

    const catalogUrl = `https://search.shopping.naver.com/catalog/${item.productId}`
    await page.goto(catalogUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT })
    await new Promise((r) => setTimeout(r, 1200)) // 동적 렌더링 대기

    let reviewCount = await extractReviewCount(page)

    // 카탈로그 페이지 실패 시 직접 링크 시도
    if (reviewCount === null && item.link) {
      await page.goto(item.link, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT })
      await new Promise((r) => setTimeout(r, 1200))
      reviewCount = await extractReviewCount(page)
    }

    // 차단/CAPTCHA 감지: 캐시하지 않고 건너뜀 (다음 요청 때 재시도)
    const isBlocked = await page.evaluate(() =>
      document.body.innerText.includes('security verification') ||
      document.body.innerText.includes('접속이 일시적으로 제한')
    )
    if (isBlocked) {
      console.warn(`[crawler] ${item.productId} 차단 감지 — 캐시 스킵`)
      return null
    }

    setCache(cacheKey, { reviewCount: reviewCount ?? 0 })
    return reviewCount
  } catch (err) {
    console.error(`[crawler] ${item.productId} 실패:`, err.message)
    // 오류 시에도 캐시하지 않음 (재시도 가능하도록)
    return null
  } finally {
    await page.close()
  }
}

async function crawlInBackground(items) {
  if (crawlRunning || IS_VERCEL) return
  crawlRunning = true
  console.log(`[crawler] 백그라운드 크롤 시작 — ${items.length}개 상품`)
  let browser
  try {
    const pup = await getPuppeteer()
    if (!pup) { crawlRunning = false; return }
    browser = await pup.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    for (const item of items) {
      await crawlOne(browser, item)
      await new Promise((r) => setTimeout(r, CRAWL_DELAY))
    }
    console.log(`[crawler] 완료 — ${items.length}개`)
  } catch (err) {
    console.error('[crawler] 브라우저 오류:', err.message)
  } finally {
    browser?.close()
    crawlRunning = false
  }
}

// 쇼핑 items 배열에 캐시된 리뷰수를 병합, 미수집 항목은 백그라운드 크롤 예약
export function mergeReviewCounts(items) {
  const missing = []
  const result = items.map((it) => {
    const cacheKey = `crawl:review:${it.productId}`
    const cached = getCache(cacheKey, CRAWL_CACHE_TTL)
    if (cached !== null) {
      return { ...it, reviewCount: cached.reviewCount || null }
    }
    missing.push(it)
    return it
  })

  if (missing.length > 0 && !crawlRunning) {
    setImmediate(() => crawlInBackground(missing))
  }

  return { items: result, crawlPending: missing.length }
}

export function isCrawlRunning() { return crawlRunning }
