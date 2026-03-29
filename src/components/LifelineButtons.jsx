export default function LifelineButtons({ lifelines, onUse, disabled }) {
  const buttons = [
    { key: 'fiftyFifty', label: '50:50', icon: '✂️' },
    { key: 'doubleChoice', label: '2x', icon: '🔁' },
    { key: 'swapQuestion', label: 'Swap', icon: '🔄' },
  ];

  return (
    <div className="lifelines">
      {buttons.map(btn => (
        <button
          key={btn.key}
          className={`lifeline-btn ${lifelines[btn.key] ? 'used' : ''}`}
          onClick={() => onUse(btn.key)}
          disabled={lifelines[btn.key] || disabled}
          title={btn.label}
        >
          {btn.label} {btn.icon}
        </button>
      ))}
    </div>
  );
}
