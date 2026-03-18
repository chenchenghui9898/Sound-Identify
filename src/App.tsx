import { motion, AnimatePresence } from "motion/react";
import { Music, Volume2, Target, Trophy, Play, Pause, RotateCcw } from "lucide-react";
import { useRef, useEffect, useState, useMemo } from "react";

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

const LYRICS_DATA = [
  { "id": "00", "start": 0.151, "end": 0.568, "annotation": "风", "note": "F4", "duration": 0.417 },
  { "id": "01", "start": 0.576, "end": 0.927, "annotation": "从", "note": "G#4", "duration": 0.351 },
  { "id": "02", "start": 0.927, "end": 1.242, "annotation": "草", "note": "A#4", "duration": 0.315 },
  { "id": "03", "start": 1.250, "end": 1.623, "annotation": "原", "note": "C#5", "duration": 0.373 },
  { "id": "04", "start": 1.631, "end": 2.920, "annotation": "来", "note": "A#4", "duration": 1.289 },
  { "id": "05", "start": 2.928, "end": 3.279, "annotation": "吹", "note": "D#4", "duration": 0.351 },
  { "id": "06", "start": 3.287, "end": 3.660, "annotation": "动", "note": "F4", "duration": 0.373 },
  { "id": "07", "start": 3.668, "end": 4.019, "annotation": "我", "note": "G#4", "duration": 0.351 },
  { "id": "08", "start": 4.027, "end": 4.378, "annotation": "心", "note": "A#4", "duration": 0.350 },
  { "id": "09", "start": 4.386, "end": 4.737, "annotation": "怀", "note": "F4", "duration": 0.350 },
  { "id": "10", "start": 4.745, "end": 5.096, "annotation": "吹", "note": "F4", "duration": 0.350 },
  { "id": "11", "start": 5.104, "end": 5.456, "annotation": "来", "note": "A#4", "duration": 0.351 },
  { "id": "12", "start": 5.464, "end": 5.816, "annotation": "我", "note": "A#4", "duration": 0.351 },
  { "id": "13", "start": 5.824, "end": 6.176, "annotation": "的", "note": "C#5", "duration": 0.351 },
  { "id": "14", "start": 6.184, "end": 6.536, "annotation": "爱", "note": "D#4", "duration": 0.351 },
  { "id": "15", "start": 6.544, "end": 6.896, "annotation": "这", "note": "D#4", "duration": 0.351 },
  { "id": "16", "start": 6.904, "end": 7.256, "annotation": "花", "note": "D#4", "duration": 0.351 },
  { "id": "17", "start": 7.264, "end": 7.616, "annotation": "香", "note": "A#4", "duration": 0.351 },
  { "id": "18", "start": 7.624, "end": 7.976, "annotation": "的", "note": "G#4", "duration": 0.351 },
  { "id": "19", "start": 7.984, "end": 8.336, "annotation": "海", "note": "F4", "duration": 0.351 }
];

const LYRIC_LINES = [
  { text: "风从草原来 吹动我心怀", range: [0, 9] },
  { text: "吹来我的爱 这花香的海", range: [10, 19] }
];

