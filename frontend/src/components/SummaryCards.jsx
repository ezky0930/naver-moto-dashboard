// 섹션 4: 요약 카드 (상단 고정) — 클릭 시 상세 팝오버 표시
import { useState } from 'react'

// ── 상세 팝오버 ──────────────────────────────────────────────────────────────
function Popover({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#1a1a2e] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="max-h-80 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// 막대 그래프 행
function BarRow({ label, value, max, sub, color = '#03C75A' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-slate-300 truncate max-w-[160px]">{label}</span>
        <span className="text-white font-semibold ml-2 shrink-0">{sub ?? value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── 카드 컴포넌트 ────────────────────────────────────────────────────────────
function Card({ icon, label, value, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-white/10 bg-white/5 px-4 py-3 ${onClick ? 'cursor-pointer hover:bg-white/10 hover:border-[#03C75A]/40 transition' : ''}`}
    >
      <p className="text-xs text-slate-400">{icon} {label}</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
      {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
      {onClick && <p className="text-[10px] text-[#03C75A] mt-0.5">클릭하여 자세히 보기</p>}
    </div>
  )
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export default function SummaryCards({ items, stats, lastUpdated, onRefresh, refreshing }) {
  const [popup, setPopup] = useState(null)

  const avgPrice = items.length
    ? Math.round(items.reduce((s, it) => s + it.price, 0) / items.length)
    : 0

  // 브랜드 집계
  const brandCount = {}
  for (const it of items) {
    const b = it.brand || '기타'
    brandCount[b] = (brandCount[b] || 0) + 1
  }
  const brandList = Object.entries(brandCount).sort((a, b) => b[1] - a[1])
  const topBrand = brandList[0]

  // 가격 분포
  const priceBuckets = [
    { label: '~3만원', test: p => p < 30000 },
    { label: '3~5만원', test: p => p >= 30000 && p < 50000 },
    { label: '5~10만원', test: p => p >= 50000 && p < 100000 },
    { label: '10~20만원', test: p => p >= 100000 && p < 200000 },
    { label: '20만원~', test: p => p >= 200000 },
  ].map(b => ({ ...b, count: items.filter(it => b.test(it.price)).length }))

  const minPrice = items.length ? Math.min(...items.map(i => i.price)) : 0
  const maxPrice = items.length ? Math.max(...items.map(i => i.price)) : 0

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {/* 총 상품수 */}
        <Card
          icon="📦" label="총 상품수"
          value={stats ? `${stats.total.toLocaleString()}개` : '—'}
          sub={`상위 ${items.length}개 수집·분석`}
          onClick={stats ? () => setPopup('total') : undefined}
        />
        {/* 해외 상품수 */}
        <Card
          icon="🌏" label="해외 상품수"
          value={stats ? `${stats.overseasTotal.toLocaleString()}개` : '—'}
          sub={stats ? `전체의 ${stats.overseasRatio}% (국내 ${(100 - stats.overseasRatio).toFixed(1)}%)` : undefined}
          onClick={stats ? () => setPopup('overseas') : undefined}
        />
        {/* 평균 판매가 */}
        <Card
          icon="💰" label={`평균 판매가 (Top ${items.length})`}
          value={`${avgPrice.toLocaleString()}원`}
          onClick={items.length ? () => setPopup('price') : undefined}
        />
        {/* 최다 판매 브랜드 */}
        <Card
          icon="🏆" label="최다 판매 브랜드"
          value={topBrand ? topBrand[0] : '—'}
          sub={topBrand ? `${topBrand[1]}개 상품` : undefined}
          onClick={brandList.length ? () => setPopup('brand') : undefined}
        />
        {/* 업데이트 시각 */}
        <Card
          icon="🕐" label="마지막 업데이트"
          value={lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR') : '—'}
          sub={lastUpdated?.toLocaleDateString('ko-KR')}
        />
        {/* 새로고침 버튼 */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#02b050] disabled:opacity-50"
        >
          <span className={refreshing ? 'inline-block animate-spin' : ''}>🔄</span>
          {refreshing ? '갱신 중...' : '새로고침'}
        </button>
      </div>

      {/* 브랜드 상세 */}
      {popup === 'brand' && (
        <Popover title={`브랜드별 상품 수 (상위 ${items.length}개 기준)`} onClose={() => setPopup(null)}>
          {brandList.map(([brand, cnt]) => (
            <BarRow key={brand} label={brand} value={cnt} max={brandList[0][1]}
              sub={`${cnt}개 (${Math.round(cnt / items.length * 100)}%)`} />
          ))}
        </Popover>
      )}

      {/* 가격 분포 상세 */}
      {popup === 'price' && (
        <Popover title={`가격 분포 (상위 ${items.length}개 기준)`} onClose={() => setPopup(null)}>
          <div className="mb-3 flex gap-4 text-xs text-slate-400">
            <span>최저 <b className="text-white">{minPrice.toLocaleString()}원</b></span>
            <span>평균 <b className="text-white">{avgPrice.toLocaleString()}원</b></span>
            <span>최고 <b className="text-white">{maxPrice.toLocaleString()}원</b></span>
          </div>
          {priceBuckets.map(b => (
            <BarRow key={b.label} label={b.label} value={b.count}
              max={Math.max(...priceBuckets.map(x => x.count))}
              sub={`${b.count}개 (${Math.round(b.count / items.length * 100)}%)`}
              color="#6366f1"
            />
          ))}
        </Popover>
      )}

      {/* 해외/국내 상세 */}
      {popup === 'overseas' && stats && (
        <Popover title="국내 / 해외 상품 비율" onClose={() => setPopup(null)}>
          <BarRow label="국내 상품" value={stats.domesticTotal}
            max={stats.total} sub={`${stats.domesticTotal.toLocaleString()}개 (${(100 - stats.overseasRatio).toFixed(1)}%)`}
            color="#03C75A" />
          <BarRow label="해외 상품" value={stats.overseasTotal}
            max={stats.total} sub={`${stats.overseasTotal.toLocaleString()}개 (${stats.overseasRatio}%)`}
            color="#f59e0b" />
          <p className="mt-3 text-xs text-slate-500">전체 {stats.total.toLocaleString()}개 기준 (중고·렌탈 제외)</p>
        </Popover>
      )}

      {/* 총 상품수 상세 (카테고리 분포) */}
      {popup === 'total' && stats && (
        <Popover title="카테고리 분포 (상위 30개 기준)" onClose={() => setPopup(null)}>
          {stats.categoryDist?.length ? (
            stats.categoryDist.map(c => (
              <BarRow key={c.path} label={c.path || '기타'} value={c.count}
                max={stats.categoryDist[0].count}
                sub={`${c.count}개 (${c.pct}%)`} />
            ))
          ) : (
            <p className="text-xs text-slate-500">카테고리 정보 없음</p>
          )}
          <p className="mt-3 text-xs text-slate-500">전체 시장 {stats.total.toLocaleString()}개</p>
        </Popover>
      )}
    </>
  )
}
