import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WatchDemoModal from './WatchDemoModal';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';


const MAX_NAME_LEN   = 32;
const MAX_ROOMID_LEN = 20;


const sanitizeName   = (v) => v.replace(/[<>"'`;&]/g, '').slice(0, MAX_NAME_LEN);

const ROOM_ID_RE     = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;

const Home = () => {
  const [showDemo, setShowDemo] = useState(false);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const ring2Ref = useRef(null);
  const navigate = useNavigate();
  
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const [activeTab, setActiveTab] = useState('create');
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [nameError, setNameError] = useState(false);
  const [phase, setPhase] = useState(0); 
  const [typedCode, setTypedCode] = useState('');
  const [typedTogether, setTypedTogether] = useState('');

  const CODE_TEXT = 'Code';
  const TOGETHER_TEXT = 'Together.';

  
  useEffect(() => {
    let t1 = setTimeout(() => setPhase(1), 400);
    return () => clearTimeout(t1);
  }, []);

  
  useEffect(() => {
    if (phase < 1) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedCode(CODE_TEXT.slice(0, i));
      if (i >= CODE_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => setPhase(2), 200);
      }
    }, 90);
    return () => clearInterval(interval);
  }, [phase]);

  
  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedTogether(TOGETHER_TEXT.slice(0, i));
      if (i >= TOGETHER_TEXT.length) clearInterval(interval);
    }, 75);
    return () => clearInterval(interval);
  }, [phase]);

  
  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0, r2x = 0, r2y = 0, animId;
    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      mousePos.current = { x: mx, y: my };
      if (cursorRef.current) {
        cursorRef.current.style.left = mx - 6 + 'px';
        cursorRef.current.style.top = my - 6 + 'px';
      }
    };
    const loop = () => {
      rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
      r2x += (mx - r2x) * 0.06; r2y += (my - r2y) * 0.06;
      if (ringRef.current) { ringRef.current.style.left = rx - 18 + 'px'; ringRef.current.style.top = ry - 18 + 'px'; }
      if (ring2Ref.current) { ring2Ref.current.style.left = r2x - 32 + 'px'; ring2Ref.current.style.top = r2y - 32 + 'px'; }
      animId = requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mousemove', onMove);
    
    return () => { cancelAnimationFrame(animId); document.removeEventListener('mousemove', onMove); };
  }, []);

  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    
    const particles = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      r: Math.random() * 2.2 + 0.4,
      baseAlpha: Math.random() * 0.5 + 0.1,
      alpha: Math.random() * 0.5 + 0.1,
      hue: Math.random() < 0.2 ? 280 : 200,
    }));

    
    const orbs = [
      { x: canvas.width*0.15, y: canvas.height*0.3,  r:320, color:'rgba(14,165,233,0.08)',  vx:0.12,  vy:0.08  },
      { x: canvas.width*0.8,  y: canvas.height*0.6,  r:250, color:'rgba(139,92,246,0.07)',  vx:-0.1,  vy:0.15  },
      { x: canvas.width*0.5,  y: canvas.height*0.85, r:200, color:'rgba(2,132,199,0.07)',   vx:0.08,  vy:-0.12 },
      { x: canvas.width*0.9,  y: canvas.height*0.1,  r:180, color:'rgba(56,189,248,0.05)',  vx:-0.14, vy:0.1   },
    ];

    
    const wormhole = {
      x: canvas.width * 0.78, y: canvas.height * 0.18,
      rings: Array.from({length:8},(_,i)=>({ r:28+i*26, alpha:0.03+i*0.012, rot:i*0.4 }))
    };

    
    const spawnMeteor = () => ({
      x: Math.random() * canvas.width * 1.4 - canvas.width * 0.2,
      y: -20,
      vx: 1.8 + Math.random() * 2.2,
      vy: 2.5 + Math.random() * 3,
      len: 80 + Math.random() * 140,
      alpha: 0.6 + Math.random() * 0.4,
      r: 0.8 + Math.random() * 1.2,
      color: Math.random() < 0.3 ? '167,139,250' : '56,189,248',
      dead: false,
    });
    const meteors = Array.from({length:6}, spawnMeteor);
    meteors.forEach((m,i) => { m.y = -200 - i * 300; });

    
    const pings = [
      { x: canvas.width * 0.2,  y: canvas.height * 0.7,  r:0, maxR:220, speed:0.9, alpha:0.3, phase: 0        },
      { x: canvas.width * 0.85, y: canvas.height * 0.45, r:0, maxR:180, speed:1.1, alpha:0.25, phase: Math.PI  },
      { x: canvas.width * 0.5,  y: canvas.height * 0.1,  r:0, maxR:260, speed:0.7, alpha:0.2, phase: Math.PI/2 },
    ];

    
    const COLS = Math.floor(canvas.width / 28);
    const rain = Array.from({length: COLS}, (_, i) => ({
      x: i * 28 + 14,
      y: Math.random() * canvas.height,
      speed: 0.4 + Math.random() * 0.9,
      chars: Array.from({length: 6+Math.floor(Math.random()*8)}, () =>
        String.fromCharCode(0x30 + Math.floor(Math.random()*10))
      ),
      alpha: 0.04 + Math.random() * 0.06,
      len: 5 + Math.floor(Math.random() * 10),
    }));

    
    const dna = {
      x: canvas.width * 0.06,
      baseY: canvas.height * 0.5,
      height: canvas.height * 0.7,
      strands: 20,
    };

  
    const arcs = Array.from({length:4}, () => ({
      x1: Math.random() * canvas.width,
      y1: Math.random() * canvas.height,
      x2: Math.random() * canvas.width,
      y2: Math.random() * canvas.height,
      timer: 0,
      interval: 80 + Math.floor(Math.random() * 120),
      active: false,
      life: 0,
      maxLife: 8,
    }));

    
    const gridSpacing = 90;
    const nodes = [];
    for (let gx = gridSpacing; gx < canvas.width; gx += gridSpacing) {
      for (let gy = gridSpacing; gy < canvas.height; gy += gridSpacing) {
        if (Math.random() < 0.18) {
          nodes.push({ x: gx, y: gy, phase: Math.random() * Math.PI * 2, speed: 0.015 + Math.random() * 0.02 });
        }
      }
    }

    let t = 0;
    let animId;

    
    const drawHexGrid = () => {
      const hexSize = 40;
      const w = hexSize * 2;
      const h = Math.sqrt(3) * hexSize;
      ctx.lineWidth = 0.8;
      for (let row = -1; row < canvas.height / h + 1; row++) {
        for (let col = -1; col < canvas.width / w + 1; col++) {
          const cx = col * w * 0.75;
          const cy = row * h + (col % 2 === 0 ? 0 : h / 2);
          const pulse = Math.sin(t * 0.8 + col * 0.3 + row * 0.5) * 0.5 + 0.5;
          ctx.strokeStyle = `rgba(56,189,248,${0.018 + pulse * 0.022})`;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = cx + hexSize * Math.cos(angle);
            const py = cy + hexSize * Math.sin(angle);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
    };

    
    const drawLightning = (x1, y1, x2, y2, alpha, depth) => {
      if (depth === 0) return;
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 40;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 40;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my);
      ctx.strokeStyle = `rgba(167,139,250,${alpha})`; ctx.lineWidth = depth * 0.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(56,189,248,${alpha})`; ctx.lineWidth = depth * 0.5; ctx.stroke();
      if (depth > 1 && Math.random() < 0.5) drawLightning(mx, my, mx + (Math.random()-0.5)*80, my + (Math.random()-0.5)*80, alpha*0.6, depth-1);
    };

    
    const draw = () => {
      t += 0.012;

      
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#020612'); grad.addColorStop(0.45, '#060b1c'); grad.addColorStop(1, '#08112a');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawHexGrid();

      
      const scanY = ((t * 40) % (canvas.height + 120)) - 60;
      const scanGrad = ctx.createLinearGradient(0, scanY - 70, 0, scanY + 70);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.45, 'rgba(56,189,248,0.022)');
      scanGrad.addColorStop(0.5,  'rgba(56,189,248,0.045)');
      scanGrad.addColorStop(0.55, 'rgba(56,189,248,0.022)');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, Math.max(0, scanY - 70), canvas.width, 140);

      
      wormhole.rings.forEach((ring, i) => {
        ring.rot += 0.008 + i * 0.003;
        const pulse = Math.sin(t * 2 + i * 0.5) * 0.02 + ring.alpha;
        ctx.save();
        ctx.translate(wormhole.x, wormhole.y);
        ctx.rotate(ring.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.r, ring.r * 0.38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139,92,246,${pulse})`;
        ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, ring.r, ring.rot, ring.rot + 0.8);
        ctx.strokeStyle = `rgba(56,189,248,${pulse * 2})`;
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      });

      
      orbs.forEach(orb => {
        orb.x += orb.vx; orb.y += orb.vy;
        if (orb.x < -orb.r) orb.x = canvas.width + orb.r;
        if (orb.x > canvas.width + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = canvas.height + orb.r;
        if (orb.y > canvas.height + orb.r) orb.y = -orb.r;
        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        g.addColorStop(0, orb.color); g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });

      
      pings.forEach(p => {
        p.r = ((t * p.speed * 30 + p.phase * 30) % p.maxR);
        const fade = 1 - p.r / p.maxR;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56,189,248,${p.alpha * fade})`;
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(167,139,250,${p.alpha * 0.5 * fade})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      });

      
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      rain.forEach(col => {
        col.y += col.speed;
        if (col.y > canvas.height + 200) col.y = -Math.random() * canvas.height;
        col.chars.forEach((ch, i) => {
          const cy = col.y - i * 16;
          if (cy < 0 || cy > canvas.height) return;
          const brightness = i === 0 ? col.alpha * 3 : col.alpha * (1 - i / col.len);
          ctx.fillStyle = i === 0
            ? `rgba(56,189,248,${Math.min(brightness, 0.5)})`
            : `rgba(56,189,248,${Math.max(brightness, 0)})`;
          ctx.fillText(ch, col.x, cy);
        });
        if (Math.random() < 0.02) {
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = String.fromCharCode(0x30 + Math.floor(Math.random() * 10));
        }
      });

      
      for (let i = 0; i < dna.strands; i++) {
        const progress = i / dna.strands;
        const yPos = dna.baseY - dna.height / 2 + progress * dna.height;
        const wave = Math.sin(t * 1.2 + progress * Math.PI * 4);
        const x1 = dna.x + wave * 22;
        const x2 = dna.x - wave * 22;
        const alpha = 0.12 + Math.abs(wave) * 0.1;
        ctx.beginPath(); ctx.arc(x1, yPos, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x2, yPos, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${alpha})`; ctx.fill();
        if (i % 3 === 0) {
          ctx.beginPath(); ctx.moveTo(x1, yPos); ctx.lineTo(x2, yPos);
          ctx.strokeStyle = `rgba(56,189,248,${alpha * 0.6})`;
          ctx.lineWidth = 0.8; ctx.stroke();
        }
      }

      
      meteors.forEach((m, idx) => {
        m.x += m.vx; m.y += m.vy;
        if (m.y > canvas.height + 40 || m.x > canvas.width + 40) {
          meteors[idx] = spawnMeteor();
          meteors[idx].y = -20;
          return;
        }
        const angle = Math.atan2(m.vy, m.vx);
        const tailX = m.x - Math.cos(angle) * m.len;
        const tailY = m.y - Math.sin(angle) * m.len;
        const g = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        g.addColorStop(0, 'transparent');
        g.addColorStop(1, `rgba(${m.color},${m.alpha})`);
        ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = g; ctx.lineWidth = m.r; ctx.stroke();
        const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6);
        hg.addColorStop(0, `rgba(${m.color},${m.alpha})`);
        hg.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = hg; ctx.fill();
      });

      
      arcs.forEach(arc => {
        arc.timer++;
        if (arc.timer >= arc.interval) {
          arc.timer = 0;
          arc.active = true; arc.life = 0;
          arc.x1 = Math.random() * canvas.width; arc.y1 = Math.random() * canvas.height;
          arc.x2 = arc.x1 + (Math.random()-0.5) * 300; arc.y2 = arc.y1 + (Math.random()-0.5) * 300;
        }
        if (arc.active) {
          arc.life++;
          const a = 0.3 * (1 - arc.life / arc.maxLife);
          drawLightning(arc.x1, arc.y1, arc.x2, arc.y2, a, 3);
          if (arc.life >= arc.maxLife) arc.active = false;
        }
      });

      
      nodes.forEach(n => {
        n.phase += n.speed;
        const s = Math.sin(n.phase) * 0.5 + 0.5;
        const r = 2 + s * 3;
        const a = 0.08 + s * 0.18;
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        ng.addColorStop(0, `rgba(56,189,248,${a})`);
        ng.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${a * 2})`; ctx.fill();
      });

      
      for (let i = 0; i < 5; i++) {
        const streamX = ((t * 70 + i * 280) % (canvas.width + 400)) - 200;
        const sg = ctx.createLinearGradient(streamX - 90, 0, streamX + 90, 0);
        sg.addColorStop(0, 'transparent');
        sg.addColorStop(0.5, 'rgba(56,189,248,0.035)');
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.save(); ctx.transform(1, 0, -0.45, 1, 0, 0);
        ctx.fillRect(streamX - 90, 0, 180, canvas.height);
        ctx.restore();
      }

    
      const mx = mousePos.current.x, my = mousePos.current.y;
      particles.forEach(p => {
        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          p.x += (dx / dist) * force * 3;
          p.y += (dy / dist) * force * 3;
          p.alpha = Math.min(1, p.baseAlpha + force * 0.7);
        } else {
          p.alpha += (p.baseAlpha - p.alpha) * 0.04;
        }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        const pulse = Math.sin(t * 3 + p.x * 0.02) * 0.35 + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.hue === 280 ? `rgba(167,139,250,${p.alpha})` : `rgba(56,189,248,${p.alpha})`;
        ctx.fill();
      });

      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            const a = 0.12 * (1 - d / 120);
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            const mixed = particles[i].hue === 280 || particles[j].hue === 280;
            ctx.strokeStyle = mixed ? `rgba(167,139,250,${a})` : `rgba(56,189,248,${a})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

    
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 170);
      mg.addColorStop(0, 'rgba(56,189,248,0.1)');
      mg.addColorStop(0.5, 'rgba(139,92,246,0.04)');
      mg.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(mx, my, 170, 0, Math.PI * 2);
      ctx.fillStyle = mg; ctx.fill();

      const rippleR = 28 + Math.sin(t * 4) * 14;
      ctx.beginPath(); ctx.arc(mx, my, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56,189,248,${0.14 + Math.sin(t * 4) * 0.07})`;
      ctx.lineWidth = 1; ctx.stroke();

      animId = requestAnimationFrame(draw);
    };
    draw();
    
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading]     = useState(false);
  const [joinError, setJoinError]         = useState('');
  const [createError, setCreateError]     = useState('');
  
  const createInFlight = useRef(false);
  const joinInFlight   = useRef(false);

  const handleCreateRoom = async () => {
    
    const trimmed = createName.trim().slice(0, MAX_NAME_LEN);
    if (!trimmed) { setNameError(true); return; }
   
    if (createInFlight.current) return;
   
    createInFlight.current = true;
    setCreateError('');
    setCreateLoading(true);

    const roomId = Math.random().toString(36).substring(2, 9).toLowerCase();

  
    let navigateTo = null;
    try {
      
      const res = await fetch(`${API_BASE}/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Failed to create room.'); return; }
      
      navigateTo = `/room/${roomId}?username=${encodeURIComponent(trimmed)}`;
    } catch {
      setCreateError('Cannot reach server. Is it running?');
    } finally {
      setCreateLoading(false);
      createInFlight.current = false;
    }
    
    if (navigateTo) navigate(navigateTo);
  };

  const handleJoinRoom = async () => {
    
    const trimmedName   = joinName.trim().slice(0, MAX_NAME_LEN);
    const trimmedRoomId = joinRoomId.trim().toLowerCase().slice(0, MAX_ROOMID_LEN);

    if (!trimmedName)   { setJoinError('Please enter your name.'); return; }
    if (!trimmedRoomId) { setJoinError('Please enter a Room ID.'); return; }

    
    if (!ROOM_ID_RE.test(trimmedRoomId)) {
      setJoinError('Invalid Room ID format. Use only letters, numbers, and hyphens.');
      return;
    }

    
    if (joinInFlight.current) return;
    
    if (joinLoading) return;
    joinInFlight.current = true;
    setJoinError('');
    setJoinLoading(true);

    
    let navigateTo = null;
    try {
      
      const res  = await fetch(`${API_BASE}/room-exists/${trimmedRoomId}`);
      const data = await res.json();
      if (!data.exists) {
        setJoinError('Room not found. Check the ID or create a new room.');
        return;
      }
      
      navigateTo = `/room/${trimmedRoomId}?username=${encodeURIComponent(trimmedName)}`;
    } catch {
      setJoinError('Cannot reach server. Is it running?');
    } finally {
      setJoinLoading(false);
      joinInFlight.current = false;
    }
    
    if (navigateTo) navigate(navigateTo);
  };

  const ce = (e) => {
    if (cursorRef.current) cursorRef.current.style.transform = 'scale(2.2)';
    if (ringRef.current) { ringRef.current.style.transform = 'scale(1.6)'; ringRef.current.style.borderColor = 'rgba(56,189,248,1)'; }
    if (ring2Ref.current) { ring2Ref.current.style.transform = 'scale(1.3)'; ring2Ref.current.style.opacity = '0.5'; }
  };
  const cl = () => {
    if (cursorRef.current) cursorRef.current.style.transform = 'scale(1)';
    if (ringRef.current) { ringRef.current.style.transform = 'scale(1)'; ringRef.current.style.borderColor = 'rgba(56,189,248,0.55)'; }
    if (ring2Ref.current) { ring2Ref.current.style.transform = 'scale(1)'; ring2Ref.current.style.opacity = '0.25'; }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Orbitron:wght@700;800;900&display=swap');

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior: smooth; }

        :root {
          --c-bg:    #020612;
          --c-sky:   #38bdf8;
          --c-blue:  #0ea5e9;
          --c-deep:  #0284c7;
          --c-violet:#a78bfa;
          --c-border: rgba(56,189,248,0.14);
          --c-text:  rgba(148,163,184,0.7);
        }

        /* ── CURSOR ── */
        .dr-cursor {
          position:fixed; width:10px; height:10px;
          background:#38bdf8; border-radius:50%;
          pointer-events:none; z-index:9999;
          transition:transform 0.15s ease;
          box-shadow: 0 0 8px #38bdf8, 0 0 20px rgba(56,189,248,0.6);
          mix-blend-mode: screen;
        }
        .dr-ring {
          position:fixed; width:34px; height:34px;
          border:1.5px solid rgba(56,189,248,0.55); border-radius:50%;
          pointer-events:none; z-index:9998;
          transition:transform 0.12s ease, border-color 0.2s;
        }
        .dr-ring2 {
          position:fixed; width:62px; height:62px;
          border:1px solid rgba(56,189,248,0.18); border-radius:50%;
          pointer-events:none; z-index:9997;
          opacity:0.25;
          transition:transform 0.25s ease, opacity 0.2s;
        }

        /* ── WRAP ── */
        .dr-wrap {
          background: transparent;
          font-family: 'Rajdhani', sans-serif;
          color: #f0f9ff;
          overflow-x: hidden;
          cursor: none;
          min-height: 100vh;
        }

        /* ── NAV ── */
        .dr-nav {
          position:fixed; top:0; left:0; right:0; z-index:100;
          padding:16px 60px;
          display:flex; align-items:center; justify-content:space-between;
          background: rgba(2,6,18,0.75);
          backdrop-filter: blur(28px);
          border-bottom: 1px solid rgba(56,189,248,0.12);
          animation: navSlide 0.9s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes navSlide { from{transform:translateY(-100%);opacity:0;} to{transform:translateY(0);opacity:1;} }

        .dr-nav-logo { display:flex; align-items:center; gap:12px; text-decoration:none; cursor:none; }
        .dr-logo-icon {
          width:40px; height:40px;
          background: linear-gradient(145deg,#0c4a6e,#0284c7);
          border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          position:relative; overflow:hidden;
          animation: logoPulse 2.8s ease-in-out infinite;
        }
        .dr-logo-icon::after {
          content:'';
          position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,0.2),transparent);
          animation:shimmer 3s ease-in-out infinite;
        }
        @keyframes logoPulse {
          0%   { box-shadow:0 0 0 0 rgba(14,165,233,0.7); }
          70%  { box-shadow:0 0 0 14px rgba(14,165,233,0); }
          100% { box-shadow:0 0 0 0 rgba(14,165,233,0); }
        }
        .dr-brand {
          font-family:'Orbitron',sans-serif; font-size:18px; font-weight:800;
          background:linear-gradient(135deg,#38bdf8,#a78bfa);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          letter-spacing:2px;
        }
        .dr-nav-links { display:flex; align-items:center; gap:44px; list-style:none; }
        .dr-nav-links a {
          text-decoration:none; color:rgba(148,163,184,0.65);
          font-size:15px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
          transition:color 0.3s; position:relative; cursor:none;
          font-family:'JetBrains Mono',monospace; font-size:12px;
        }
        .dr-nav-links a::before {
          content:''; position:absolute; bottom:-4px; left:0;
          width:0; height:1px;
          background:linear-gradient(90deg,#38bdf8,#a78bfa);
          transition:width 0.35s;
        }
        .dr-nav-links a:hover { color:#38bdf8; }
        .dr-nav-links a:hover::before { width:100%; }
        .dr-nav-cta {
          padding:10px 26px;
          background:transparent;
          border:1px solid rgba(56,189,248,0.5);
          border-radius:6px; color:#38bdf8;
          font-size:12px; font-weight:700; cursor:none;
          font-family:'JetBrains Mono',monospace;
          letter-spacing:1.5px; text-transform:uppercase;
          transition:all 0.3s; position:relative; overflow:hidden;
        }
        .dr-nav-cta::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(56,189,248,0.1),rgba(167,139,250,0.1));
          opacity:0; transition:opacity 0.3s;
        }
        .dr-nav-cta:hover { border-color:#38bdf8; box-shadow:0 0 20px rgba(56,189,248,0.25); }
        .dr-nav-cta:hover::before { opacity:1; }

        /* ── HERO ── */
        .dr-hero {
          min-height:100vh;
          display:flex; align-items:center; justify-content:center;
          text-align:center;
          padding:120px 40px 80px;
          position:relative;
        }

        /* badge */
        .dr-badge {
          display:inline-flex; align-items:center; gap:10px;
          padding:7px 22px;
          background: rgba(56,189,248,0.05);
          border:1px solid rgba(56,189,248,0.2);
          border-radius:3px;
          font-size:11px; color:rgba(56,189,248,0.8);
          margin-bottom:52px;
          font-family:'JetBrains Mono',monospace; letter-spacing:2px; text-transform:uppercase;
          animation: fadeUp 0.8s ease 0.3s both;
          position:relative; overflow:hidden;
        }
        .dr-badge::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(56,189,248,0.08),transparent);
          animation:shimmer 3s ease-in-out infinite;
        }
        .dr-badge-dot { width:6px; height:6px; background:#38bdf8; border-radius:50%; animation:blink 1.4s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.1;} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px);} to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{transform:translateX(-100%);} 100%{transform:translateX(300%);} }

        /* ── BIG TITLE ── */
        .dr-title-wrap { margin-bottom: 12px; }

        .dr-word-code {
          display:block;
          font-family:'Orbitron',sans-serif;
          font-size: clamp(80px, 13vw, 158px);
          font-weight:900;
          letter-spacing:-3px;
          line-height:0.9;
          position:relative;
        }
        .dr-word-together {
          display:block;
          font-family:'Orbitron',sans-serif;
          font-size: clamp(55px, 9.5vw, 118px);
          font-weight:900;
          letter-spacing:-2px;
          line-height:0.95;
          margin-bottom:48px;
          position:relative;
        }

        .dr-word-code .dr-typed-text {
          background: linear-gradient(180deg,
            #ffffff 0%,
            #e0f2fe 30%,
            #7dd3fc 60%,
            #0ea5e9 100%
          );
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          filter: drop-shadow(0 0 40px rgba(56,189,248,0.35));
          position:relative;
        }
        .dr-word-together .dr-typed-text {
          background: linear-gradient(180deg,
            #7dd3fc 0%,
            #38bdf8 35%,
            #0ea5e9 70%,
            #0284c7 100%
          );
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          filter: drop-shadow(0 0 40px rgba(56,189,248,0.45));
        }

        .dr-type-cursor {
          display:inline-block;
          width:3px; height:0.85em;
          background:#38bdf8;
          margin-left:4px;
          vertical-align:middle;
          animation:curBlink 0.75s step-end infinite;
          border-radius:1px;
          box-shadow:0 0 8px #38bdf8;
        }
        .dr-type-cursor.violet { background:#38bdf8; box-shadow:0 0 8px #38bdf8; }
        @keyframes curBlink { 0%,100%{opacity:1;} 50%{opacity:0;} }

        .dr-glitch-wrap { position:relative; display:inline-block; }
        .dr-glitch-wrap .g-copy {
          position:absolute; top:0; left:0;
          font-family:'Orbitron',sans-serif; font-weight:900;
          font-size:inherit; letter-spacing:inherit;
          pointer-events:none;
        }
        .dr-glitch-wrap .g-copy-1 {
          background:linear-gradient(135deg,#f0abfc,#e879f9);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          animation:glitch1 6s infinite;
          clip-path:polygon(0 20%,100% 20%,100% 40%,0 40%);
        }
        .dr-glitch-wrap .g-copy-2 {
          background:linear-gradient(135deg,#34d399,#10b981);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          animation:glitch2 6s infinite;
          clip-path:polygon(0 62%,100% 62%,100% 80%,0 80%);
        }
        @keyframes glitch1 { 0%,86%,100%{opacity:0;transform:translate(0);} 87%{opacity:0.7;transform:translate(-5px,2px);} 90%{opacity:0;transform:translate(4px,-2px);} 93%{opacity:0.5;transform:translate(-3px,0);} }
        @keyframes glitch2 { 0%,89%,100%{opacity:0;transform:translate(0);} 90%{opacity:0.6;transform:translate(5px,2px);} 93%{opacity:0;transform:translate(-4px,2px);} 96%{opacity:0.4;transform:translate(3px,0);} }

        .dr-sub {
          font-size: clamp(15px,1.8vw,19px);
          color: rgba(148,163,184,0.7);
          max-width:520px; margin:0 auto 56px;
          line-height:1.75; font-weight:400;
          font-family:'Rajdhani',sans-serif;
          animation: fadeUp 0.8s ease 1.4s both;
          letter-spacing:0.3px;
        }
        .dr-sub span { color:#38bdf8; font-weight:700; }

        .dr-float {
          position:absolute; pointer-events:none;
          animation:float3d 7s ease-in-out infinite;
        }
        @keyframes float3d {
          0%,100%{transform:translateY(0) rotate(0deg);}
          33%{transform:translateY(-20px) rotate(3deg);}
          66%{transform:translateY(12px) rotate(-2deg);}
        }
        .dr-float-code {
          font-family:'JetBrains Mono',monospace;
          font-size:11px; color:rgba(56,189,248,0.2); line-height:1.8;
          background:rgba(2,6,18,0.7); border:1px solid rgba(56,189,248,0.1);
          border-radius:8px; padding:10px 14px;
          backdrop-filter:blur(8px);
        }
        .dr-float-hex {
          width:52px; height:60px;
          clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          background:rgba(56,189,248,0.06);
          border:1px solid rgba(56,189,248,0.12);
          display:flex; align-items:center; justify-content:center;
        }

        /* ── CARD ── */
        .dr-card {
          max-width:440px; margin:0 auto;
          background:rgba(4,8,20,0.92);
          backdrop-filter:blur(44px);
          border:1px solid rgba(56,189,248,0.15);
          border-radius:16px; padding:34px;
          box-shadow:0 0 0 1px rgba(56,189,248,0.03),0 40px 80px rgba(0,0,0,0.7),0 0 100px rgba(14,165,233,0.06);
          animation: fadeUp 0.8s ease 1s both;
          position:relative; overflow:hidden;
        }
        .dr-card::before {
          content:''; position:absolute; inset:-1px;
          border-radius:16px;
          background:conic-gradient(from var(--angle,0deg),transparent 80%,rgba(56,189,248,0.2) 88%,rgba(167,139,250,0.2) 94%,transparent 100%);
          animation:rotateBorder 4s linear infinite;
          z-index:0;
        }
        .dr-card::after {
          content:''; position:absolute; inset:1px;
          border-radius:15px;
          background:rgba(4,8,20,0.96);
          z-index:1;
        }
        @property --angle { syntax:'<angle>'; initial-value:0deg; inherits:false; }
        @keyframes rotateBorder { to{--angle:360deg;} }
        .dr-card-inner { position:relative; z-index:2; }

        .dr-tabs {
          display:flex; gap:4px; margin-bottom:24px;
          background:rgba(2,6,18,0.8); border-radius:8px; padding:4px;
          border:1px solid rgba(56,189,248,0.08);
        }
        .dr-tab {
          flex:1; padding:10px; border:none; border-radius:5px;
          font-family:'JetBrains Mono',monospace;
          font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
          cursor:none; transition:all 0.3s;
          color:rgba(148,163,184,0.45); background:transparent;
        }
        .dr-tab.active {
          background:linear-gradient(135deg,#0c4a6e,#0284c7);
          color:white; box-shadow:0 4px 16px rgba(14,165,233,0.3);
        }
        .dr-label {
          display:block; font-size:10px; font-weight:700;
          letter-spacing:3px; text-transform:uppercase;
          color:rgba(56,189,248,0.55); margin-bottom:8px;
          font-family:'JetBrains Mono',monospace;
        }
        .dr-input {
          width:100%; padding:12px 16px;
          background:rgba(2,6,18,0.8);
          border:1px solid rgba(56,189,248,0.14);
          border-radius:8px; color:white;
          font-size:14px; font-family:'Rajdhani',sans-serif;
          font-weight:600; letter-spacing:0.5px;
          outline:none; transition:all 0.3s; margin-bottom:14px;
        }
        .dr-input::placeholder { color:rgba(148,163,184,0.25); }
        .dr-input:focus { border-color:#38bdf8; box-shadow:0 0 0 3px rgba(56,189,248,0.08),0 0 20px rgba(56,189,248,0.05); }
        .dr-input.error { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1); animation:shake 0.4s ease; }
        @keyframes shake { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-6px);} 40%,80%{transform:translateX(6px);} }

        .dr-btn-primary {
          width:100%; padding:14px;
          background:linear-gradient(135deg,#0c4a6e,#0284c7,#0ea5e9);
          border:none; border-radius:8px; color:white;
          font-size:12px; font-weight:700; cursor:none;
          font-family:'JetBrains Mono',monospace;
          letter-spacing:2px; text-transform:uppercase;
          transition:all 0.3s; position:relative; overflow:hidden;
          box-shadow:0 8px 28px rgba(14,165,233,0.3); margin-top:4px;
        }
        .dr-btn-primary::before {
          content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);
          transition:left 0.4s;
        }
        .dr-btn-primary:hover::before { left:100%; }
        .dr-btn-primary:hover { transform:translateY(-2px); box-shadow:0 14px 36px rgba(14,165,233,0.5); }

        .dr-divider { display:flex; align-items:center; gap:14px; margin:14px 0; }
        .dr-divider-line { flex:1; height:1px; background:rgba(56,189,248,0.08); }
        .dr-divider-text { font-size:10px; color:rgba(148,163,184,0.3); font-family:'JetBrains Mono',monospace; letter-spacing:2px; }

        /* ── TERMINAL ── */
        .dr-terminal { max-width:820px; margin:60px auto 0; animation:fadeUp 0.8s ease 1.2s both; }
        .dr-terminal-window {
          background:rgba(2,5,14,0.98);
          border:1px solid rgba(56,189,248,0.14);
          border-radius:12px; overflow:hidden;
          box-shadow:0 40px 80px rgba(0,0,0,0.7),0 0 80px rgba(14,165,233,0.06);
          position:relative;
        }
        .dr-terminal-window::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(56,189,248,0.5),rgba(167,139,250,0.5),transparent);
          animation:scanH 3s ease-in-out infinite;
        }
        @keyframes scanH { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
        .dr-terminal-bar {
          padding:12px 18px;
          background:rgba(4,8,20,0.98);
          border-bottom:1px solid rgba(56,189,248,0.1);
          display:flex; align-items:center; gap:8px;
        }
        .dr-t-dot { width:12px; height:12px; border-radius:50%; }
        .dr-t-title { flex:1; text-align:center; font-family:'JetBrains Mono',monospace; font-size:10px; color:rgba(148,163,184,0.4); letter-spacing:1px; }
        .dr-t-users { display:flex; gap:7px; }
        .dr-t-user { display:flex; align-items:center; gap:5px; padding:3px 9px; border-radius:4px; font-size:10px; font-family:'JetBrains Mono',monospace; }
        .dr-u-dot { width:6px; height:6px; border-radius:50%; animation:blink 2s ease-in-out infinite; }
        .dr-code-area { padding:20px 24px; font-family:'JetBrains Mono',monospace; font-size:12.5px; line-height:2; display:grid; grid-template-columns:28px 1fr; gap:0 16px; }
        .dr-ln { color:rgba(148,163,184,0.18); text-align:right; user-select:none; font-size:11px; }
        .kw{color:#c792ea;} .fn{color:#82aaff;} .str{color:#c3e88d;} .num{color:#f78c6c;} .cm{color:rgba(148,163,184,0.3);} .vr{color:#38bdf8;}
        .dr-cur { display:inline-block; width:2px; height:1em; background:#38bdf8; margin-left:1px; vertical-align:text-bottom; animation:curBlink 1s ease-in-out infinite; }
        .dr-clabel { position:absolute; top:-22px; font-size:9px; padding:2px 7px; border-radius:3px; white-space:nowrap; font-family:'JetBrains Mono',monospace; font-weight:700; letter-spacing:1px; }

        /* ── STATS ── */
        .dr-stats { padding:70px 60px; border-top:1px solid rgba(56,189,248,0.08); border-bottom:1px solid rgba(56,189,248,0.08); position:relative; }
        .dr-stats::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(56,189,248,0.02),transparent); animation:scanH 4s ease-in-out infinite; }
        .dr-stats-inner { max-width:900px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:40px; text-align:center; }
        .dr-stat { position:relative; }
        .dr-stat::before { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:80px; height:80px; border-radius:50%; background:radial-gradient(circle,rgba(56,189,248,0.07),transparent 70%); pointer-events:none; }
        .dr-stat-num {
          font-family:'Orbitron',sans-serif; font-size:44px; font-weight:900;
          background:linear-gradient(135deg,#38bdf8,#a78bfa);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          line-height:1; margin-bottom:10px;
          animation:countPulse 3s ease-in-out infinite;
        }
        @keyframes countPulse { 0%,100%{filter:drop-shadow(0 0 6px rgba(56,189,248,0.3));} 50%{filter:drop-shadow(0 0 16px rgba(56,189,248,0.6));} }
        .dr-stat-label { font-size:12px; color:rgba(148,163,184,0.5); font-family:'JetBrains Mono',monospace; letter-spacing:2px; text-transform:uppercase; }

        /* ── FEATURES ── */
        .dr-features { padding:110px 60px; max-width:1400px; margin:0 auto; }
        .dr-sec-header { text-align:center; margin-bottom:72px; }
        .dr-sec-badge { display:inline-block; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:4px; color:#38bdf8; text-transform:uppercase; margin-bottom:18px; opacity:0.7; }
        .dr-sec-title {
          font-family:'Orbitron',sans-serif; font-size:clamp(28px,3.8vw,48px);
          font-weight:900; line-height:1.2; letter-spacing:-1px;
          background:linear-gradient(135deg,white 0%,#bae6fd 55%,#a78bfa 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          position:relative;
        }
        .dr-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .dr-feat-card {
          background:rgba(4,8,20,0.8);
          border:1px solid rgba(56,189,248,0.1);
          border-radius:14px; padding:30px;
          transition:all 0.4s cubic-bezier(0.23,1,0.32,1);
          position:relative; overflow:hidden; cursor:none;
        }
        .dr-feat-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(56,189,248,0.4),transparent);
          opacity:0; transition:opacity 0.4s;
        }
        .dr-feat-card::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(56,189,248,0.04),rgba(167,139,250,0.04));
          opacity:0; transition:opacity 0.4s;
        }
        .dr-feat-card:hover { border-color:rgba(56,189,248,0.3); transform:translateY(-8px); box-shadow:0 24px 60px rgba(0,0,0,0.5),0 0 50px rgba(14,165,233,0.08); }
        .dr-feat-card:hover::before { opacity:1; }
        .dr-feat-card:hover::after { opacity:1; }
        .dr-feat-card.featured { grid-column:span 2; border-color:rgba(56,189,248,0.16); background:linear-gradient(135deg,rgba(12,74,110,0.22),rgba(4,8,20,0.85)); }
        .dr-feat-icon {
          width:46px; height:46px;
          background:linear-gradient(145deg,#0c4a6e,#1d4ed8);
          border-radius:10px; display:flex; align-items:center; justify-content:center;
          margin-bottom:18px; font-size:20px;
          box-shadow:0 8px 24px rgba(14,165,233,0.25);
          position:relative; overflow:hidden;
          animation:iconGlow 3s ease-in-out infinite;
        }
        @keyframes iconGlow { 0%,100%{box-shadow:0 8px 24px rgba(14,165,233,0.25);} 50%{box-shadow:0 8px 32px rgba(14,165,233,0.5),0 0 20px rgba(56,189,248,0.2);} }
        .dr-feat-title { font-family:'Orbitron',sans-serif; font-size:15px; font-weight:700; margin-bottom:10px; letter-spacing:0.5px; }
        .dr-feat-desc { font-size:14px; color:rgba(148,163,184,0.6); line-height:1.65; font-weight:400; }
        .dr-feat-tag { display:inline-block; margin-top:14px; padding:3px 10px; background:rgba(56,189,248,0.07); border:1px solid rgba(56,189,248,0.15); border-radius:4px; font-size:10px; font-family:'JetBrains Mono',monospace; color:#38bdf8; letter-spacing:1px; }

        /* ── LANGUAGES ── */
        .dr-langs { padding:110px 60px; text-align:center; overflow:hidden; }
        .dr-lang-track { display:flex; gap:12px; margin-top:16px; animation:scrollX 24s linear infinite; width:max-content; }
        .dr-lang-track.rev { animation-direction:reverse; animation-duration:28s; margin-top:10px; }
        @keyframes scrollX { from{transform:translateX(0);} to{transform:translateX(-50%);} }
        .dr-lang-pill { display:flex; align-items:center; gap:8px; padding:9px 18px; background:rgba(4,8,20,0.9); border:1px solid rgba(56,189,248,0.1); border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:12px; color:rgba(148,163,184,0.6); white-space:nowrap; letter-spacing:1px; }
        .dr-lang-dot { width:7px; height:7px; border-radius:50%; }

        /* ── CTA ── */
        .dr-cta { padding:110px 60px; text-align:center; position:relative; overflow:hidden; }
        .dr-cta::before {
          content:''; position:absolute; inset:0;
          background:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(14,165,233,0.08),transparent 70%);
          animation:breathe 5s ease-in-out infinite;
        }
        @keyframes breathe { 0%,100%{transform:scale(1);} 50%{transform:scale(1.1);} }
        .dr-cta-grid-overlay { position:absolute; inset:0; opacity:0.4; background-image:linear-gradient(rgba(56,189,248,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.04) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; }
        .dr-cta-title {
          font-family:'Orbitron',sans-serif;
          font-size:clamp(38px,6vw,72px);
          font-weight:900; letter-spacing:-2px; margin-bottom:20px;
          background:linear-gradient(135deg,white 0%,#38bdf8 50%,#a78bfa 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          position:relative; z-index:2;
          animation:countPulse 4s ease-in-out infinite;
        }
        .dr-cta-sub { font-size:17px; color:rgba(148,163,184,0.65); margin-bottom:44px; position:relative; z-index:2; font-family:'Rajdhani',sans-serif; font-weight:500; }
        .dr-cta-btns { display:flex; align-items:center; justify-content:center; gap:14px; position:relative; z-index:2; }
        .dr-btn-lg {
          padding:15px 44px; border-radius:8px;
          font-size:12px; font-weight:700; cursor:none;
          font-family:'JetBrains Mono',monospace;
          letter-spacing:2px; text-transform:uppercase;
          transition:all 0.3s; border:none; position:relative; overflow:hidden;
        }
        .dr-btn-lg::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent); transition:left 0.4s; }
        .dr-btn-lg:hover::before { left:100%; }
        .dr-btn-lg.primary { background:linear-gradient(135deg,#0284c7,#0ea5e9); color:white; box-shadow:0 8px 32px rgba(14,165,233,0.35); }
        .dr-btn-lg.primary:hover { transform:translateY(-3px); box-shadow:0 16px 48px rgba(14,165,233,0.55); }
        .dr-btn-lg.ghost { background:transparent; color:#38bdf8; border:1px solid rgba(56,189,248,0.3); }
        .dr-btn-lg.ghost:hover { background:rgba(56,189,248,0.06); transform:translateY(-2px); border-color:#38bdf8; }

        /* ── FOOTER ── */
        .dr-footer {
          padding:32px 60px;
          border-top:1px solid rgba(56,189,248,0.08);
          display:flex; align-items:center; justify-content:space-between;
        }
        .dr-footer-logo { display:flex; align-items:center; gap:10px; font-family:'Orbitron',sans-serif; font-size:16px; font-weight:800; background:linear-gradient(135deg,#38bdf8,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:2px; }
        .dr-footer-text { font-size:11px; color:rgba(148,163,184,0.28); font-family:'JetBrains Mono',monospace; letter-spacing:1px; }

        .dr-corner { position:absolute; width:14px; height:14px; border-color:rgba(56,189,248,0.6); border-style:solid; opacity:0; transition:opacity 0.3s; }
        .dr-feat-card:hover .dr-corner { opacity:1; }
        .dr-corner.tl { top:10px; left:10px; border-width:2px 0 0 2px; }
        .dr-corner.tr { top:10px; right:10px; border-width:2px 2px 0 0; }
        .dr-corner.bl { bottom:10px; left:10px; border-width:0 0 2px 2px; }
        .dr-corner.br { bottom:10px; right:10px; border-width:0 2px 2px 0; }

        .reveal { opacity:0; transform:translateY(40px); transition:opacity 0.8s cubic-bezier(0.23,1,0.32,1),transform 0.8s cubic-bezier(0.23,1,0.32,1); }
        .reveal.visible { opacity:1; transform:translateY(0); }

        .reveal-stagger > * { opacity:0; transform:translateY(30px); transition:opacity 0.6s ease,transform 0.6s ease; }
        .reveal-stagger.visible > *:nth-child(1){opacity:1;transform:none;transition-delay:0s;}
        .reveal-stagger.visible > *:nth-child(2){opacity:1;transform:none;transition-delay:0.1s;}
        .reveal-stagger.visible > *:nth-child(3){opacity:1;transform:none;transition-delay:0.2s;}
        .reveal-stagger.visible > *:nth-child(4){opacity:1;transform:none;transition-delay:0.3s;}
        .reveal-stagger.visible > *:nth-child(5){opacity:1;transform:none;transition-delay:0.4s;}
        .reveal-stagger.visible > *:nth-child(6){opacity:1;transform:none;transition-delay:0.5s;}

        .dr-hr { height:1px; background:linear-gradient(90deg,transparent,rgba(56,189,248,0.3),rgba(167,139,250,0.3),transparent); margin:0; border:none; }

        .dr-ambient-ring {
          position:absolute; border-radius:50%;
          border:1px solid transparent;
          pointer-events:none; top:50%; left:50%; transform:translate(-50%,-50%);
          animation:expandRing 4s ease-out infinite;
        }
        @keyframes expandRing {
          0%   { width:200px; height:200px; border-color:rgba(56,189,248,0.3); opacity:0.8; }
          100% { width:900px; height:900px; border-color:rgba(56,189,248,0); opacity:0; }
        }
      `}</style>

      <div ref={cursorRef} className="dr-cursor"/>
      <div ref={ringRef} className="dr-ring"/>
      <div ref={ring2Ref} className="dr-ring2"/>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,display:'block'}}/>

      <div className="dr-wrap" style={{position:'relative',zIndex:1,background:'transparent'}}>

        
        <nav className="dr-nav">
          <a href="/" className="dr-nav-logo" onMouseEnter={ce} onMouseLeave={cl}>
            <div className="dr-logo-icon">
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                <path d="M30 25L15 50L30 75" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M70 25L85 50L70 75" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="55" y1="20" x2="45" y2="80" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                <circle cx="50" cy="50" r="5" fill="white"/>
              </svg>
            </div>
            <span className="dr-brand">DevRoom</span>
          </a>
          <ul className="dr-nav-links">
            {['Features','Languages','Docs'].map(l => (
              <li key={l}><a href={l==='Features'?'#features':l==='Languages'?'#languages':'/'} onMouseEnter={ce} onMouseLeave={cl}>{l}</a></li>
            ))}
          </ul>
          <button className="dr-nav-cta" onMouseEnter={ce} onMouseLeave={cl} onClick={handleCreateRoom}>
            &gt; Start_Coding_Free
          </button>
        </nav>

        
        <section className="dr-hero">
          <div className="dr-ambient-ring" style={{animationDelay:'0s'}}/>
          <div className="dr-ambient-ring" style={{animationDelay:'1.3s'}}/>
          <div className="dr-ambient-ring" style={{animationDelay:'2.6s'}}/>

          <div className="dr-float" style={{top:'14%',left:'5%',animationDelay:'0s'}}>
            <div className="dr-float-code">const room =<br/>  await create()<br/><span style={{color:'rgba(167,139,250,0.3)'}}>{'//'} 3 devs online</span></div>
          </div>
          <div className="dr-float" style={{top:'16%',right:'5%',animationDelay:'2.2s'}}>
            <div className="dr-float-code">socket.on(<br/>  'code-sync',<br/>  syncAll<br/>)</div>
          </div>
          <div className="dr-float" style={{bottom:'24%',left:'4%',animationDelay:'4s'}}>
            <div className="dr-float-code" style={{color:'rgba(167,139,250,0.25)'}}>&#x3E;_ <span style={{color:'rgba(52,211,153,0.4)'}}>Output: 3.71</span><br/>Process finished<br/>exit code 0</div>
          </div>
          <div className="dr-float" style={{bottom:'20%',right:'4%',animationDelay:'1s'}}>
            <div className="dr-float-hex"><span style={{color:'rgba(56,189,248,0.4)',fontSize:'18px',fontFamily:'JetBrains Mono'}}>{'</>'}</span></div>
          </div>

          <div>
            <div className="dr-badge" style={{animation:'fadeUp 0.8s ease 0.2s both'}}>
              <span className="dr-badge-dot"/>
              Real-time collaboration · Now live
            </div>

            <div className="dr-title-wrap">
              <span className="dr-word-code">
                <span className="dr-glitch-wrap">
                  <span className="dr-typed-text">{typedCode}</span>
                  {phase === 1 && typedCode.length < CODE_TEXT.length && <span className="dr-type-cursor"/>}
                  {typedCode && (
                    <>
                      <span className="g-copy g-copy-1">{typedCode}</span>
                      <span className="g-copy g-copy-2">{typedCode}</span>
                    </>
                  )}
                </span>
              </span>
              <span className="dr-word-together">
                <span className="dr-typed-text">{typedTogether}</span>
                {phase === 2 && typedTogether.length < TOGETHER_TEXT.length && <span className="dr-type-cursor violet"/>}
              </span>
            </div>

            <p className="dr-sub" style={{animation:'fadeUp 0.8s ease 1.4s both'}}>
              DevRoom is a <span>real-time collaborative IDE</span> where your whole team codes in sync — live cursors, instant execution, zero setup.
            </p>

            
            <div className="dr-card">
              <div className="dr-card-inner">
                <div className="dr-tabs">
                  <button className={`dr-tab${activeTab==='create'?' active':''}`} onClick={()=>setActiveTab('create')} onMouseEnter={ce} onMouseLeave={cl}>Create Room</button>
                  <button className={`dr-tab${activeTab==='join'?' active':''}`} onClick={()=>setActiveTab('join')} onMouseEnter={ce} onMouseLeave={cl}>Join Room</button>
                </div>
                {activeTab==='create' && (
                  <div>
                    <label className="dr-label">Your Name</label>
                    <input
                      className={`dr-input${nameError?' error':''}`}
                      placeholder="e.g. Muhammad Hamza"
                      value={createName}
                      maxLength={MAX_NAME_LEN}
                      onChange={e=>{
                        
                        setCreateName(sanitizeName(e.target.value));
                        setNameError(false);
                        setCreateError('');
                      }}
                      onMouseEnter={ce} onMouseLeave={cl}
                    />
                    {createError && (
                      <div style={{fontSize:'12px',color:'#f87171',fontFamily:'JetBrains Mono,monospace',marginBottom:'10px',padding:'8px 12px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'7px'}}>
                        ⚠ {createError}
                      </div>
                    )}
                    <button className="dr-btn-primary" onClick={handleCreateRoom} disabled={createLoading} onMouseEnter={ce} onMouseLeave={cl}>
                      {createLoading ? '⟳ Creating...' : '⚡ Create New Room →'}
                    </button>
                  </div>
                )}
                {activeTab==='join' && (
                  <div>
                    <label className="dr-label">Your Name</label>
                    <input
                      className="dr-input"
                      placeholder="e.g. Muhammad Hamza"
                      value={joinName}
                      maxLength={MAX_NAME_LEN}
                      onChange={e=>{
                        
                        setJoinName(sanitizeName(e.target.value));
                        setJoinError('');
                      }}
                      onMouseEnter={ce} onMouseLeave={cl}
                    />
                    <div className="dr-divider"><div className="dr-divider-line"/><span className="dr-divider-text">THEN</span><div className="dr-divider-line"/></div>
                    <label className="dr-label">Room ID</label>
                    <input
                      className="dr-input"
                      placeholder="e.g. abc-xyz-123"
                      value={joinRoomId}
                      maxLength={MAX_ROOMID_LEN}
                      onChange={e=>{
                        
                        setJoinRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        setJoinError('');
                      }}
                      onMouseEnter={ce} onMouseLeave={cl}
                    />
                    {joinError && (
                      <div style={{fontSize:'12px',color:'#f87171',fontFamily:'JetBrains Mono,monospace',marginBottom:'10px',padding:'8px 12px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'7px'}}>
                        ⚠ {joinError}
                      </div>
                    )}
                    <button className="dr-btn-primary" onClick={handleJoinRoom} disabled={joinLoading} onMouseEnter={ce} onMouseLeave={cl}>
                      {joinLoading ? '⟳ Checking...' : '🚀 Join Room →'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            
            <div className="dr-terminal">
              <div className="dr-terminal-window">
                <div className="dr-terminal-bar">
                  <div className="dr-t-dot" style={{background:'#ff5f57'}}/><div className="dr-t-dot" style={{background:'#febc2e'}}/><div className="dr-t-dot" style={{background:'#28c840'}}/>
                  <span className="dr-t-title">devroom · room/abc-xyz · 3 users coding</span>
                  <div className="dr-t-users">
                    {[['#38bdf8','Hamza'],['#34d399','Ahmed'],['#fb923c','Sara']].map(([c,n])=>(
                      <div key={n} className="dr-t-user" style={{background:`${c}18`,color:c}}><div className="dr-u-dot" style={{background:c}}/>{n}</div>
                    ))}
                  </div>
                </div>
                <div className="dr-code-area">
                  <span className="dr-ln">1</span><span><span className="kw">def </span><span className="fn">calculate_cgpa</span>(grades):</span>
                  <span className="dr-ln">2</span><span>{'    '}<span className="vr">total_points</span> = <span className="num">0</span></span>
                  <span className="dr-ln">3</span><span>{'    '}<span className="vr">total_credits</span> = <span className="num">0</span></span>
                  <span className="dr-ln">4</span><span>{'    '}<span className="kw">for </span>grade, credits <span className="kw">in </span>grades:</span>
                  <span className="dr-ln">5</span>
                  <span style={{position:'relative'}}>{'        '}<span className="vr">total_points</span> += grade * credits<span className="dr-cur"/><span style={{position:'relative',display:'inline-block'}}><span className="dr-clabel" style={{background:'#0284c7',color:'white'}}>Hamza</span></span></span>
                  <span className="dr-ln">6</span><span>{'        '}<span className="vr">total_credits</span> += credits</span>
                  <span className="dr-ln">7</span>
                  <span style={{position:'relative'}}>{'    '}<span className="kw">return </span>total_points / total_credits<span className="dr-cur" style={{background:'#34d399'}}/><span style={{position:'relative',display:'inline-block'}}><span className="dr-clabel" style={{background:'#059669',color:'white'}}>Ahmed</span></span></span>
                  <span className="dr-ln">8</span><span/>
                  <span className="dr-ln">9</span>
                  <span style={{position:'relative'}}><span className="fn">print</span>(calculate_cgpa([(<span className="num">4.0</span>,<span className="num">3</span>),(<span className="num">3.5</span>,<span className="num">4</span>)]))<span className="dr-cur" style={{background:'#fb923c'}}/><span style={{position:'relative',display:'inline-block'}}><span className="dr-clabel" style={{background:'#ea580c',color:'white'}}>Sara</span></span></span>
                  <span className="dr-ln">10</span><span><span className="cm"># Output: 3.71</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <div className="dr-stats reveal reveal-stagger">
          <div className="dr-stats-inner">
            {[['50+','Languages Supported'],['<50ms','Sync Latency'],['∞','Free Sessions'],['100%','Browser-Based']].map(([n,l])=>(
              <div key={l} className="dr-stat"><div className="dr-stat-num">{n}</div><div className="dr-stat-label">{l}</div></div>
            ))}
          </div>
        </div>

        <hr className="dr-hr"/>

        
        <section className="dr-features reveal" id="features">
          <div className="dr-sec-header">
            <div className="dr-sec-badge"></div>
            <h2 className="dr-sec-title">Everything your team needs.<br/>Nothing it doesn't.</h2>
          </div>
          <div className="dr-grid reveal-stagger reveal">
            <div className="dr-feat-card featured" onMouseEnter={ce} onMouseLeave={cl}>
              <div className="dr-corner tl"/><div className="dr-corner tr"/><div className="dr-corner bl"/><div className="dr-corner br"/>
              <div className="dr-feat-icon">⚡</div>
              <div className="dr-feat-title">Real-Time Code Sync</div>
              <div className="dr-feat-desc">Every keystroke synced instantly across all users. No lag, no conflicts — seamless collaboration powered by Socket.io WebSockets.</div>
              <span className="dr-feat-tag">Socket.io · &lt;50ms</span>
            </div>
            {[['👁️','Live Cursors','See exactly where teammates are coding with colored live cursors in real-time.','Real-time tracking'],
              ['▶️','Run Code Together','Execute and see output shared across the room. 50+ languages via Piston API.','Piston API'],
              ['🔗','Instant Room Links','Create a room in one click, share the link — no account needed.','Zero friction'],
              ['💾','Auto-Save Sessions','Code saves automatically. Export as a file anytime, never lose work.','Never lose work'],
            ].map(([icon,title,desc,tag])=>(
              <div key={title} className="dr-feat-card" onMouseEnter={ce} onMouseLeave={cl}>
                <div className="dr-corner tl"/><div className="dr-corner tr"/><div className="dr-corner bl"/><div className="dr-corner br"/>
                <div className="dr-feat-icon">{icon}</div>
                <div className="dr-feat-title">{title}</div>
                <div className="dr-feat-desc">{desc}</div>
                <span className="dr-feat-tag">{tag}</span>
              </div>
            ))}
          </div>
        </section>

        <hr className="dr-hr"/>

        
        <section className="dr-langs reveal" id="languages">
          <div className="dr-sec-header">
            <div className="dr-sec-badge"></div>
            <h2 className="dr-sec-title">Code in any language.</h2>
          </div>
          {[false,true].map((rev,ri)=>(
            <div key={ri} className={`dr-lang-track${rev?' rev':''}`}>
              {[['#3572A5','Python'],['#f1e05a','JavaScript'],['#b07219','Java'],['#f34b7d','C++'],['#555','C'],['#3178c6','TypeScript'],['#00ADD8','Go'],['#dea584','Rust'],['#4F5D95','PHP'],['#CC342D','Ruby'],['#F05032','C#'],['#F7DF1E','Kotlin'],
                ['#3572A5','Python'],['#f1e05a','JavaScript'],['#b07219','Java'],['#f34b7d','C++'],['#555','C'],['#3178c6','TypeScript'],['#00ADD8','Go'],['#dea584','Rust'],['#4F5D95','PHP'],['#CC342D','Ruby'],['#F05032','C#'],['#F7DF1E','Kotlin'],
              ].map(([color,name],i)=>(
                <div key={i} className="dr-lang-pill"><div className="dr-lang-dot" style={{background:color}}/>{name}</div>
              ))}
            </div>
          ))}
        </section>

        
        <section className="dr-cta reveal">
          <div className="dr-cta-grid-overlay"/>
          <h2 className="dr-cta-title">Ready to code<br/>together?</h2>
          <p className="dr-cta-sub">Free forever. No signup needed. Create a room and share the link.</p>
          <div className="dr-cta-btns">
            <button className="dr-btn-lg primary" onClick={handleCreateRoom} onMouseEnter={ce} onMouseLeave={cl}>⚡ Create Your Room</button>
            <button className="dr-btn-lg ghost" onClick={() => setShowDemo(true)} onMouseEnter={ce} onMouseLeave={cl}>Watch Demo →</button>
          </div>
        </section>

        
        <footer className="dr-footer">
          <div className="dr-footer-logo">
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
              <path d="M30 25L15 50L30 75" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M70 25L85 50L70 75" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="55" y1="20" x2="45" y2="80" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round"/>
            </svg>
            DevRoom
          </div>
          <div className="dr-footer-text">© 2025 DevRoom · Built with ❤️ · Your Team's Coding Space</div>
        </footer>

      </div>
      <WatchDemoModal isOpen={showDemo} onClose={() => setShowDemo(false)} />
    </>
  );
};

export default Home;