import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─────────────────────────────────────────────
//  WATCH DEMO MODAL  —  drop-in for DevRoom
//  Props: isOpen (bool), onClose (fn)
// ─────────────────────────────────────────────

const SCENES = [
  { id: 'create',  label: 'Room Created',     icon: '⚡', duration: 3500 },
  { id: 'join',    label: 'User Joins',        icon: '👤', duration: 3500 },
  { id: 'code',    label: 'Live Coding',       icon: '✏️',  duration: 7000 },
  { id: 'run',     label: 'Run & Output',      icon: '▶️',  duration: 3500 },
  { id: 'chat',    label: 'Team Chat',         icon: '💬', duration: 3500 },
];

const CODE_LINES = [
  { ln: 1, tokens: [{ t: 'kw', v: 'function ' }, { t: 'fn', v: 'fibonacci' }, { t: 'pl', v: '(n) {' }] },
  { ln: 2, tokens: [{ t: 'pl', v: '  ' }, { t: 'kw', v: 'if ' }, { t: 'pl', v: '(n <= ' }, { t: 'nm', v: '1' }, { t: 'pl', v: ') ' }, { t: 'kw', v: 'return ' }, { t: 'nm', v: 'n' }, { t: 'pl', v: ';' }] },
  { ln: 3, tokens: [{ t: 'pl', v: '  ' }, { t: 'kw', v: 'return ' }, { t: 'fn', v: 'fibonacci' }, { t: 'pl', v: '(n-' }, { t: 'nm', v: '1' }, { t: 'pl', v: ') + ' }, { t: 'fn', v: 'fibonacci' }, { t: 'pl', v: '(n-' }, { t: 'nm', v: '2' }, { t: 'pl', v: ');' }] },
  { ln: 4, tokens: [{ t: 'pl', v: '}' }] },
  { ln: 5, tokens: [] },
  { ln: 6, tokens: [{ t: 'fn', v: 'console' }, { t: 'pl', v: '.' }, { t: 'fn', v: 'log' }, { t: 'pl', v: '(' }, { t: 'fn', v: 'fibonacci' }, { t: 'pl', v: '(' }, { t: 'nm', v: '10' }, { t: 'pl', v: '));' }] },
];

const flatCode = CODE_LINES.map(l => ({
  ln: l.ln,
  raw: l.tokens.map(t => t.v).join(''),
  tokens: l.tokens,
}));

const OUTPUT_LINES = ['> Executing JavaScript...', '> fibonacci(10)', '55', '✓ Executed in 0.28s', ''];

const CHAT_MSGS = [
  { user: 'Sarah', color: '#34d399', msg: 'nice! fibonacci works 🔥', delay: 400 },
  { user: 'Hamza', color: '#38bdf8', msg: 'yeah let me optimize it', delay: 1400 },
  { user: 'Sarah', color: '#34d399', msg: 'use memoization 💡', delay: 2500 },
];

// Token color map
const TC = { kw: '#c792ea', fn: '#82aaff', nm: '#f78c6c', st: '#c3e88d', pl: '#e2e8f0', cm: 'rgba(148,163,184,0.4)' };

