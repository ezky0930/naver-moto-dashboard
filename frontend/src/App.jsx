import { useCallback, useEffect, useState } from 'react'
import {
  fetchTrends, fetchKeywordVolumes, fetchShopping, fetchShoppingStats,
  collectNow, fetchHistory,
} from './api/client.js'
import SummaryCards from './components/SummaryCards.jsx'
import KeywordChips from './components/KeywordChips.jsx'
import TrendChart, { TREND_PERIODS } from './components/TrendChart.jsx'
import KeywordTable from './components/KeywordTable.jsx'
import ProductTable from './components/ProductTable.jsx'
import { Spinner, ErrorBox } from './components/Status.jsx'

const MAIN_KEYWORD = '오토바이헬멧' // 자동 수집·순위 변동 추적 대상 키워드

export default function App() {
  const [keyword, setKeyword] = useState(MAIN_KEYWORD)
  const [trendPeriod, setTrendPeriod] = useState('1m')

  const [trends, setTrends] = useState(null)
  const [trendLoading, setTrendLoading] = useState(false)
  const [keywords, setKeywords] = useState(null)
  const [shopping, setShopping] = useState(null)
  const [crawlPending, setCrawlPending] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [rankChanges, setRankChanges] = useState(null)

  // 키워드 기준 데이터 (트렌드 제외 — 트렌드는 기간 토글과 함께 별도 로드)
  const loadAll = useCallback(async (kw) => {
    setLoading(true)
    setError(null)
    try {
      const [k, s, st, h] = await Promise.all([
        fetchKeywordVolumes(),
        fetchShopping(kw, 'sim', 30),
        fetchShoppingStats(kw).catch(() => null),
        fetchHistory(7).catch(() => null),
      ])
      setKeywords(k)
      setShopping(s)
      setCrawlPending(s?.crawlPending ?? 0)
      setStats(st)
      // 순위 변동은 자동 수집 대상 키워드에서만 의미가 있음
      setRankChanges(kw === MAIN_KEYWORD ? (h?.rankChanges ?? null) : null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 트렌드 차트 (키워드 / 기간 변경 시)
  useEffect(() => {
    const p = TREND_PERIODS.find((x) => x.key === trendPeriod) ?? TREND_PERIODS[0]
    let cancelled = false
    setTrendLoading(true)
    fetchTrends(keyword, p.days, p.timeUnit)
      .then((t) => { if (!cancelled) setTrends(t) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTrendLoading(false) })
    return () => { cancelled = true }
  }, [keyword, trendPeriod])

  useEffect(() => { loadAll(keyword) }, [loadAll, keyword])

  // 새로고침 버튼: 캐시 무시하고 재수집(스냅샷 저장) 후 화면 갱신
  const forceRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await collectNow()
      await loadAll(keyword)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [loadAll, keyword])

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-slate-100">
      {/* 헤더 + 요약 카드 (상단 고정) */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#1a1a2e]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-white sm:text-xl">
              🏍️ 네이버 오토바이 마켓 인텔리전스
            </h1>
            <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400 sm:inline">
              검색 트렌드 · 헬멧 판매 순위
            </span>
          </div>
          {shopping
            ? <SummaryCards
                items={shopping.items} stats={stats}
                lastUpdated={lastUpdated} onRefresh={forceRefresh} refreshing={loading}
              />
            : <div className="h-[72px]" />}
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* 연관 키워드 칩 */}
        <KeywordChips keyword={keyword} onSelect={setKeyword} disabled={loading} />

        {loading && !shopping && <Spinner label="네이버 데이터를 수집하는 중..." />}
        {error && <ErrorBox message={error} onRetry={() => loadAll(keyword)} />}

        {!error && keywords && shopping && (
          <>
            {/* 섹션 1 + 2: 데스크톱 2열, 모바일 1열 */}
            <div className="grid gap-6 xl:grid-cols-2">
              <TrendChart
                data={trends} loading={trendLoading}
                period={trendPeriod} onPeriodChange={setTrendPeriod}
              />
              <KeywordTable data={keywords} />
            </div>
            {/* 섹션 3: 핵심 판매 순위표 */}
            <ProductTable data={shopping} stats={stats} rankChanges={rankChanges} crawlPending={crawlPending} />
          </>
        )}

        <footer className="pb-6 pt-2 text-center text-xs text-slate-600">
          데이터 출처: 네이버 DataLab · 네이버 쇼핑 검색 API — 1시간 캐싱 적용
        </footer>
      </main>
    </div>
  )
}
