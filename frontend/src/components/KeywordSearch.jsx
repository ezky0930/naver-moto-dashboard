// 직접 키워드 검색 — 월간 검색수 + 전월 대비 + 경쟁강도 즉시 조회
import { useState } from 'react'
import { fetchKeywordVolumes } from '../api/client.js'

const COMP_STYLES = {
  '낮음': 'bg-green-500/20 text-green-300',
  '중간': 'bg-amber-500/20 text-amber-300',
  '높음': 'bg-red-500/20 text-red-300',
}

function Change({ pct }) {
  if (pct == null) return null
  if (pct > 0) return <span className="font-semibold text-red-400">▲ {pct.toFixed(1)}%</span>
  if (pct < 0) return <span className="font-semibold text-blue-400">▼ {Math.abs(pct).toFixed(1)}%</span>
  return <span className="text-slate-500">— 0.0%</span>
}

export default function KeywordSearch({ onSearch }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    const kw = input.trim()
    if (!kw) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fetchKeywordVolumes([kw])
      const row = data.keywords?.[0]
      setResult(row ?? null)
      if (!row) setError('검색 결과가 없습니다.')
      onSearch?.(kw)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hasAbsolute = result?.monthlyTotal != null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="키워드 직접 검색 (예: 오토바이장갑)"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#03C75A]/60 focus:ring-1 focus:ring-[#03C75A]/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-[#03C75A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#02b350] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '조회 중...' : '검색'}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {result && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="font-bold text-white text-sm">{result.keyword}</span>

          {/* 월간 검색수 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">월간 검색수</span>
            {hasAbsolute ? (
              <span className="text-sm font-semibold text-white">
                {result.monthlyTotal.toLocaleString()}
                <span className="ml-1 text-[10px] text-slate-400">
                  (PC {result.monthlyPc?.toLocaleString()} / 모바일 {result.monthlyMobile?.toLocaleString()})
                </span>
              </span>
            ) : (
              <span className="text-sm text-slate-400">지수 {result.volumeIndex?.toLocaleString()}</span>
            )}
          </div>

          {/* 전월 대비 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">전월 대비</span>
            <Change pct={result.changePct} />
          </div>

          {/* 경쟁강도 */}
          {result.compIdx && (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">경쟁강도</span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium w-fit ${COMP_STYLES[result.compIdx] ?? 'bg-slate-500/20 text-slate-300'}`}>
                {result.compIdx}
              </span>
            </div>
          )}

          {/* 트렌드 차트로 이동 안내 */}
          <button
            onClick={() => onSearch?.(result.keyword)}
            className="ml-auto text-xs text-[#03C75A] hover:underline"
          >
            트렌드 차트로 보기 →
          </button>

          {!hasAbsolute && (
            <p className="w-full text-[10px] text-slate-500">
              ℹ️ 지수는 해당 키워드의 최근 60일 내 상대값입니다. 다른 키워드와 직접 비교할 수 없으며, 전월 대비 증감이 더 정확한 지표입니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
