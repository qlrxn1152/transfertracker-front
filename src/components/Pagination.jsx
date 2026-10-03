export default function Pagination({ page, hasPrevious, hasNext, loading, onPage }) {
  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        type="button"
        disabled={loading || !hasPrevious}
        onClick={() => onPage(page - 1)}
      >
        ← 이전
      </button>
      <span role="status">{loading ? '불러오는 중…' : `${page + 1} 페이지`}</span>
      <button
        type="button"
        disabled={loading || !hasNext}
        onClick={() => onPage(page + 1)}
      >
        다음 →
      </button>
    </nav>
  );
}
