// 로딩 스피너 / 에러 박스 공통 컴포넌트

export function Spinner({ label = '불러오는 중...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-[#03C75A]" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <p className="text-sm text-red-400">⚠️ {message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-slate-600 px-4 py-1.5 text-sm text-slate-300 hover:border-[#03C75A] hover:text-[#03C75A]"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

// mock/실데이터 출처 배지
export function SourceBadge({ source }) {
  if (source === 'naver') {
    return <span className="rounded-full bg-[#03C75A]/15 px-2 py-0.5 text-xs font-medium text-[#03C75A]">네이버 실데이터</span>
  }
  return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">mock 데이터</span>
}
