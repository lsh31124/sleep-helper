"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Improved Audio Engine (Web Audio API) ─────────────────
const AudioEngine = (() => {
  let ctx = null;
  let currentSound = null; // { id, source, gain, nodes[] }

  function getCtx() {
    if (typeof window === "undefined") return null;
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function makeBuffer(seconds, fn) {
    const c = getCtx();
    if (!c) return null;
    const len = seconds * c.sampleRate;
    const buf = c.createBuffer(2, len, c.sampleRate);
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    fn(L, R, c.sampleRate, len);
    return buf;
  }

  function createWhiteNoise() {
    const c = getCtx();
    const buf = makeBuffer(4, (L, R, sr, len) => {
      for (let i = 0; i < len; i++) {
        L[i] = Math.random() * 2 - 1;
        R[i] = Math.random() * 2 - 1;
      }
    });
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // Gentle high-cut for smoother white noise
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 8000;
    lp.Q.value = 0.5;

    src.connect(lp);
    return { source: src, output: lp, extras: [] };
  }

  function createPinkNoise() {
    const c = getCtx();
    const buf = makeBuffer(4, (L, R, sr, len) => {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      let rb0=0,rb1=0,rb2=0,rb3=0,rb4=0,rb5=0,rb6=0;
      for (let i = 0; i < len; i++) {
        let wL = Math.random()*2-1, wR = Math.random()*2-1;
        b0=0.99886*b0+wL*0.0555179; rb0=0.99886*rb0+wR*0.0555179;
        b1=0.99332*b1+wL*0.0750759; rb1=0.99332*rb1+wR*0.0750759;
        b2=0.96900*b2+wL*0.1538520; rb2=0.96900*rb2+wR*0.1538520;
        b3=0.86650*b3+wL*0.3104856; rb3=0.86650*rb3+wR*0.3104856;
        b4=0.55000*b4+wL*0.5329522; rb4=0.55000*rb4+wR*0.5329522;
        b5=-0.7616*b5-wL*0.0168980; rb5=-0.7616*rb5-wR*0.0168980;
        L[i]=(b0+b1+b2+b3+b4+b5+b6+wL*0.5362)*0.11;
        R[i]=(rb0+rb1+rb2+rb3+rb4+rb5+rb6+wR*0.5362)*0.11;
        b6=wL*0.115926; rb6=wR*0.115926;
      }
    });
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return { source: src, output: src, extras: [] };
  }

  function createBrownNoise() {
    const c = getCtx();
    const buf = makeBuffer(4, (L, R, sr, len) => {
      let lastL=0, lastR=0;
      for (let i = 0; i < len; i++) {
        lastL = (lastL + 0.02*(Math.random()*2-1)) / 1.02;
        lastR = (lastR + 0.02*(Math.random()*2-1)) / 1.02;
        L[i] = lastL * 3.5;
        R[i] = lastR * 3.5;
      }
    });
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    lp.Q.value = 0.3;

    src.connect(lp);
    return { source: src, output: lp, extras: [] };
  }

  function createRain() {
    const c = getCtx();
    // Base layer: filtered brown noise for ambient rain body
    const baseBuf = makeBuffer(8, (L, R, sr, len) => {
      let lL=0, lR=0;
      for (let i = 0; i < len; i++) {
        lL = (lL + 0.015*(Math.random()*2-1))/1.015;
        lR = (lR + 0.015*(Math.random()*2-1))/1.015;
        L[i] = lL * 2;
        R[i] = lR * 2;
      }
    });
    const baseSrc = c.createBufferSource();
    baseSrc.buffer = baseBuf;
    baseSrc.loop = true;

    const baseLp = c.createBiquadFilter();
    baseLp.type = "lowpass";
    baseLp.frequency.value = 3000;
    baseLp.Q.value = 0.4;

    const baseGain = c.createGain();
    baseGain.gain.value = 0.7;
    baseSrc.connect(baseLp).connect(baseGain);

    // Detail layer: brighter noise for raindrop texture
    const detailBuf = makeBuffer(6, (L, R, sr, len) => {
      for (let i = 0; i < len; i++) {
        // Random droplet bursts
        if (Math.random() < 0.0008) {
          const dropLen = Math.floor(Math.random()*600+100);
          const intensity = Math.random()*0.3+0.1;
          for (let j=0; j<dropLen && i+j<len; j++) {
            const env = Math.sin(j/dropLen*Math.PI);
            const drop = (Math.random()*2-1)*intensity*env;
            L[i+j] += drop;
            R[i+j] += drop * (0.6+Math.random()*0.4);
          }
        }
        L[i] += (Math.random()*2-1)*0.04;
        R[i] += (Math.random()*2-1)*0.04;
      }
    });
    const detailSrc = c.createBufferSource();
    detailSrc.buffer = detailBuf;
    detailSrc.loop = true;

    const detailBp = c.createBiquadFilter();
    detailBp.type = "bandpass";
    detailBp.frequency.value = 5000;
    detailBp.Q.value = 0.5;

    const detailGain = c.createGain();
    detailGain.gain.value = 0.5;
    detailSrc.connect(detailBp).connect(detailGain);

    // Mix
    const mixer = c.createGain();
    mixer.gain.value = 1;
    baseGain.connect(mixer);
    detailGain.connect(mixer);

    return { source: baseSrc, output: mixer, extras: [detailSrc] };
  }

  function createOcean() {
    const c = getCtx();
    const dur = 10;
    const buf = makeBuffer(dur, (L, R, sr, len) => {
      let lL=0, lR=0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        // Multiple wave cycles at different speeds for realism
        const wave1 = Math.sin(t*0.12*Math.PI*2)*0.35;
        const wave2 = Math.sin(t*0.07*Math.PI*2+1.2)*0.25;
        const wave3 = Math.sin(t*0.19*Math.PI*2+2.8)*0.15;
        const envelope = 0.35 + (wave1+wave2+wave3)*0.65;

        lL = (lL + 0.008*(Math.random()*2-1))/1.008;
        lR = (lR + 0.008*(Math.random()*2-1))/1.008;

        // Surge: more high-freq content at wave peaks
        const surge = Math.max(0, wave1+wave2)*0.4;
        const hiss = (Math.random()*2-1)*surge;

        L[i] = lL*2.5*envelope + hiss*0.3;
        R[i] = lR*2.5*envelope + hiss*0.25;
      }
    });
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // Gentle lowpass to smooth it out
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2500;
    lp.Q.value = 0.3;

    src.connect(lp);
    return { source: src, output: lp, extras: [] };
  }

  function createCrickets() {
    const c = getCtx();
    const buf = makeBuffer(8, (L, R, sr, len) => {
      let lL=0, lR=0;
      // Create 3 cricket "voices" at different frequencies and rhythms
      const crickets = [
        { freq: 4200, period: 0.7, duty: 0.12, pan: 0.3, vol: 0.07 },
        { freq: 4800, period: 1.1, duty: 0.10, pan: -0.4, vol: 0.05 },
        { freq: 3800, period: 0.9, duty: 0.14, pan: 0.6, vol: 0.06 },
      ];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        // Ambient night background
        lL = (lL + 0.006*(Math.random()*2-1))/1.006;
        lR = (lR + 0.006*(Math.random()*2-1))/1.006;
        L[i] = lL * 0.8;
        R[i] = lR * 0.8;

        for (const cr of crickets) {
          const phase = (t % cr.period) / cr.period;
          if (phase < cr.duty) {
            const env = Math.sin(phase/cr.duty*Math.PI);
            // Rapid chirp modulation
            const chirp = Math.sin(t*cr.freq*Math.PI*2) * env * cr.vol;
            // AM modulation for realism
            const am = 0.5 + 0.5*Math.sin(t*45*Math.PI*2);
            L[i] += chirp * am * (0.5 + (1+cr.pan)*0.25);
            R[i] += chirp * am * (0.5 + (1-cr.pan)*0.25);
          }
        }
      }
    });
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;
    hp.Q.value = 0.3;

    src.connect(hp);
    return { source: src, output: hp, extras: [] };
  }

  const noiseGenerators = {
    white: createWhiteNoise,
    pink: createPinkNoise,
    brown: createBrownNoise,
  };

  const mp3Sources = {
    rain: "/sounds/rain.mp3",
    ocean: "/sounds/ocean.mp3",
    crickets: "/sounds/crickets.mp3",
  };

  const api = {
    play(soundId, volume = 0.5) {
      api.stopAll();
      if (mp3Sources[soundId]) {
        const audio = new Audio(mp3Sources[soundId]);
        audio.loop = true;
        audio.volume = volume;
        audio.play().catch(e => console.warn("Audio play failed:", e));
        currentSound = { id: soundId, source: null, gain: null, extras: [], isMP3: true, audioEl: audio };
      } else {
        const c = getCtx();
        if (!c) return;
        const gen = noiseGenerators[soundId];
        if (!gen) return;
        const { source, output, extras } = gen();
        const gain = c.createGain();
        gain.gain.value = volume;
        output.connect(gain);
        gain.connect(c.destination);
        if (source._started !== true) { source.start(); source._started = true; }
        for (const ex of extras) {
          if (ex._started !== true) { ex.start(); ex._started = true; }
        }
        currentSound = { id: soundId, source, gain, extras, isMP3: false };
      }
    },
    stopAll() {
      if (currentSound?.audioEl) {
        currentSound.audioEl.pause();
        currentSound.audioEl.src = "";
      }
      if (currentSound && !currentSound.isMP3) {
        try { currentSound.source.stop(); } catch {}
        for (const ex of currentSound.extras || []) {
          try { ex.stop(); } catch {}
        }
      }
      currentSound = null;
    },
    setVolume(vol) {
      if (currentSound?.audioEl) {
        currentSound.audioEl.volume = vol;
      } else if (currentSound?.gain) {
        currentSound.gain.gain.value = vol;
      }
    },
    fadeOut(duration = 3000) {
      if (currentSound?.audioEl) {
        const audio = currentSound.audioEl;
        const startVol = audio.volume;
        const steps = 30;
        const stepInterval = duration / steps;
        let step = 0;
        const fade = setInterval(() => {
          step++;
          audio.volume = Math.max(0, startVol * (1 - step / steps));
          if (step >= steps) { clearInterval(fade); api.stopAll(); }
        }, stepInterval);
      } else if (currentSound?.gain) {
        const c = getCtx();
        if (!c) return;
        currentSound.gain.gain.setTargetAtTime(0, c.currentTime, duration / 3000);
        setTimeout(() => api.stopAll(), duration + 500);
      }
    },
    getCurrentId() {
      return currentSound ? currentSound.id : null;
    }
  };
  return api;
})();

