export default function LoadingPlaceholder({ label = '콘텐츠를 불러오는 중입니다.', count = 4 }) {
  return (
    <section className="loading-placeholder" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="loading-placeholder-head">
        <i />
        <i />
      </div>
      <div className="loading-placeholder-list">
        {Array.from({ length: count }, (_, index) => (
          <div className="loading-placeholder-row" key={index} aria-hidden="true">
            <i />
            <span><b /><b /><b /></span>
            <em />
          </div>
        ))}
      </div>
      <p>{label}</p>
    </section>
  );
}
