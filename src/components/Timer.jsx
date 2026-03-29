import { useEffect, useRef } from 'react';
import { soundManager } from '../utils/soundManager';

export default function Timer({ timeLeft, maxTime = 15 }) {
  const prevTimeRef = useRef(timeLeft);

  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && timeLeft !== prevTimeRef.current) {
      soundManager.tick();
    }
    prevTimeRef.current = timeLeft;
  }, [timeLeft]);

  const percentage = (timeLeft / maxTime) * 100;
  const isWarning = timeLeft <= 5;

  return (
    <div className="timer-container">
      <div className={`timer-display ${isWarning ? 'warning' : ''}`}>
        {timeLeft}s
      </div>
      <div className="timer-bar-bg">
        <div
          className={`timer-bar ${isWarning ? 'warning' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