// ── Sound Definitions ──────────────────────────────────────
const SOUNDS = [
  { id: "rain", label: "빗소리", icon: "🌧", color: "#5B8FB9" },
  { id: "ocean", label: "파도", icon: "🌊", color: "#4A90A4" },
  { id: "crickets", label: "귀뚜라미", icon: "🦗", color: "#6B8E6B" },
  { id: "white", label: "백색소음", icon: "○", color: "#9CA3AF" },
  { id: "pink", label: "핑크노이즈", icon: "◎", color: "#C48B9F" },
  { id: "brown", label: "브라운노이즈", icon: "●", color: "#8B7355" },
];

const BREATHING_METHODS = [
  { id: "478", name: "4-7-8 호흡법", inhale: 4, hold: 7, exhale: 8, desc: "깊은 이완" },
  { id: "box", name: "박스 호흡법", inhale: 4, hold: 4, exhale: 4, holdAfter: 4, desc: "균형 호흡" },
  { id: "simple", name: "단순 호흡법", inhale: 4, hold: 0, exhale: 6, desc: "초보자용" },
];

const TIMER_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

// ── Breathing Circle ──────────────────────────────────────
function BreathingCircle({ method, isActive, onToggle }) {
  const [phase, setPhase] = useState("ready");
  const [counter, setCounter] = useState(0);
  const [cycle, setCycle] = useState(0);
  const intervalRef = useRef(null);

  const getPhases = useCallback(() => [
    { name: "inhale", duration: method.inhale, label: "들이쉬세요" },
    ...(method.hold > 0 ? [{ name: "hold", duration: method.hold, label: "참으세요" }] : []),
    { name: "exhale", duration: method.exhale, label: "내쉬세요" },
    ...(method.holdAfter ? [{ name: "holdAfter", duration: method.holdAfter, label: "참으세요" }] : []),
  ], [method]);

  useEffect(() => {
    if (!isActive) {
      clearInterval(intervalRef.current);
      setPhase("ready");
      setCounter(0);
      setCycle(0);
      return;
    }
    const phases = getPhases();
    let pIdx = 0;
    let count = phases[0].duration;
    setPhase(phases[0].label);
    setCounter(count);

    intervalRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        pIdx = (pIdx + 1) % phases.length;
        if (pIdx === 0) setCycle(c => c + 1);
        count = phases[pIdx].duration;
        setPhase(phases[pIdx].label);
      }
      setCounter(count);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isActive, method, getPhases]);

  const totalCycleDuration = method.inhale + method.hold + method.exhale + (method.holdAfter || 0);
  const isInhale = phase === "들이쉬세요";
  const isExhale = phase === "내쉬세요";

  const circleScale = isActive ? (isInhale ? 1.35 : isExhale ? 0.75 : 1.05) : 1;
  const dur = isActive ? (isInhale ? method.inhale : isExhale ? method.exhale : 0.3) : 0.5;

  return (
    <div className="flex flex-col items-center gap-6">
      <div onClick={onToggle} className="relative flex items-center justify-center cursor-pointer" style={{ width: 220, height: 220 }}>
        <div className="absolute rounded-full" style={{
          width: 220, height: 220,
          background: isActive
            ? `radial-gradient(circle, rgba(120,160,200,${isInhale?0.25:0.08}) 0%, transparent 70%)`
            : "radial-gradient(circle, rgba(120,160,200,0.1) 0%, transparent 70%)",
          transition: `all ${dur}s ease-in-out`,
        }} />
        <div className="absolute rounded-full flex items-center justify-center" style={{
          width: 160, height: 160,
          transform: `scale(${circleScale})`,
          transition: `transform ${dur}s ease-in-out, box-shadow ${dur}s ease-in-out`,
          background: "radial-gradient(circle at 35% 35%, rgba(100,140,180,0.25), rgba(40,60,90,0.4))",
          border: "1px solid rgba(140,180,220,0.2)",
          boxShadow: isActive && isInhale
            ? "0 0 40px rgba(100,160,220,0.2), inset 0 0 30px rgba(100,160,220,0.1)"
            : "0 0 20px rgba(100,160,220,0.08), inset 0 0 15px rgba(100,160,220,0.05)",
          backdropFilter: "blur(10px)",
        }}>
          <div className="text-center select-none">
            {isActive ? (
              <>
                <div style={{ fontSize: 36, fontWeight: 200, color: "rgba(200,220,240,0.9)", fontFamily: "'Noto Serif KR', serif" }}>{counter}</div>
                <div style={{ fontSize: 13, color: "rgba(160,190,220,0.8)", marginTop: 4, fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: 2 }}>{phase}</div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: "rgba(160,190,220,0.6)", fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: 1 }}>탭하여 시작</div>
            )}
          </div>
        </div>
        {isActive && [0,1,2].map(i => (
          <div key={i} className="absolute rounded-full" style={{
            width: 4, height: 4,
            background: `rgba(140,180,220,${0.4-i*0.1})`,
            animation: `orbit ${totalCycleDuration*(1.5+i*0.5)}s linear infinite`,
            transformOrigin: "110px 110px",
            top: 110, left: 110,
          }} />
        ))}
      </div>
      {isActive && (
        <div style={{ color: "rgba(140,170,200,0.5)", fontSize: 12, fontFamily: "'Noto Sans KR', sans-serif" }}>
          {cycle}번째 사이클
        </div>
      )}
    </div>
  );
}

