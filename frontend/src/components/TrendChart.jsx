// 섹션 1: 검색어 트렌드 차트 (Recharts 꺾은선) — 기간 토글: 1개월/3개월/1년
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { SourceBadge, Spinner } from './Status.jsx'

export const TREND_PERIODS = [
  { key: '1m', label: '1개월', days: 30, timeUnit: 'date' },
  { key: '3m', label: '3개월', days: 90, timeUnit: 'date' },
  { key: '1y', label: '1년', days: 365, timeUnit: 'month' },
]

// 축 레이블: 일 단위 'M.D', 월 단위 'YY.M'
function tickLabel(d, timeUnit) {
  const [y, m, day] = d.split('-')
  return timeUnit === 'month' ? `${y.slice(2)}.${Number(m)}` : `${Number(m)}.${Number(day)}`
}

function TrendTooltip({ active, payload, label, timeUnit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#16213e] px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-400">{timeUnit === 'month' ? label.slice(0, 7) : label}</p>
      <p className="font-bold text-[#03C75A]">검색량 지수 {Number(payload[0].value).toFixed(1)}</p>
    </div>
  )
}

export default function TrendChart({ data, period, onPeriodChange, loading }) {
  const timeUnit = data?.timeUnit ?? 'date'
  const interval = timeUnit === 'month' ? 0 : Math.max(Math.floor((data?.series.length ?? 30) / 7), 1)

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-white">
          📈 검색어 트렌드 <span className="ml-1 text-sm font-normal text-slate-400">"{data?.keyword}"</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* 기간 토글 */}
          <div className="flex rounded-lg bg-white/10 p-0.5">
            {TREND_PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => onPeriodChange(p.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  period === p.key ? 'bg-[#03C75A] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {data && <SourceBadge source={data.source} />}
        </div>
      </div>
      <div className="h-64">
        {loading || !data ? (
          <Spinner label="트렌드 불러오는 중..." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date" tickFormatter={(d) => tickLabel(d, timeUnit)} interval={interval}
                tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltip timeUnit={timeUnit} />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <Line
                type="monotone" dataKey="value" stroke="#03C75A" strokeWidth={2.5}
                dot={false} activeDot={{ r: 5, fill: '#03C75A' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