export default function App() {
  const audioCtx = useRef<AudioContext | null>(null);
  const activeOscillators = useRef<Record<string, { osc: OscillatorNode; gain: GainNode }>>({});
  const startTimeRef = useRef<Record<string, number>>({});
  const songAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAssessmentMode, setIsAssessmentMode] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; evaluation: string } | null>(null);

  // Target for assessment: "怀" (index 9)
  const assessmentTarget = LYRICS_DATA[9];

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

      if (isAssessmentMode) {
        const { totalScore, evaluation } = calculateScore(
          assessmentTarget.note, 
          assessmentTarget.duration, 
          note, 
          actualDuration
        );
        
        console.log(`弹奏音高: ${note}`);
        console.log(`实际时长: ${actualDuration.toFixed(2)} 秒`);
        console.log(`目标时长: ${assessmentTarget.duration.toFixed(2)} 秒`);
        console.log(`得分: ${totalScore}分`);
        console.log(`评价: ${evaluation}`);

        setLastResult({ score: totalScore, evaluation });
      }
    }
  };

  const toggleSong = () => {
    if (!songAudioRef.current) return;
    if (isPlayingSong) {
      songAudioRef.current.pause();
    } else {
      setIsAssessmentMode(false);
      setLastResult(null);
      songAudioRef.current.play();
    }
    setIsPlayingSong(!isPlayingSong);
  };

  const resetSong = () => {
    if (!songAudioRef.current) return;
    songAudioRef.current.pause();
    songAudioRef.current.currentTime = 0;
    setIsPlayingSong(false);
    setCurrentTime(0);
    setIsAssessmentMode(false);
    setLastResult(null);
  };

  const onTimeUpdate = () => {
    if (songAudioRef.current) {
      setCurrentTime(songAudioRef.current.currentTime);
    }
  };

  const onSongEnded = () => {
    setIsPlayingSong(false);
    setIsAssessmentMode(true);
  };

  const activeCharId = useMemo(() => {
    const active = LYRICS_DATA.find(d => currentTime >= d.start && currentTime <= d.end);
    return active ? active.id : null;
  }, [currentTime]);

  const currentLine = useMemo(() => {
    return LYRIC_LINES.find(line => {
      const startChar = LYRICS_DATA[line.range[0]];
      const endChar = LYRICS_DATA[line.range[1]];
      return currentTime >= startChar.start - 0.5 && currentTime <= endChar.end + 0.5;
    }) || LYRIC_LINES[0];
  }, [currentTime]);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-8 font-sans select-none">
      <audio 
        ref={songAudioRef} 
        src="/风从草原来.mp3" 
        onTimeUpdate={onTimeUpdate} 
        onEnded={onSongEnded}
      />

      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Music className="w-8 h-8 text-stone-800" />
          <h1 className="text-4xl font-light tracking-tight text-stone-900 uppercase">
            Vocal <span className="font-bold">Coach</span>
          </h1>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          <button 
            onClick={toggleSong}
            className="flex items-center gap-2 px-6 py-2 bg-stone-800 text-white rounded-full hover:bg-stone-700 transition-colors shadow-lg"
          >
            {isPlayingSong ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlayingSong ? "暂停" : "播放"}
          </button>
          <button 
            onClick={resetSong}
            className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
            title="重置"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lyrics & Assessment Display */}
      <div className="mb-10 w-full max-w-2xl bg-white p-8 rounded-3xl shadow-xl border border-stone-200 flex flex-col items-center gap-6 relative overflow-hidden min-h-[240px] justify-center">
        <div className={`absolute top-0 left-0 w-2 h-full transition-colors duration-500 ${isAssessmentMode ? 'bg-amber-500' : 'bg-stone-800'}`}></div>
        
        {!isAssessmentMode ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 text-stone-400 uppercase tracking-[0.2em] text-[10px] font-bold">
              <Music className="w-4 h-4" /> Now Singing
            </div>
            <div className="text-3xl md:text-4xl font-serif italic text-stone-800 text-center leading-tight flex flex-wrap justify-center gap-x-2">
              {currentLine.text.split(" ").map((part, pIdx) => (
                <span key={pIdx} className="flex">
                  {part.split("").map((char, cIdx) => {
                    // Find the absolute index in LYRICS_DATA
                    const lineStart = currentLine.range[0];
                    const charIdx = lineStart + (pIdx === 1 ? part.length + 1 : 0) + cIdx; 
                    // Simplified index finding for this specific layout
                    const absoluteIdx = LYRICS_DATA.findIndex(d => d.annotation === char && d.start >= LYRICS_DATA[lineStart].start);
                    const isActive = activeCharId === LYRICS_DATA[absoluteIdx]?.id;
                    
                    return (
                      <span 
                        key={cIdx} 
                        className={`transition-all duration-200 ${isActive ? 'text-stone-900 font-bold not-italic scale-110' : 'text-stone-300'}`}
                      >
                        {char}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center gap-3 text-amber-500 uppercase tracking-[0.2em] text-[10px] font-bold">
              <Target className="w-4 h-4" /> Assessment Mode
            </div>
            <div className="text-3xl md:text-4xl font-serif italic text-stone-800 text-center leading-tight">
              请弹奏 <span className="text-stone-900 font-bold not-italic underline decoration-amber-300 underline-offset-8">“怀”</span> 字
            </div>
            <p className="text-stone-400 text-xs tracking-wide">音高和时长的准确性将影响您的得分</p>
            
            <AnimatePresence>
              {lastResult && (
              <>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 flex items-center gap-6 pt-6 border-t border-stone-100 w-full justify-center"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-stone-900">{lastResult.score}</span>
                      <span className="text-xs text-stone-400">pts</span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-stone-100"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Result</span>
                    <div className="flex items-center gap-2">
                      <Trophy className={`w-4 h-4 ${lastResult.score >= 90 ? 'text-amber-500' : 'text-stone-300'}`} />
                      <span className={`text-xl font-bold ${lastResult.score >= 90 ? 'text-amber-600' : 'text-stone-700'}`}>
                        {lastResult.evaluation}
                      </span>
                    </div>
                  </div>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetSong}
                  className="mt-6 px-8 py-2 bg-stone-800 text-white rounded-full text-sm font-medium shadow-lg hover:bg-stone-700 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  再试一次
                </motion.button>
              </>
            )}
            </AnimatePresence>
          </div>
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
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Training Mode</h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Listen to the accompaniment and follow the highlighted lyrics. Once the song ends, you'll be challenged to play a specific note from the melody.
          </p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Assessment</h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Your performance is graded on pitch accuracy (60%) and duration precision (40%). Aim for the "Perfect" evaluation!
          </p>
        </div>
      </div>
    </div>
  );
}
