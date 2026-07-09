// PATH: frontend/src/components/build/GeneratingOverlay.jsx
import React, { useEffect, useState } from 'react';

const STEPS = [
  'Designing architecture...',
  'Writing components...',
  'Scaffolding backend...',
  'Wiring database models...',
  'Generating README...',
  'Validating structure...'
];

export default function GeneratingOverlay() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx(i => (i + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-mono text-white/70 animate-pulse">{STEPS[stepIdx]}</p>
    </div>
  );
}
