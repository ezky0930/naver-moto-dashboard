// 오토바이 전체 키워드 탐색 — 광고 API 연관 키워드 전수 조회
import { useState, useMemo } from 'react'
import { fetchKeywordDiscover } from '../api/client.js'

const COMP_STYLES = {
  '낮음': 'bg-green-500/20 text-green-300',
  '중간': 'bg-amber-500/20 text-amber-300',
  '높음': 'bg-red-500/20 text-red-300',
}

const DEFAULT_SEEDS = ['오토바이헬멧', '오토바이장갑', '오토바이자켓', '오토바이부츠', '바이크용품', '오토바이바지']

export default function KeywordDiscovery() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState('total')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchKeywordDiscover()
      setData(res)
      setPage(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    if (!data) load()
  }

  function clickSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const rows = useMemo(() => {
    if (!data?.keywords) return []
    let list = data.keywords
    if (filter.trim()) {
      const f = filter.trim().toLowerCase()
      list = list.filter(r => r.keyword.toLowerCase().includes(f))
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return list
  }, [data, filter, sortKey, sortDir])

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function SortTh({ col, label }) {
    return (
      <th
        onClick={() => clickSort(col)}
        className="cursor-pointer select-none py-2 pr-3 font-medium hover:text-white"
      >
        {label}
        {sortKey === col && <span className="ml-1 text-[#03C75A]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
      </th>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-white">
            🔎 오토바이 전체 키워드 탐색
            <span className="ml-2 text-sm font-normal text-slate-400">네이버 광고 API 연관어 전수 조회</span>
          </h2>
          {!open && (
            <p className="mt-0.5 text-xs text-slate-500">
              씨앗: {DEFAULT_SEEDS.join(' · ')} → 관련 키워드 수백 개를 검색수 순으로 표시
            </p>
          )}
        </div>
        {!open ? (
          <button
            onClick={handleOpen}
            className="rounded-xl bg-[#03C75A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#02b350] transition"
          >
            전체 키워드 불러오기
          </button>
        ) : (
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            접기 ▲
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent" />
              키워드 수집 중... (씨앗 6개 → 연관 키워드 전수 조회)
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 py-4">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={load} className="text-xs text-[#03C75A] hover:underline">다시 시도</button>
            </div>
          )}
          {data && data.keywords.length === 0 && !loading && (
            <div className="flex items-center gap-3 py-4">
              <p className="text-sm text-amber-400">키워드 결과가 없습니다. 광고 API 응답이 비어있습니다.</p>
              <button onClick={load} className="text-xs text-[#03C75A] hover:underline">다시 불러오기</button>
            </div>
          )}
          {data && data.keywords.length > 0 && (
            <>
              <div className="mb-3 flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  value={filter}
                  onChange={e => { setFilter(e.target.value); setPage(1) }}
                  placeholder="키워드 필터..."
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#03C75A]/50"
                />
                <span className="text-xs text-slate-500">
                  총 <b className="text-white">{rows.length}</b>개 키워드
                  {filter && ` (전체 ${data.total}개 중 필터)`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                      <th className="py-2 pr-3 font-medium w-8">#</th>
                      <SortTh col="keyword" label="키워드" />
                      <SortTh col="total" label="월간 검색수" />
                      <SortTh col="pc" label="PC" />
                      <SortTh col="mobile" label="모바일" />
                      <SortTh col="compIdx" label="경쟁강도" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={r.keyword} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 pr-3 text-slate-500 text-xs">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="py-2 pr-3 font-medium text-white">{r.keyword}</td>
                        <td className="py-2 pr-3 font-semibold text-white">
                          {r.total >= 10 ? r.total.toLocaleString() : '<10'}
                        </td>
                        <td className="py-2 pr-3 text-xs text-slate-400">
                          {r.pc >= 10 ? r.pc.toLocaleString() : '<10'}
                        </td>
                        <td className="py-2 pr-3 text-xs text-slate-400">
                          {r.mobile >= 10 ? r.mobile.toLocaleString() : '<10'}
                        </td>
                        <td className="py-2 pr-3">
                          {r.compIdx ? (
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${COMP_STYLES[r.compIdx] ?? 'bg-slate-500/20 text-slate-300'}`}>
                              {r.compIdx}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg px-3 py-1 text-xs text-slate-400 hover:bg-white/10 disabled:opacity-30"
                  >
                    ← 이전
                  </button>
                  <span className="text-xs text-slate-400">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg px-3 py-1 text-xs text-slate-400 hover:bg-white/10 disabled:opacity-30"
                  >
                    다음 →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
