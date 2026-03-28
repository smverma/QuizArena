export default function ProgressBar({ current, total }) {
  const percentage = (current / total) * 100;
  return (
    <div className="progress-container">
      <div className="progress-text">{current}/{total}</div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
