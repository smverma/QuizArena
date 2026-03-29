export default function CategoryCard({ category, progress, onClick }) {
  const completedLevel = progress ? progress.level : 1;
  return (
    <div className="category-card" onClick={onClick}>
      <div className="category-icon">{category.icon}</div>
      <div className="category-name">{category.name}</div>
      <div className="category-progress">Level {completedLevel}/10</div>
      <div className="progress-dots">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`dot ${i < completedLevel ? 'completed' : ''}`} />
        ))}
      </div>
    </div>
  );
}
