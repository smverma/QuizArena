export default function CategoryCard({ category, progress, onClick }) {
  const unlockedLevel = progress ? progress.level : 1;
  return (
    <div className="category-card" onClick={onClick}>
      <div className="category-icon">{category.icon}</div>
      <div className="category-name">{category.name}</div>
      <div className="category-progress">Level {unlockedLevel}/10</div>
      <div className="progress-dots">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`dot ${i < unlockedLevel ? 'completed' : ''}`} />
        ))}
      </div>
    </div>
  );
}
