// 섹션 4: 요약 카드 (상단 고정)
// 총 상품수(전체/해외) / 평균가 / 최다 브랜드 / 업데이트 시각 + 새로고침 (SellerLife 참고)

function Card({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs text-slate-400">{icon} {label}</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
      {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function SummaryCards({ items, stats, lastUpdated, onRefresh, refreshing }) {
  const avgPrice = items.length
    ? Math.round(items.reduce((s, it) => s + it.price, 0) / items.length)
    : 0

  // 최다 판매(수집) 브랜드 집계
  const brandCount = {}
  for (const it of items) {
    const b = it.brand || '기타'
    brandCount[b] = (brandCount[b] || 0) + 1
  }
  const topBrand = Object.entries(brandCount).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <Card
        icon="📦" label="총 상품수"
        value={stats ? `${stats.total.toLocaleString()}개` : '—'}
        sub={`상위 ${items.length}개 수집·분석`}
      />
      <Card
        icon="🌏" label="해외 상품수"
        value={stats ? `${stats.overseasTotal.toLocaleString()}개` : '—'}
        sub={stats ? `전체의 ${stats.overseasRatio}% (국내 ${(100 - stats.overseasRatio).toFixed(1)}%)` : undefined}
      />
      <Card icon="💰" label={`평균 판매가 (Top ${items.length})`} value={`${avgPrice.toLocaleString()}원`} />
      <Card icon="🏆" label="최다 판매 브랜드" value={topBrand ? topBrand[0] : '—'} sub={topBrand ? `${topBrand[1]}개 상품` : undefined} />
      <Card icon="🕐" label="마지막 업데이트" value={lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR') : '—'} sub={lastUpdated?.toLocaleDateString('ko-KR')} />
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#02b050] disabled:opacity-50"
      >
        <span className={refreshing ? 'inline-block animate-spin' : ''}>🔄</span>
        {refreshing ? '갱신 중...' : '새로고침'}
      </button>
    </div>
  )
}
