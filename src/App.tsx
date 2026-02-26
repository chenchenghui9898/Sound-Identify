import { motion } from "motion/react";
import { Music, Volume2, Target, Trophy } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const WHITE_KEYS = [
  "C4", "D4", "E4", "F4", "G4", "A4", "B4",
  "C5", "D5", "E5", "F5", "G5", "A5", "B5"
];

const BLACK_KEYS = [
  { note: "C#4", after: "C4" },
  { note: "D#4", after: "D4" },
  { note: "F#4", after: "F4" },
  { note: "G#4", after: "G4" },
  { note: "A#4", after: "A4" },
  { note: "C#5", after: "C5" },
  { note: "D#5", after: "D5" },
  { note: "F#5", after: "F5" },
  { note: "G#5", after: "G5" },
  { note: "A#5", after: "A5" }
];

const NOTE_FREQUENCIES: Record<string, number> = {
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77
};

export default function App() {
  const audioCtx = useRef<AudioContext | null>(null);
  const activeOscillators = useRef<Record<string, { osc: OscillatorNode; gain: GainNode }>>({});
  const startTimeRef = useRef<Record<string, number>>({});
  
  const [target] = useState({ pitch: "C4", duration: 0.5 });
  const [lastResult, setLastResult] = useState<{ score: number; evaluation: string } | null>(null);

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    window.addEventListener('mousedown', initAudio);
    window.addEventListener('touchstart', initAudio);
    return () => {
      window.removeEventListener('mousedown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const calculateScore = (targetPitch: string, targetDuration: number, actualPitch: string, actualDuration: number) => {
    const pitchScore = actualPitch === targetPitch ? 100 : 0;
    const durationScore = Math.max(0, 100 * (1 - Math.abs(actualDuration - targetDuration) / targetDuration));
    const totalScore = Math.round(pitchScore * 0.6 + durationScore * 0.4);

    let evaluation = "";
    if (totalScore >= 90) evaluation = "完美！";
    else if (totalScore >= 70) evaluation = "不错！";
    else evaluation = "再试试";

    return { totalScore, evaluation };
  };

  const playNote = (note: string) => {
    if (!audioCtx.current) return;
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }

    if (activeOscillators.current[note]) {
      stopNote(note);
    }

    // Record start time
    startTimeRef.current[note] = performance.now();

    const freq = NOTE_FREQUENCIES[note];
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);

    const now = audioCtx.current.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 1.5);

    osc.connect(gain);
    gain.connect(audioCtx.current.destination);

    osc.start();
    activeOscillators.current[note] = { osc, gain };
  };

  const stopNote = (note: string) => {
    const active = activeOscillators.current[note];
    const startTime = startTimeRef.current[note];

    if (active && audioCtx.current && startTime) {
      const endTime = performance.now();
      const actualDuration = (endTime - startTime) / 1000;
      
      const { osc, gain } = active;
      const now = audioCtx.current.currentTime;
      
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.stop(now + 0.35);
      delete activeOscillators.current[note];
      delete startTimeRef.current[note];

      // Scoring logic
      const { totalScore, evaluation } = calculateScore(target.pitch, target.duration, note, actualDuration);
      
      console.log(`弹奏音高: ${note}`);
      console.log(`实际时长: ${actualDuration.toFixed(2)} 秒`);
      console.log(`目标时长: ${target.duration.toFixed(2)} 秒`);
      console.log(`得分: ${totalScore}分`);
      console.log(`评价: ${evaluation}`);

      setLastResult({ score: totalScore, evaluation });
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-8 font-sans select-none">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Music className="w-8 h-8 text-stone-800" />
          <h1 className="text-4xl font-light tracking-tight text-stone-900 uppercase">
            Ear <span className="font-bold">Trainer</span>
          </h1>
        </div>
        <p className="text-stone-500 text-sm tracking-widest uppercase flex items-center justify-center gap-2">
          <Volume2 className="w-3 h-3" /> Level 1 • Pitch & Timing
        </p>
      </div>

      {/* Target Display */}
      <div className="mb-10 w-full max-w-2xl bg-white p-8 rounded-3xl shadow-xl border border-stone-200 flex flex-col items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-stone-800"></div>
        <div className="flex items-center gap-3 text-stone-400 uppercase tracking-[0.2em] text-[10px] font-bold">
          <Target className="w-4 h-4" /> Current Mission
        </div>
        <div className="text-3xl md:text-4xl font-serif italic text-stone-800 text-center leading-tight">
          请弹奏 <span className="text-stone-900 font-bold not-italic underline decoration-stone-300 underline-offset-8">{target.pitch}</span> 音，并按住 <span className="text-stone-900 font-bold not-italic underline decoration-stone-300 underline-offset-8">{target.duration}</span> 秒
        </div>
        
        {lastResult && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={Date.now()}
            className="mt-4 flex items-center gap-6 pt-6 border-t border-stone-100 w-full justify-center"
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Last Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-stone-900">{lastResult.score}</span>
                <span className="text-xs text-stone-400">pts</span>
              </div>
            </div>
            <div className="h-8 w-px bg-stone-100"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Evaluation</span>
              <div className="flex items-center gap-2">
                <Trophy className={`w-4 h-4 ${lastResult.score >= 90 ? 'text-amber-500' : 'text-stone-300'}`} />
                <span className={`text-xl font-bold ${lastResult.score >= 90 ? 'text-amber-600' : 'text-stone-700'}`}>
                  {lastResult.evaluation}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="relative flex shadow-2xl rounded-b-lg overflow-hidden border-t-8 border-stone-800 bg-stone-800">
        {/* White Keys */}
        {WHITE_KEYS.map((note) => (
          <motion.button
            key={note}
            id={`key-${note}`}
            data-pitch={note}
            whileTap={{ scaleY: 0.98, backgroundColor: "#f3f4f6" }}
            onPointerDown={() => playNote(note)}
            onPointerUp={() => stopNote(note)}
            onPointerLeave={() => stopNote(note)}
            className="relative w-12 h-64 bg-white border-r border-stone-200 last:border-r-0 flex flex-col justify-end items-center pb-4 transition-colors hover:bg-stone-50 group active:z-20"
          >
            <span className="text-[10px] font-bold text-stone-300 group-hover:text-stone-500 transition-colors uppercase tracking-tighter">
              {note}
            </span>
          </motion.button>
        ))}

        {/* Black Keys */}
        {BLACK_KEYS.map((key) => {
          const whiteKeyIndex = WHITE_KEYS.indexOf(key.after);
          const leftPosition = (whiteKeyIndex + 1) * 48 - 16;

          return (
            <motion.button
              key={key.note}
              id={`key-${key.note}`}
              data-pitch={key.note}
              whileTap={{ height: "155px", backgroundColor: "#1a1a1a" }}
              onPointerDown={() => playNote(key.note)}
              onPointerUp={() => stopNote(key.note)}
              onPointerLeave={() => stopNote(key.note)}
              style={{ left: `${leftPosition}px` }}
              className="absolute top-0 w-8 h-40 bg-stone-900 rounded-b-md z-10 shadow-lg border-x border-stone-800 flex flex-col justify-end items-center pb-3 transition-colors hover:bg-stone-800 group active:z-30"
            >
              <span className="text-[8px] font-bold text-stone-600 group-hover:text-stone-400 transition-colors uppercase">
                {key.note}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">How to Play</h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Watch the mission above. Your goal is to match the exact pitch and duration. Precision is key!
          </p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Scoring</h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            60% of your score comes from hitting the right note. 40% comes from how close you were to the target duration.
          </p>
        </div>
      </div>
    </div>
  );
}
