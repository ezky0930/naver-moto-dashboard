// 연관 키워드 칩 — 클릭하면 대시보드 전체(트렌드/통계/판매 순위)가 해당 키워드로 전환
const RELATED_KEYWORDS = [
  '오토바이헬멧',
  '오토바이반모헬멧',
  '여름용오토바이헬멧',
  '초경량오토바이헬멧',
  '어린이오토바이헬멧',
  '경량오토바이헬멧',
  '홍진오토바이헬멧',
  '풀페이스헬멧',
  '오픈페이스헬멧',
]

export default function KeywordChips({ keyword, onSelect, disabled }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="shrink-0 text-xs text-slate-500">연관</span>
      {RELATED_KEYWORDS.map((k) => (
        <button
          key={k}
          disabled={disabled}
          onClick={() => onSelect(k)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
            keyword === k
              ? 'bg-[#03C75A] text-white'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  )
}