export default function WatchDemoModal({ isOpen, onClose }) {
  const [scene, setScene]         = useState(0);
  const [progress, setProgress]   = useState(0);
  const [paused, setPaused]       = useState(false);

  // Scene-specific state
  const [roomId]                  = useState('debgaqd');
  const [typedName, setTypedName] = useState('');
  const [roomCreated, setRoomCreated] = useState(false);
  const [sarah, setSarah]         = useState(false);
  const [sarahTyping, setSarahTyping] = useState(false);

  const [codeReveal, setCodeReveal] = useState(0); // chars revealed
  const [sarahCursor, setSarahCursor] = useState(false);
  const totalChars = flatCode.reduce((s, l) => s + l.raw.length, 0);

  const [running, setRunning]     = useState(false);
  const [outputLines, setOutputLines] = useState([]);
  const [outputDone, setOutputDone] = useState(false);

  const [chatTab, setChatTab]     = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  const timerRef  = useRef(null);
  const progRef   = useRef(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const resetScene = useCallback((idx) => {
    setScene(idx);
    setProgress(0);
    setTypedName('');
    setRoomCreated(false);
    setSarah(false);
    setSarahTyping(false);
    setCodeReveal(0);
    setSarahCursor(false);
    setRunning(false);
    setOutputLines([]);
    setOutputDone(false);
    setChatTab(false);
    setChatMessages([]);
  }, []);

  // Progress bar ticker
  useEffect(() => {
    if (!isOpen || paused) return;
    const dur = SCENES[scene].duration;
    const tick = 50;
    let elapsed = 0;
    progRef.current = setInterval(() => {
      if (pausedRef.current) return;
      elapsed += tick;
      setProgress(Math.min((elapsed / dur) * 100, 100));
      if (elapsed >= dur) {
        clearInterval(progRef.current);
        const next = (scene + 1) % SCENES.length;
        resetScene(next);
      }
    }, tick);
    return () => clearInterval(progRef.current);
  }, [isOpen, scene, paused, resetScene]);

  // Scene 0 — Room Created
  useEffect(() => {
    if (!isOpen || scene !== 0) return;
    const NAME = 'm hamza';
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTypedName(NAME.slice(0, i));
      if (i >= NAME.length) {
        clearInterval(t);
        setTimeout(() => setRoomCreated(true), 600);
      }
    }, 90);
    return () => clearInterval(t);
  }, [isOpen, scene]);

  // Scene 1 — Sarah joins
  useEffect(() => {
    if (!isOpen || scene !== 1) return;
    const t1 = setTimeout(() => setSarah(true), 800);
    const t2 = setTimeout(() => setSarahTyping(true), 1800);
    const t3 = setTimeout(() => setSarahTyping(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isOpen, scene]);

  // Scene 2 — Live coding
  useEffect(() => {
    if (!isOpen || scene !== 2) return;
    let chars = 0;
    const interval = setInterval(() => {
      chars += 3;
      setCodeReveal(chars);
      if (chars >= totalChars) { clearInterval(interval); setSarahCursor(true); }
    }, 40);
    return () => clearInterval(interval);
  }, [isOpen, scene, totalChars]);

  // Scene 3 — Run code
  useEffect(() => {
    if (!isOpen || scene !== 3) return;
    const t1 = setTimeout(() => setRunning(true), 600);
    let lineIdx = 0;
    const t2 = setTimeout(() => {
      const iv = setInterval(() => {
        lineIdx++;
        setOutputLines(OUTPUT_LINES.slice(0, lineIdx));
        if (lineIdx >= OUTPUT_LINES.length) { clearInterval(iv); setOutputDone(true); }
      }, 380);
      timerRef.current = iv;
    }, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(timerRef.current); };
  }, [isOpen, scene]);

  // Scene 4 — Chat
  useEffect(() => {
    if (!isOpen || scene !== 4) return;
    const t0 = setTimeout(() => setChatTab(true), 400);
    const timers = CHAT_MSGS.map(({ delay }, i) =>
      setTimeout(() => setChatMessages(prev => [...prev, CHAT_MSGS[i]]), delay + 600)
    );
    return () => { clearTimeout(t0); timers.forEach(clearTimeout); };
  }, [isOpen, scene]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  // Reset on open
  useEffect(() => {
    if (isOpen) resetScene(0);
  }, [isOpen, resetScene]);

  if (!isOpen) return null;

  // ── Render helpers ────────────────────────────────────
  const renderCodeWithReveal = () => {
    let charsLeft = codeReveal;
    return flatCode.map((line) => {
      if (charsLeft <= 0) return null;
      let lineCharsLeft = charsLeft;
      charsLeft -= line.raw.length;
      return (
        <div key={line.ln} style={{ display: 'flex', gap: 16, lineHeight: '1.9' }}>
          <span style={{ color: 'rgba(148,163,184,0.2)', minWidth: 16, textAlign: 'right', fontSize: 11 }}>{line.ln}</span>
          <span>
            {line.tokens.map((tk, ti) => {
              if (lineCharsLeft <= 0) return null;
              const visible = tk.v.slice(0, lineCharsLeft);
              lineCharsLeft -= tk.v.length;
              return <span key={ti} style={{ color: TC[tk.t] || TC.pl }}>{visible}</span>;
            })}
          </span>
        </div>
      );
    });
  };

  return (
    <>
      <style>{`
        @keyframes dr-modal-in {
          from { opacity:0; transform:scale(0.93) translateY(20px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes dr-overlay-in { from{opacity:0;} to{opacity:1;} }
        @keyframes dr-toast-in {
          from { opacity:0; transform:translateY(-12px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes dr-user-in {
          from { opacity:0; transform:translateX(-18px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes dr-chat-in {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes dr-pulse-ring {
          0%   { box-shadow:0 0 0 0 rgba(56,189,248,0.5); }
          70%  { box-shadow:0 0 0 10px rgba(56,189,248,0); }
          100% { box-shadow:0 0 0 0 rgba(56,189,248,0); }
        }
        @keyframes dr-blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
        @keyframes dr-spin { to{transform:rotate(360deg);} }
        @keyframes dr-output-in {
          from{opacity:0; transform:translateY(6px);}
          to{opacity:1; transform:translateY(0);}
        }
        @keyframes dr-run-glow {
          0%,100%{box-shadow:0 4px 20px rgba(34,197,94,0.3);}
          50%{box-shadow:0 4px 40px rgba(34,197,94,0.7), 0 0 60px rgba(34,197,94,0.2);}
        }
        @keyframes dr-scene-fade {
          from{opacity:0;} to{opacity:1;}
        }
        .dr-demo-scene { animation: dr-scene-fade 0.35s ease forwards; }
        .dr-demo-cursor { display:inline-block; width:2px; height:1em; background:#38bdf8; margin-left:2px; vertical-align:text-bottom; animation:dr-blink 0.8s step-end infinite; border-radius:1px; }
        .dr-demo-cursor.green { background:#34d399; }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(2,6,18,0.88)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'dr-overlay-in 0.3s ease',
          padding: '20px',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 860,
            background: 'rgba(4,8,22,0.98)',
            border: '1px solid rgba(56,189,248,0.18)',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(56,189,248,0.05), 0 40px 120px rgba(0,0,0,0.9), 0 0 120px rgba(14,165,233,0.08)',
            animation: 'dr-modal-in 0.4s cubic-bezier(0.23,1,0.32,1)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {/* Top bar */}
          <div style={{
            padding: '14px 22px',
            background: 'rgba(2,6,14,0.98)',
            borderBottom: '1px solid rgba(56,189,248,0.1)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {/* Traffic lights */}
            <div style={{ display: 'flex', gap: 7 }}>
              <div onClick={onClose} style={{ width: 13, height: 13, borderRadius: '50%', background: '#ff5f57', cursor: 'pointer' }} title="Close"/>
              <div onClick={() => setPaused(p => !p)} style={{ width: 13, height: 13, borderRadius: '50%', background: '#febc2e', cursor: 'pointer' }} title="Pause/Play"/>
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#28c840' }}/>
            </div>
            {/* Title */}
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'rgba(148,163,184,0.45)', letterSpacing: 1 }}>
              devroom · interactive demo
            </div>
            {/* Scene indicators */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {SCENES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => resetScene(i)}
                  title={s.label}
                  style={{
                    width: i === scene ? 22 : 7, height: 7, borderRadius: 4,
                    background: i === scene ? '#38bdf8' : i < scene ? 'rgba(56,189,248,0.35)' : 'rgba(148,163,184,0.15)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0,
                  }}
                />
              ))}
            </div>
            {/* Close */}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'rgba(148,163,184,0.45)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 0 0 8px' }}
            >×</button>
          </div>

          {/* Scene label strip */}
          <div style={{
            background: 'rgba(2,6,14,0.7)',
            borderBottom: '1px solid rgba(56,189,248,0.07)',
            padding: '10px 22px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>{SCENES[scene].icon}</span>
            <span style={{ fontSize: 12, color: '#38bdf8', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              {SCENES[scene].label}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)', marginLeft: 4 }}>
              {scene + 1} / {SCENES.length}
            </span>
            <div style={{ flex: 1 }}/>
            <button
              onClick={() => setPaused(p => !p)}
              style={{
                background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: 6, color: '#38bdf8', cursor: 'pointer',
                fontSize: 11, padding: '4px 12px', letterSpacing: 1,
              }}
            >
              {paused ? '▶ PLAY' : '⏸ PAUSE'}
            </button>
            <button
              onClick={() => resetScene((scene + 1) % SCENES.length)}
              style={{
                background: 'none', border: '1px solid rgba(148,163,184,0.15)',
                borderRadius: 6, color: 'rgba(148,163,184,0.5)', cursor: 'pointer',
                fontSize: 11, padding: '4px 12px', letterSpacing: 1,
              }}
            >
              SKIP →
            </button>
          </div>

          {/* Main content area */}
          <div style={{ display: 'flex', minHeight: 420 }}>

            {/* Left: fake IDE sidebar */}
            <div style={{
              width: 200, background: 'rgba(2,5,14,0.95)',
              borderRight: '1px solid rgba(56,189,248,0.08)',
              padding: '16px 0', flexShrink: 0,
            }}>
              {/* Sidebar tabs */}
              <div style={{ display: 'flex', padding: '0 12px', gap: 4, marginBottom: 16 }}>
                {['USERS', 'CHAT', 'HISTORY'].map(tab => (
                  <div
                    key={tab}
                    style={{
                      flex: 1, textAlign: 'center', padding: '5px 2px',
                      fontSize: 9, letterSpacing: 1.2, fontWeight: 700,
                      color: (tab === 'CHAT' && chatTab) || (tab === 'USERS' && !chatTab)
                        ? '#38bdf8' : 'rgba(148,163,184,0.35)',
                      borderBottom: (tab === 'CHAT' && chatTab) || (tab === 'USERS' && !chatTab)
                        ? '1px solid #38bdf8' : '1px solid transparent',
                      cursor: 'default', transition: 'all 0.3s',
                    }}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              {/* Users panel */}
              {!chatTab && (
                <div style={{ padding: '0 12px' }}>
                  {/* Hamza always there */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                    background: 'rgba(56,189,248,0.05)', borderRadius: 8, marginBottom: 6,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0c4a6e,#0284c7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>M</div>
                    <div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>m hamza</div>
                      <div style={{ fontSize: 10, color: 'rgba(56,189,248,0.5)' }}>you</div>
                    </div>
                    <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'dr-blink 2s ease-in-out infinite' }}/>
                  </div>

                  {/* Sarah joins */}
                  {sarah && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                      background: 'rgba(52,211,153,0.05)', borderRadius: 8,
                      animation: 'dr-user-in 0.5s cubic-bezier(0.23,1,0.32,1)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#065f46,#059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>S</div>
                      <div>
                        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>Sarah</div>
                        {sarahTyping && (
                          <div style={{ fontSize: 9, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>typing</span>
                            <span style={{ letterSpacing: 2 }}>...</span>
                          </div>
                        )}
                      </div>
                      <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#34d399', animation: 'dr-blink 2s ease-in-out infinite 0.3s' }}/>
                    </div>
                  )}

                  {scene >= 2 && !sarah && (
                    <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.2)', textAlign: 'center', marginTop: 20 }}>
                      Waiting for others...
                    </div>
                  )}
                </div>
              )}

              {/* Chat panel */}
              {chatTab && (
                <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ animation: 'dr-chat-in 0.4s ease' }}>
                      <div style={{ fontSize: 9, color: m.color, marginBottom: 3, letterSpacing: 0.5 }}>{m.user}</div>
                      <div style={{
                        fontSize: 11, color: '#e2e8f0', background: `${m.color}14`,
                        border: `1px solid ${m.color}22`, borderRadius: 8,
                        padding: '6px 10px', lineHeight: 1.5,
                      }}>{m.msg}</div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.25)', textAlign: 'center', marginTop: 20 }}>
                      No messages yet.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: main editor area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Editor top bar */}
              <div style={{
                padding: '10px 18px',
                borderBottom: '1px solid rgba(56,189,248,0.08)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(2,5,14,0.6)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                  background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)',
                  borderRadius: 6, fontSize: 11, color: '#38bdf8',
                }}>
                  <div style={{ width: 8, height: 8, background: '#f1e05a', borderRadius: 2 }}/>
                  main.js
                </div>
                <div style={{ flex: 1 }}/>
                {/* Room ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(148,163,184,0.45)' }}>
                  <span>ROOM</span>
                  <span style={{ color: '#38bdf8', letterSpacing: 1 }}>{roomId}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}/>
                  <span style={{ color: '#22c55e' }}>Connected</span>
                </div>
                {/* Language badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(241,229,90,0.1)', border: '1px solid rgba(241,229,90,0.2)', borderRadius: 6, fontSize: 10, color: '#f1e05a' }}>
                  <div style={{ width: 8, height: 8, background: '#f1e05a', borderRadius: '50%' }}/>
                  JavaScript
                </div>
                {/* Run button */}
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px',
                  background: running ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#15803d,#16a34a)',
                  border: 'none', borderRadius: 8,
                  color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  cursor: 'default', fontFamily: 'JetBrains Mono, monospace',
                  animation: running ? 'dr-run-glow 1s ease-in-out infinite' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {running ? (
                    <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'dr-spin 0.8s linear infinite' }}/>
                  ) : '▶'}
                  Run Code
                </button>
              </div>

              {/* Scene content */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

                {/* Scene 0: Create room */}
                {scene === 0 && (
                  <div className="dr-demo-scene" style={{ padding: '40px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{
                      background: 'rgba(4,8,20,0.92)', border: '1px solid rgba(56,189,248,0.2)',
                      borderRadius: 16, padding: '32px 36px', maxWidth: 360, width: '100%',
                      boxShadow: '0 0 60px rgba(14,165,233,0.08)',
                    }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: 'rgba(2,6,18,0.8)', borderRadius: 8, padding: 4 }}>
                        {['Create Room','Join Room'].map((t, i) => (
                          <div key={t} style={{
                            flex: 1, padding: '8px', textAlign: 'center',
                            borderRadius: 5, fontSize: 10, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase',
                            background: i === 0 ? 'linear-gradient(135deg,#0c4a6e,#0284c7)' : 'transparent',
                            color: i === 0 ? 'white' : 'rgba(148,163,184,0.35)',
                          }}>{t}</div>
                        ))}
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(56,189,248,0.55)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Your Name</div>
                      <div style={{
                        padding: '11px 14px', background: 'rgba(2,6,18,0.8)',
                        border: `1px solid ${roomCreated ? 'rgba(34,197,94,0.4)' : 'rgba(56,189,248,0.25)'}`,
                        borderRadius: 8, fontSize: 13, color: typedName ? '#e2e8f0' : 'rgba(148,163,184,0.3)',
                        marginBottom: 14, transition: 'border-color 0.3s',
                        minHeight: 40, display: 'flex', alignItems: 'center',
                      }}>
                        {typedName || <span style={{ color: 'rgba(148,163,184,0.25)' }}>e.g. Muhammad Hamza</span>}
                        {!roomCreated && typedName && <span className="dr-demo-cursor"/>}
                      </div>
                      <div style={{
                        padding: '12px', borderRadius: 8, textAlign: 'center',
                        background: 'linear-gradient(135deg,#0c4a6e,#0284c7,#0ea5e9)',
                        color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 2,
                        boxShadow: '0 8px 28px rgba(14,165,233,0.3)',
                      }}>
                        ⚡ Create New Room →
                      </div>
                      {roomCreated && (
                        <div style={{
                          marginTop: 16, padding: '10px 14px',
                          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
                          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                          animation: 'dr-toast-in 0.4s cubic-bezier(0.23,1,0.32,1)',
                        }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</div>
                          <div>
                            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>Room Created!</div>
                            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)' }}>ID: {roomId} · Share the link!</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scene 1: User joins */}
                {scene === 1 && (
                  <div className="dr-demo-scene" style={{ padding: '30px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.35)', marginBottom: 20, letterSpacing: 1 }}>// room · {roomId}</div>
                    {/* URL bar mock */}
                    <div style={{
                      background: 'rgba(2,6,14,0.8)', border: '1px solid rgba(56,189,248,0.1)',
                      borderRadius: 8, padding: '8px 14px', fontSize: 11,
                      color: 'rgba(148,163,184,0.4)', marginBottom: 24,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}/>
                      devroom.app/room/{roomId}?username=m+hamza
                    </div>
                    {/* Users list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 10, color: 'rgba(56,189,248,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Active Users</div>
                      {[{ name: 'm hamza', color: '#38bdf8', label: 'you (host)', always: true },
                        { name: 'Sarah', color: '#34d399', label: 'just joined', always: false }
                      ].map(u => (
                        (u.always || sarah) && (
                          <div key={u.name} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px',
                            background: `${u.color}0a`, border: `1px solid ${u.color}20`,
                            borderRadius: 10,
                            animation: u.always ? 'none' : 'dr-user-in 0.5s cubic-bezier(0.23,1,0.32,1)',
                          }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${u.color}40, ${u.color}80)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700, color: 'white',
                              border: `2px solid ${u.color}50`,
                              animation: 'dr-pulse-ring 2s ease-in-out infinite',
                            }}>{u.name[0].toUpperCase()}</div>
                            <div>
                              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{u.name}</div>
                              <div style={{ fontSize: 10, color: u.color, opacity: 0.7 }}>{u.label}</div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#22c55e' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'dr-blink 1.5s ease-in-out infinite' }}/>
                              Online
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                    {sarah && (
                      <div style={{
                        marginTop: 16, padding: '10px 14px',
                        background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)',
                        borderRadius: 8, fontSize: 11, color: '#34d399',
                        animation: 'dr-toast-in 0.4s ease',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span>👤</span> Sarah joined the room
                      </div>
                    )}
                  </div>
                )}

                {/* Scene 2: Live coding */}
                {scene === 2 && (
                  <div className="dr-demo-scene" style={{ padding: '20px 24px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, height: '100%', overflowY: 'auto' }}>
                    {/* Hamza cursor label */}
                    <div style={{ fontSize: 9, color: '#38bdf8', letterSpacing: 1, marginBottom: 8, display: 'flex', gap: 12 }}>
                      <span style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', padding: '2px 8px', borderRadius: 4 }}>▌ Hamza</span>
                      {sarahCursor && (
                        <span style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', padding: '2px 8px', borderRadius: 4, animation: 'dr-scene-fade 0.3s ease' }}>▌ Sarah</span>
                      )}
                    </div>
                    {renderCodeWithReveal()}
                    {codeReveal < totalChars && <span className="dr-demo-cursor"/>}
                    {sarahCursor && (
                      <div style={{ marginTop: 8 }}>
                        <span className="dr-demo-cursor green"/>
                        <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.5)', marginLeft: 6 }}>Sarah reviewing...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Scene 3: Run & output */}
                {scene === 3 && (
                  <div className="dr-demo-scene" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Code (static) */}
                    <div style={{ padding: '16px 24px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, flex: 1, borderBottom: '1px solid rgba(56,189,248,0.08)' }}>
                      {flatCode.map(line => (
                        <div key={line.ln} style={{ display: 'flex', gap: 16, lineHeight: '1.9' }}>
                          <span style={{ color: 'rgba(148,163,184,0.2)', minWidth: 16, textAlign: 'right', fontSize: 11 }}>{line.ln}</span>
                          <span>{line.tokens.map((tk, ti) => <span key={ti} style={{ color: TC[tk.t] || TC.pl }}>{tk.v}</span>)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Output panel */}
                    <div style={{
                      background: 'rgba(2,4,12,0.98)', padding: '14px 24px',
                      minHeight: 120,
                      borderTop: '1px solid rgba(56,189,248,0.1)',
                    }}>
                      <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.35)', letterSpacing: 2, marginBottom: 10 }}>▶ OUTPUT</div>
                      {outputLines.map((line, i) => (
                        <div key={i} style={{
                          fontSize: 12, lineHeight: 1.8,
                          color: line.startsWith('✓') ? '#22c55e' : line.startsWith('>') ? 'rgba(148,163,184,0.45)' : '#f0f9ff',
                          animation: 'dr-output-in 0.3s ease',
                        }}>{line}</div>
                      ))}
                      {outputDone && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          {['Hamza', 'Sarah'].map((u, i) => (
                            <div key={u} style={{
                              fontSize: 10, color: i === 0 ? '#38bdf8' : '#34d399',
                              background: i === 0 ? 'rgba(56,189,248,0.08)' : 'rgba(52,211,153,0.08)',
                              border: `1px solid ${i === 0 ? 'rgba(56,189,248,0.2)' : 'rgba(52,211,153,0.2)'}`,
                              padding: '3px 10px', borderRadius: 4,
                              animation: 'dr-toast-in 0.4s ease',
                            }}>{u} saw output ✓</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scene 4: Chat */}
                {scene === 4 && (
                  <div className="dr-demo-scene" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
                    <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.25)', textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>// team chat · room {roomId}</div>
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-end', gap: 8,
                        flexDirection: m.user === 'Hamza' ? 'row-reverse' : 'row',
                        animation: 'dr-chat-in 0.4s cubic-bezier(0.23,1,0.32,1)',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${m.color}40, ${m.color}80)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                          border: `1px solid ${m.color}40`,
                        }}>{m.user[0]}</div>
                        <div style={{
                          maxWidth: '70%', padding: '9px 13px',
                          background: m.user === 'Hamza' ? 'rgba(56,189,248,0.1)' : 'rgba(52,211,153,0.08)',
                          border: `1px solid ${m.color}25`,
                          borderRadius: m.user === 'Hamza' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                          fontSize: 12, color: '#e2e8f0', lineHeight: 1.5,
                        }}>
                          {m.msg}
                          <div style={{ fontSize: 9, color: `${m.color}80`, marginTop: 4 }}>{m.user}</div>
                        </div>
                      </div>
                    ))}
                    {/* Message input mock */}
                    <div style={{
                      display: 'flex', gap: 8, marginTop: 8,
                      padding: '10px 12px',
                      background: 'rgba(2,6,14,0.8)', border: '1px solid rgba(56,189,248,0.12)',
                      borderRadius: 10,
                    }}>
                      <span style={{ color: 'rgba(148,163,184,0.2)', fontSize: 12, flex: 1 }}>Type a message...</span>
                      <span style={{ fontSize: 12, color: 'rgba(56,189,248,0.4)' }}>↵</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(56,189,248,0.08)', position: 'relative' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #0284c7, #38bdf8, #a78bfa)',
              transition: 'width 0.05s linear',
              boxShadow: '0 0 12px rgba(56,189,248,0.6)',
            }}/>
          </div>

          {/* Bottom scene nav */}
          <div style={{
            padding: '12px 22px',
            background: 'rgba(2,5,14,0.9)',
            display: 'flex', alignItems: 'center', gap: 8,
            borderTop: '1px solid rgba(56,189,248,0.06)',
          }}>
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => resetScene(i)}
                style={{
                  flex: 1, padding: '7px 6px', border: 'none', borderRadius: 7,
                  background: i === scene
                    ? 'rgba(56,189,248,0.12)'
                    : 'transparent',
                  borderTop: i === scene ? '1px solid rgba(56,189,248,0.35)' : '1px solid transparent',
                  color: i === scene ? '#38bdf8' : 'rgba(148,163,184,0.3)',
                  cursor: 'pointer', transition: 'all 0.25s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: i === scene ? 700 : 400 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}