import { useEffect, useState } from 'react';

const COLORS = ['#e8a33d', '#3ddbd9', '#6bcf9a', '#f2f0ea', '#e2685f'];

function generatePieces(count) {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.4,
    color: COLORS[i % COLORS.length],
    width: 5 + Math.random() * 7,
    height: 8 + Math.random() * 9,
    rotate: Math.round(Math.random() * 360),
  }));
}

/**
 * Shown once on load: a friendly "you're in" moment before handing off to
 * the real chat + Toll Ledger interface. Purely CSS/JS confetti, no
 * external library or image assets required.
 *
 * Duration: ~32.4s before the card starts fading, fully gone by ~32.9s.
 */
export default function WelcomeSplash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const [pieces] = useState(() => generatePieces(110));

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), 5000);
    const doneTimer = setTimeout(() => onDone?.(), 5500);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`welcome-splash${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="welcome-confetti" aria-hidden="true">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="welcome-confetti__piece"
            style={{
              left: `${p.left}%`,
              backgroundColor: p.color,
              width: p.width,
              height: p.height,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <div className="welcome-card">
        <div className="welcome-badge">&#10003;</div>
        <h1>
          Karibu to <span>Passage</span>
        </h1>
        <p>
          The AI trade agent that pays other agents for you, and settles with you in mobile
          money &mdash; not crypto.
        </p>
        <div className="welcome-loading">
          <span className="welcome-loading__dot" />
          <span className="welcome-loading__dot" />
          <span className="welcome-loading__dot" />
          Setting up your session
        </div>
      </div>
    </div>
  );
}