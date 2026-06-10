// 섹션 3 (핵심): 헬멧 판매 순위표
//  - 컬럼 클릭 정렬 / 브랜드(전체·국내·수입) 필터 / 가격대 필터 / 상위 30개
import { useMemo, useState } from 'react'
import { SourceBadge } from './Status.jsx'

// 수입 브랜드 분류표 (검색 API는 원산지를 안 주므로 브랜드명으로 분류)
const IMPORTED_BRANDS = [
  'shoei', '쇼에이', 'arai', '아라이', 'agv', 'shark', '샤크', 'ls2',
  'ogk', '카부토', 'jpx', 'sol', 'bell', '벨', 'nolan', '놀란', 'x-lite',
  'scorpion', '스콜피온', 'airoh', '아이로', 'caberg', '카버그',
]
function getOrigin(item) {
  if (item.origin) return item.origin // mock 데이터는 origin 포함
  const b = (item.brand || '').toLowerCase()
  if (!b) return '국내'
  return IMPORTED_BRANDS.some((ib) => b.includes(ib)) ? '수입' : '국내'
}

const PRICE_FILTERS = [
  { key: 'all', label: '전체', test: () => true },
  { key: 'under5', label: '~5만원', test: (p) => p < 50000 },
  { key: '5to10', label: '5~10만원', test: (p) => p >= 50000 && p < 100000 },
  { key: 'over10', label: '10만원~', test: (p) => p >= 100000 },
]

const COLUMNS = [
  { key: 'rank', label: '순위', sortable: true },
  { key: 'title', label: '상품명', sortable: false },
  { key: 'brand', label: '브랜드', sortable: false },
  { key: 'price', label: '가격', sortable: true },
  { key: 'reviewCount', label: '리뷰수', sortable: true },
  { key: 'purchaseCount', label: '판매건수(추정)', sortable: true },
  { key: 'link', label: '링크', sortable: false },
]

function FilterButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'bg-[#03C75A] text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}

// 어제 대비 순위 변동 뱃지 (change > 0 = 상승)
function RankChange({ change }) {
  if (change === undefined) return null // 히스토리 데이터 없음
  if (change === null) return <span className="ml-1 text-[10px] font-medium text-amber-400">NEW</span>
  if (change > 0) return <span className="ml-1 text-[10px] font-medium text-red-400">▲{change}</span>
  if (change < 0) return <span className="ml-1 text-[10px] font-medium text-blue-400">▼{Math.abs(change)}</span>
  return <span className="ml-1 text-[10px] text-slate-600">-</span>
}

export default function ProductTable({ data, stats, rankChanges, crawlPending }) {
  // productId → 어제 대비 순위 변동
  const changeMap = useMemo(() => {
    if (!rankChanges?.available) return null
    return new Map(rankChanges.items.map((it) => [it.productId, it.change]))
  }, [rankChanges])
  const [brandFilter, setBrandFilter] = useState('전체')
  const [priceFilter, setPriceFilter] = useState('all')
  // 기본 정렬: 판매건수 내림차순 (데이터 없으면 원래 순위 유지)
  const [sortKey, setSortKey] = useState('purchaseCount')
  const [sortDir, setSortDir] = useState('desc')

  function clickColumn(col) {
    if (!col.sortable) return
    if (sortKey === col.key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(col.key)
      setSortDir(col.key === 'rank' ? 'asc' : 'desc')
    }
  }

  const rows = useMemo(() => {
    const priceTest = PRICE_FILTERS.find((f) => f.key === priceFilter).test
    let list = data.items
      .filter((it) => brandFilter === '전체' || getOrigin(it) === brandFilter)
      .filter((it) => priceTest(it.price))
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? -1
      const bv = b[sortKey] ?? -1
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return list.slice(0, 30)
  }, [data.items, brandFilter, priceFilter, sortKey, sortDir])

  const hasReviewData = data.items.some((it) => it.reviewCount != null)

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-white">
          ⭐ 헬멧 판매 순위 <span className="ml-1 text-sm font-normal text-slate-400">"{data.keyword}" 상위 {rows.length}개</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* 카테고리 분포 (수집 상품 기준) */}
          {stats?.categoryDist?.[0] && (
            <span className="hidden rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-400 md:inline">
              {stats.categoryDist[0].path} <b className="text-[#03C75A]">{stats.categoryDist[0].pct}%</b>
            </span>
          )}
          {/* 리뷰 크롤 진행 중 표시 */}
          {crawlPending > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              리뷰 수집 중 ({crawlPending}개)
            </span>
          )}
          <SourceBadge source={data.source} />
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">브랜드</span>
          {['전체', '국내', '수입'].map((b) => (
            <FilterButton key={b} active={brandFilter === b} onClick={() => setBrandFilter(b)}>{b}</FilterButton>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">가격대</span>
          {PRICE_FILTERS.map((f) => (
            <FilterButton key={f.key} active={priceFilter === f.key} onClick={() => setPriceFilter(f.key)}>{f.label}</FilterButton>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-400">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => clickColumn(col)}
                  className={`py-2 pr-3 font-medium ${col.sortable ? 'cursor-pointer select-none hover:text-white' : ''}`}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="ml-1 text-[#03C75A]">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <tr key={it.productId} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2.5 pr-3 font-bold text-slate-300">
                  {it.rank}
                  {changeMap && <RankChange change={changeMap.get(it.productId)} />}
                </td>
                <td className="max-w-[320px] truncate py-2.5 pr-3 font-medium text-white" title={it.title}>{it.title}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-slate-300">{it.brand || '—'}</span>
                  <span className={`ml-1.5 rounded px-1 py-0.5 text-[10px] ${getOrigin(it) === '수입' ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'}`}>
                    {getOrigin(it)}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-slate-200">{it.price.toLocaleString()}원</td>
                <td className="py-2.5 pr-3 text-slate-300">{it.reviewCount != null ? it.reviewCount.toLocaleString() : '—'}</td>
                <td className="py-2.5 pr-3 text-slate-300">{it.purchaseCount != null ? it.purchaseCount.toLocaleString() : '—'}</td>
                <td className="py-2.5">
                  <a
                    href={it.link} target="_blank" rel="noreferrer"
                    className="rounded-lg bg-[#03C75A]/15 px-2.5 py-1 text-xs font-medium text-[#03C75A] hover:bg-[#03C75A]/30"
                  >
                    스토어 ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasReviewData && (
        <p className="mt-3 text-xs text-slate-500">
          ℹ️ 리뷰수·판매건수는 네이버 검색 API가 제공하지 않아 4단계(크롤링 보조)에서 수집됩니다.
        </p>
      )}
      {data.note && <p className="mt-1 text-xs text-slate-500">ℹ️ {data.note}</p>}
    </section>
  )
}
