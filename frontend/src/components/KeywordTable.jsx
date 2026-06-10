// 섹션 2: 인기 검색어 순위표 — 순위/검색어/월간검색수(PC+모바일)/전월 대비 증감
import { SourceBadge } from './Status.jsx'

function Change({ pct }) {
  if (pct > 0) return <span className="font-medium text-red-400">▲ {pct.toFixed(1)}%</span>
  if (pct < 0) return <span className="font-medium text-blue-400">▼ {Math.abs(pct).toFixed(1)}%</span>
  return <span className="text-slate-500">— 0.0%</span>
}

// 절대 검색수 표시 — PC/모바일 분리 툴팁 포함
function SearchCount({ row, maxVol }) {
  const hasAbsolute = row.monthlyTotal != null
  const displayVal = hasAbsolute ? row.monthlyTotal : row.volumeIndex
  const barPct = (displayVal / maxVol) * 100

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-[72px] text-right">
        {hasAbsolute ? (
          <span className="font-medium text-white" title={`PC: ${row.monthlyPc?.toLocaleString()} / 모바일: ${row.monthlyMobile?.toLocaleString()}`}>
            {row.monthlyTotal.toLocaleString()}
          </span>
        ) : (
          <span className="text-slate-400">{row.volumeIndex.toLocaleString()}</span>
        )}
      </div>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#03C75A]" style={{ width: `${barPct}%` }} />
      </div>
    </div>
  )
}

export default function KeywordTable({ data }) {
  const rows = data.keywords.slice(0, 20)
  const hasAbsolute = rows.some((r) => r.monthlyTotal != null)
  const maxVol = Math.max(...rows.map((r) => (hasAbsolute ? r.monthlyTotal ?? 0 : r.volumeIndex)), 1)

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-white">
          🔍 인기 검색어 순위 <span className="ml-1 text-sm font-normal text-slate-400">최근 30일</span>
        </h2>
        <div className="flex items-center gap-2">
          {hasAbsolute && (
            <span className="rounded-full bg-[#03C75A]/15 px-2.5 py-0.5 text-xs font-medium text-[#03C75A]">
              월간 검색수
            </span>
          )}
          <SourceBadge source={data.source} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-400">
              <th className="py-2 pr-3 font-medium w-8">순위</th>
              <th className="py-2 pr-3 font-medium">검색어</th>
              <th className="py-2 pr-3 font-medium">
                {hasAbsolute ? '월간 검색수 (PC+모바일)' : '검색량 지수(월간)'}
              </th>
              {hasAbsolute && (
                <>
                  <th className="py-2 pr-3 font-medium text-slate-500">PC</th>
                  <th className="py-2 pr-3 font-medium text-slate-500">모바일</th>
                </>
              )}
              <th className="py-2 font-medium">전월 대비</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.keyword} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2.5 pr-3 font-bold text-slate-300">{r.rank}</td>
                <td className="py-2.5 pr-3 font-medium text-white">{r.keyword}</td>
                <td className="py-2.5 pr-3">
                  <SearchCount row={r} maxVol={maxVol} />
                </td>
                {hasAbsolute && (
                  <>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">
                      {r.monthlyPc != null ? r.monthlyPc.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">
                      {r.monthlyMobile != null ? r.monthlyMobile.toLocaleString() : '—'}
                    </td>
                  </>
                )}
                <td className="py-2.5"><Change pct={r.changePct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.note && <p className="mt-3 text-xs text-slate-500">ℹ️ {data.note}</p>}
      {hasAbsolute && (
        <p className="mt-2 text-xs text-slate-600">
          ℹ️ 월간 검색수 출처: 네이버 검색광고 API — 10 미만은 &lt;10으로 표시될 수 있습니다.
        </p>
      )}
    </section>
  )
}