// ── Sound Tile (single select) ────────────────────────────
function SoundTile({ sound, isPlaying, volume, onToggle, onVolumeChange }) {
  return (
    <div className="relative overflow-hidden rounded-2xl cursor-pointer select-none" style={{
      background: isPlaying ? `linear-gradient(135deg, ${sound.color}22, ${sound.color}11)` : "rgba(30,40,55,0.5)",
      border: `1px solid ${isPlaying ? sound.color+"44" : "rgba(80,100,130,0.15)"}`,
      backdropFilter: "blur(8px)",
      transition: "all 0.3s ease",
    }}>
      <div className="p-4" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 22 }}>{sound.icon}</span>
          <span style={{
            fontSize: 13,
            color: isPlaying ? "rgba(210,225,240,0.9)" : "rgba(140,160,180,0.7)",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontWeight: 400,
          }}>{sound.label}</span>
          {isPlaying && (
            <div className="ml-auto flex gap-0.5 items-end" style={{ height: 16 }}>
              {[6, 12, 8].map((h, i) => (
                <div key={i} className="rounded-full" style={{
                  width: 2, height: h,
                  background: sound.color+"88",
                  animation: `barPulse ${0.4+i*0.15}s ease-in-out infinite alternate`,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
      {isPlaying && (
        <div className="px-4 pb-3">
          <input type="range" min="0" max="100" value={volume*100}
            onChange={e => onVolumeChange(e.target.value/100)}
            className="w-full" style={{ height: 3, accentColor: sound.color, opacity: 0.7 }} />
        </div>
      )}
    </div>
  );
}

// ── Timer Ring ────────────────────────────────────────────
function TimerRing({ remaining, total }) {
  const pct = total > 0 ? remaining / total : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(60,80,100,0.2)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(120,170,220,0.5)" strokeWidth="2.5"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 1s linear" }} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        fill="rgba(190,210,230,0.85)" fontSize="16" fontWeight="200"
        fontFamily="'Noto Serif KR', serif">
        {mins}:{secs.toString().padStart(2,"0")}
      </text>
    </svg>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function SleepHelper() {
  const [tab, setTab] = useState("sounds");
  const [activeSound, setActiveSound] = useState(null); // single sound id or null
  const [volume, setVolume] = useState(0.5);
  const [breathingActive, setBreathingActive] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(BREATHING_METHODS[0]);
  const [timerMinutes, setTimerMinutes] = useState(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const timerRemainingRef = useRef(0); // ref mirror to avoid stale closure in interval

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => { AudioEngine.stopAll(); };
  }, []);

  // Single sound toggle
  const toggleSound = (soundId) => {
    if (activeSound === soundId) {
      AudioEngine.stopAll();
      setActiveSound(null);
    } else {
      AudioEngine.play(soundId, volume);
      setActiveSound(soundId);
    }
  };

  const changeVolume = (vol) => {
    setVolume(vol);
    AudioEngine.setVolume(vol);
  };

  // Timer — fixed: properly compute seconds from minutes
  const startTimer = (mins) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const totalSeconds = mins * 60;
    timerRemainingRef.current = totalSeconds;
    setTimerMinutes(mins);
    setTimerRemaining(totalSeconds);
    setTimerActive(true);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerActive(false);
    setTimerMinutes(null);
    setTimerRemaining(0);
  };

  useEffect(() => {
    if (!timerActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          AudioEngine.fadeOut(3000);
          setTimeout(() => {
            setActiveSound(null);
            setBreathingActive(false);
          }, 3500);
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTimerActive(false);
          setTimerMinutes(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive]); // only re-run when timer is started/stopped

  const stars = useMemo(() => Array.from({length:40}, () => ({
    size: Math.random()*2+1,
    opacity: Math.random()*0.4+0.1,
    top: Math.random()*50,
    left: Math.random()*100,
    duration: 3+Math.random()*4,
    delay: Math.random()*5,
  })), []);

  const tabs = [
    { id: "sounds", label: "소리", icon: "♪" },
    { id: "breathe", label: "호흡", icon: "◉" },
    { id: "timer", label: "타이머", icon: "◷" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0B1120 0%, #0F1829 30%, #111D2E 60%, #0D1520 100%)",
      fontFamily: "'Noto Sans KR', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((s,i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: s.size, height: s.size,
            background: `rgba(180,200,230,${s.opacity})`,
            top: `${s.top}%`, left: `${s.left}%`,
            animation: `twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }} />
        ))}
      </div>

      {/* Playing indicator */}
      {activeSound && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(20,30,45,0.8)", border: "1px solid rgba(80,120,160,0.2)", backdropFilter: "blur(10px)" }}>
          <div className="rounded-full" style={{ width: 6, height: 6, background: "#5B9BD5", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: "rgba(160,190,220,0.7)" }}>
            {SOUNDS.find(s=>s.id===activeSound)?.label} 재생 중
          </span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto px-5 pb-28" style={{ paddingTop: "env(safe-area-inset-top, 120px)" }}>
        {/* Header */}
        <div className="pt-6 pb-8 text-center">
          <h1 style={{ fontSize: 24, fontWeight: 200, color: "rgba(200,220,240,0.85)", fontFamily: "'Noto Serif KR', serif", letterSpacing: 3 }}>
            고요한 밤
          </h1>
          <p style={{ fontSize: 12, color: "rgba(130,160,190,0.4)", marginTop: 6, letterSpacing: 2 }}>
            편안한 잠을 위한 도우미
          </p>
        </div>

        {/* Timer display (always visible when active) */}
        {timerActive && timerRemaining > 0 && (
          <div className="mb-6 flex justify-center">
            <div onClick={stopTimer} className="cursor-pointer" title="탭하여 취소">
              <TimerRing remaining={timerRemaining} total={timerMinutes * 60} />
            </div>
          </div>
        )}

        {/* Tab content */}
        <div style={{ minHeight: 360 }}>
          {tab === "sounds" && (
            <div className="grid grid-cols-2 gap-3">
              {SOUNDS.map(s => (
                <SoundTile key={s.id} sound={s}
                  isPlaying={activeSound === s.id}
                  volume={activeSound === s.id ? volume : 0.5}
                  onToggle={() => toggleSound(s.id)}
                  onVolumeChange={changeVolume} />
              ))}
            </div>
          )}

          {tab === "breathe" && (
            <div className="flex flex-col items-center gap-8">
              <div className="flex gap-2 w-full">
                {BREATHING_METHODS.map(m => (
                  <button key={m.id} onClick={() => { if(breathingActive) setBreathingActive(false); setSelectedMethod(m); }}
                    className="flex-1 py-2.5 rounded-xl text-center transition-all duration-300"
                    style={{
                      background: selectedMethod.id===m.id ? "rgba(80,120,170,0.15)" : "transparent",
                      border: `1px solid ${selectedMethod.id===m.id ? "rgba(100,150,200,0.3)" : "rgba(80,100,130,0.12)"}`,
                      fontSize: 12,
                      color: selectedMethod.id===m.id ? "rgba(180,210,240,0.85)" : "rgba(130,155,180,0.5)",
                    }}>
                    {m.name.replace(" 호흡법","")}
                  </button>
                ))}
              </div>
              <div className="text-center" style={{ color: "rgba(140,170,200,0.5)", fontSize: 12 }}>
                {selectedMethod.inhale}초 흡 {selectedMethod.hold>0?`· ${selectedMethod.hold}초 멈춤`:""} · {selectedMethod.exhale}초 호
                {selectedMethod.holdAfter ? ` · ${selectedMethod.holdAfter}초 멈춤` : ""}
              </div>
              <BreathingCircle method={selectedMethod} isActive={breathingActive} onToggle={() => setBreathingActive(!breathingActive)} />
              <p style={{ color: "rgba(120,150,180,0.35)", fontSize: 11, textAlign: "center", lineHeight: 1.8, maxWidth: 260 }}>
                {selectedMethod.desc} — 잠들기 전 3~5 사이클 반복하면 심박수가 낮아지고 이완이 촉진됩니다
              </p>
            </div>
          )}

          {tab === "timer" && (
            <div className="flex flex-col items-center gap-8">
              <p style={{ color: "rgba(140,170,200,0.5)", fontSize: 13, textAlign: "center" }}>
                시간이 지나면 소리가<br/>서서히 꺼집니다
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {TIMER_OPTIONS.map(mins => (
                  <button key={mins} onClick={() => startTimer(mins)}
                    className="py-4 rounded-2xl text-center transition-all duration-300"
                    style={{
                      background: timerMinutes===mins && timerActive ? "rgba(80,130,180,0.2)" : "rgba(30,40,55,0.5)",
                      border: `1px solid ${timerMinutes===mins && timerActive ? "rgba(100,160,220,0.4)" : "rgba(80,100,130,0.12)"}`,
                      color: timerMinutes===mins && timerActive ? "rgba(180,210,240,0.9)" : "rgba(140,165,190,0.6)",
                    }}>
                    <div style={{ fontSize: 20, fontWeight: 200, fontFamily: "'Noto Serif KR', serif" }}>{mins}</div>
                    <div style={{ fontSize: 10, marginTop: 2, opacity: 0.6 }}>분</div>
                  </button>
                ))}
              </div>
              {timerActive && (
                <button onClick={stopTimer} className="px-6 py-2.5 rounded-full transition-all"
                  style={{ background: "rgba(180,80,80,0.15)", border: "1px solid rgba(200,100,100,0.25)", color: "rgba(220,140,140,0.8)", fontSize: 13 }}>
                  타이머 취소
                </button>
              )}
              {!timerActive && !activeSound && (
                <p style={{ color: "rgba(140,170,200,0.3)", fontSize: 11, textAlign: "center" }}>
                  먼저 소리를 재생한 뒤 타이머를 설정해보세요
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{
        background: "linear-gradient(180deg, transparent 0%, rgba(11,17,32,0.95) 30%)",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
      }}>
        <div className="max-w-md mx-auto flex justify-around py-3 px-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-1.5 py-1 px-6 rounded-xl transition-all duration-300"
              style={{ background: tab===t.id ? "rgba(60,90,130,0.15)" : "transparent" }}>
              <span style={{ fontSize: 18, color: tab===t.id ? "rgba(160,200,240,0.8)" : "rgba(100,120,140,0.4)", transition: "color 0.3s" }}>{t.icon}</span>
              <span style={{ fontSize: 10, color: tab===t.id ? "rgba(160,200,240,0.7)" : "rgba(100,120,140,0.35)", letterSpacing: 1, transition: "color 0.3s" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        body { background:#0B1120; }
        input[type="range"] { -webkit-appearance:none; appearance:none; background:rgba(60,80,100,0.3); border-radius:2px; outline:none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:rgba(160,190,220,0.7); cursor:pointer; }
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.8} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes orbit { from{transform:rotate(0deg) translateX(80px)} to{transform:rotate(360deg) translateX(80px)} }
        @keyframes barPulse { from{height:4px} to{height:14px} }
      `}</style>
      {/* Google Fonts: move to layout.jsx <head> link tag for CSP compliance */}
    </div>
  );
}
