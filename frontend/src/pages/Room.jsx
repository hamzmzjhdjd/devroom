import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LANGUAGES = [
  { id: 'python',     name: 'Python',     version: '3.10.0',  icon: '🐍' },
  { id: 'javascript', name: 'JavaScript', version: '18.15.0', icon: '🟨' },
  { id: 'typescript', name: 'TypeScript', version: '5.0.3',   icon: '🔷' },
  { id: 'java',       name: 'Java',       version: '15.0.2',  icon: '☕' },
  { id: 'cpp',        name: 'C++',        version: '10.2.0',  icon: '⚡' },
  { id: 'c',          name: 'C',          version: '10.2.0',  icon: '🔵' },
  { id: 'csharp',     name: 'C#',         version: '6.12.0',  icon: '🟣' },
  { id: 'go',         name: 'Go',         version: '1.16.2',  icon: '🐹' },
  { id: 'rust',       name: 'Rust',       version: '1.50.0',  icon: '🦀' },
  { id: 'php',        name: 'PHP',        version: '8.2.3',   icon: '🐘' },
  { id: 'ruby',       name: 'Ruby',       version: '3.0.1',   icon: '💎' },
  { id: 'kotlin',     name: 'Kotlin',     version: '1.8.20',  icon: '🎯' },
];

const STARTER_CODE = {
  python:     '# Welcome to DevRoom!\nprint("Hello, DevRoom!")\n',
  javascript: '// Welcome to DevRoom!\nconsole.log("Hello, DevRoom!");\n',
  typescript: '// Welcome to DevRoom!\nconst message: string = "Hello, DevRoom!";\nconsole.log(message);\n',
  java:       'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, DevRoom!");\n    }\n}\n',
  cpp:        '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, DevRoom!" << endl;\n    return 0;\n}\n',
  c:          '#include <stdio.h>\n\nint main() {\n    printf("Hello, DevRoom!\\n");\n    return 0;\n}\n',
  csharp:     'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, DevRoom!");\n    }\n}\n',
  go:         'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, DevRoom!")\n}\n',
  rust:       'fn main() {\n    println!("Hello, DevRoom!");\n}\n',
  php:        '<?php\necho "Hello, DevRoom!";\n',
  ruby:       'puts "Hello, DevRoom!"\n',
  kotlin:     'fun main() {\n    println("Hello, DevRoom!")\n}\n',
};


const JUDGE0_LANG_ID = {
  python:     71,   
  javascript: 63,   
  typescript: 74,   
  java:       62,   
  cpp:        54,   
  c:          50,   
  csharp:     51,   
  go:         60,   
  rust:       73,   
  php:        68,   
  ruby:       72,   
  kotlin:     78,   
};

const USER_COLORS     = ['#38bdf8','#34d399','#fb923c','#f472b6','#a78bfa','#facc15','#f87171','#2dd4bf'];
const VALID_LANG_IDS  = new Set(Object.keys(JUDGE0_LANG_ID));
const MAX_CODE_LEN    = 100_000;


const sanitiseUsername = (raw) => {
  if (!raw || typeof raw !== 'string') return 'Anonymous';
  const c = raw.replace(/<[^>]*>/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 30);
  return c || 'Anonymous';
};


const LANG_EXT = {
  javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
  cpp: 'cpp', c: 'c', csharp: 'cs', go: 'go', rust: 'rs',
  php: 'php', ruby: 'rb', kotlin: 'kt',
};


const EDITOR_THEMES = [
  { id: 'devroom-dark',    name: 'DevRoom',    icon: '🌌', desc: 'Default deep space' },
  { id: 'devroom-ocean',   name: 'Ocean',      icon: '🌊', desc: 'Deep ocean blues'   },
  { id: 'devroom-aurora',  name: 'Aurora',     icon: '🌈', desc: 'Northern lights'    },
  { id: 'devroom-midnight','name': 'Midnight', icon: '🌃', desc: 'Midnight violet'     },
  { id: 'devroom-ember',   name: 'Ember',      icon: '🔥', desc: 'Warm amber tones'   },
  { id: 'devroom-matrix',  name: 'Matrix',     icon: '🟩', desc: 'Classic green rain' },
];


const defineCustomThemes = (monaco) => {
  
  monaco.editor.defineTheme('devroom-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword',           foreground: 'c792ea', fontStyle: 'bold'   },
      { token: 'string',            foreground: 'c3e88d'                       },
      { token: 'number',            foreground: 'f78c6c'                       },
      { token: 'comment',           foreground: '546e7a', fontStyle: 'italic'  },
      { token: 'type',              foreground: '82aaff'                       },
      { token: 'function',          foreground: '38bdf8'                       },
      { token: 'variable',          foreground: 'eeffff'                       },
      { token: 'operator',          foreground: 'a78bfa'                       },
      { token: 'delimiter',         foreground: '89ddff'                       },
    ],
    colors: {
      'editor.background':            '#020612',
      'editor.foreground':            '#e2e8f0',
      'editor.lineHighlightBackground':'#0ea5e910',
      'editor.selectionBackground':   '#38bdf830',
      'editor.inactiveSelectionBackground': '#38bdf815',
      'editorLineNumber.foreground':  '#334155',
      'editorLineNumber.activeForeground': '#38bdf8',
      'editorCursor.foreground':      '#38bdf8',
      'editorIndentGuide.background': '#1e293b',
      'editorIndentGuide.activeBackground': '#38bdf840',
      'scrollbar.shadow':             '#00000000',
      'scrollbarSlider.background':   '#38bdf820',
      'scrollbarSlider.hoverBackground': '#38bdf840',
    },
  });

  
  monaco.editor.defineTheme('devroom-ocean', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword',   foreground: '00d4ff', fontStyle: 'bold'  },
      { token: 'string',    foreground: '64ffda'                      },
      { token: 'number',    foreground: 'ff9d00'                      },
      { token: 'comment',   foreground: '4a6fa5', fontStyle: 'italic' },
      { token: 'type',      foreground: '80cbc4'                      },
      { token: 'function',  foreground: '00b4d8'                      },
      { token: 'operator',  foreground: '90e0ef'                      },
    ],
    colors: {
      'editor.background':             '#020d1a',
      'editor.foreground':             '#caf0f8',
      'editor.lineHighlightBackground':'#00b4d810',
      'editor.selectionBackground':    '#00d4ff25',
      'editorLineNumber.foreground':   '#1a3a5c',
      'editorLineNumber.activeForeground': '#00d4ff',
      'editorCursor.foreground':       '#00d4ff',
      'editorIndentGuide.background':  '#0a2540',
      'editorIndentGuide.activeBackground': '#00d4ff40',
      'scrollbarSlider.background':    '#00d4ff20',
      'scrollbarSlider.hoverBackground': '#00d4ff40',
    },
  });

  
  monaco.editor.defineTheme('devroom-aurora', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword',   foreground: 'f472b6', fontStyle: 'bold'  },
      { token: 'string',    foreground: '34d399'                      },
      { token: 'number',    foreground: 'fbbf24'                      },
      { token: 'comment',   foreground: '6b7280', fontStyle: 'italic' },
      { token: 'type',      foreground: 'a78bfa'                      },
      { token: 'function',  foreground: '38bdf8'                      },
      { token: 'operator',  foreground: 'e879f9'                      },
      { token: 'variable',  foreground: 'f0f9ff'                      },
    ],
    colors: {
      'editor.background':             '#080412',
      'editor.foreground':             '#f0f9ff',
      'editor.lineHighlightBackground':'#a78bfa10',
      'editor.selectionBackground':    '#f472b625',
      'editorLineNumber.foreground':   '#2d1b4e',
      'editorLineNumber.activeForeground': '#f472b6',
      'editorCursor.foreground':       '#f472b6',
      'editorIndentGuide.background':  '#1a0a2e',
      'editorIndentGuide.activeBackground': '#a78bfa40',
      'scrollbarSlider.background':    '#a78bfa20',
      'scrollbarSlider.hoverBackground': '#f472b640',
    },
  });

  
  monaco.editor.defineTheme('devroom-midnight', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword',   foreground: 'a78bfa', fontStyle: 'bold'  },
      { token: 'string',    foreground: '818cf8'                      },
      { token: 'number',    foreground: 'c4b5fd'                      },
      { token: 'comment',   foreground: '4c4f7a', fontStyle: 'italic' },
      { token: 'type',      foreground: 'e0e7ff'                      },
      { token: 'function',  foreground: 'a5b4fc'                      },
      { token: 'operator',  foreground: 'ddd6fe'                      },
    ],
    colors: {
      'editor.background':             '#06040f',
      'editor.foreground':             '#e0e7ff',
      'editor.lineHighlightBackground':'#a78bfa0d',
      'editor.selectionBackground':    '#a78bfa25',
      'editorLineNumber.foreground':   '#2e2657',
      'editorLineNumber.activeForeground': '#a78bfa',
      'editorCursor.foreground':       '#a78bfa',
      'editorIndentGuide.background':  '#13102a',
      'editorIndentGuide.activeBackground': '#a78bfa40',
      'scrollbarSlider.background':    '#a78bfa20',
      'scrollbarSlider.hoverBackground': '#a78bfa40',
    },
  });

  
  monaco.editor.defineTheme('devroom-ember', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword',   foreground: 'fb923c', fontStyle: 'bold'  },
      { token: 'string',    foreground: 'fde68a'                      },
      { token: 'number',    foreground: 'f87171'                      },
      { token: 'comment',   foreground: '6b5344', fontStyle: 'italic' },
      { token: 'type',      foreground: 'fdba74'                      },
      { token: 'function',  foreground: 'fbbf24'                      },
      { token: 'operator',  foreground: 'fed7aa'                      },
    ],
    colors: {
      'editor.background':             '#0f0700',
      'editor.foreground':             '#fff7ed',
      'editor.lineHighlightBackground':'#fb923c0d',
      'editor.selectionBackground':    '#fb923c25',
      'editorLineNumber.foreground':   '#3d1f00',
      'editorLineNumber.activeForeground': '#fb923c',
      'editorCursor.foreground':       '#fb923c',
      'editorIndentGuide.background':  '#1c0e00',
      'editorIndentGuide.activeBackground': '#fb923c40',
      'scrollbarSlider.background':    '#fb923c20',
      'scrollbarSlider.hoverBackground': '#fb923c40',
    },
  });

  
  monaco.editor.defineTheme('devroom-matrix', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword',   foreground: '00ff41', fontStyle: 'bold'  },
      { token: 'string',    foreground: '39ff14'                      },
      { token: 'number',    foreground: '00e600'                      },
      { token: 'comment',   foreground: '1a4d1a', fontStyle: 'italic' },
      { token: 'type',      foreground: '69ff47'                      },
      { token: 'function',  foreground: '00ff41'                      },
      { token: 'operator',  foreground: '80ff80'                      },
    ],
    colors: {
      'editor.background':             '#000300',
      'editor.foreground':             '#00ff41',
      'editor.lineHighlightBackground':'#00ff410a',
      'editor.selectionBackground':    '#00ff4125',
      'editorLineNumber.foreground':   '#0a2e0a',
      'editorLineNumber.activeForeground': '#00ff41',
      'editorCursor.foreground':       '#00ff41',
      'editorIndentGuide.background':  '#051405',
      'editorIndentGuide.activeBackground': '#00ff4140',
      'scrollbarSlider.background':    '#00ff4120',
      'scrollbarSlider.hoverBackground': '#00ff4140',
    },
  });
};

const Room = () => {
  const { roomId }        = useParams();
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  
  const username = sanitiseUsername(searchParams.get('username'));

  const socketRef       = useRef(null);
  const editorRef       = useRef(null);
  const cursorRef       = useRef(null);
  const ringRef         = useRef(null);
  
  const runTimestamps   = useRef([]);
  
  const applyingRemote  = useRef(false);

  const [code,              setCode]              = useState(STARTER_CODE['javascript']);
  const [language,          setLanguage]          = useState('javascript');
  const [users,             setUsers]             = useState([]);
  const [output,            setOutput]            = useState('');
  const [outputStatus,      setOutputStatus]      = useState('idle');
  const [showOutput,        setShowOutput]        = useState(false);
  const [showLangDropdown,  setShowLangDropdown]  = useState(false);
  const [copied,            setCopied]            = useState(false);
  const [connected,         setConnected]         = useState(false);
  const [showUsers,         setShowUsers]         = useState(true);
  const [theme,             setTheme]             = useState('devroom-dark');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [exported,          setExported]          = useState(false);
  const [gistUrl,           setGistUrl]           = useState('');
  const [sharingGist,       setSharingGist]       = useState(false);
  
  const [showChat,          setShowChat]          = useState(false);
  const [messages,          setMessages]          = useState([]);
  const [chatInput,         setChatInput]         = useState('');
  const [unreadCount,       setUnreadCount]       = useState(0);
  const chatBottomRef = useRef(null);
  const chatInputRef  = useRef(null);
  
  const [history,       setHistory]       = useState([]);
  const [showHistory,   setShowHistory]   = useState(false);
  const [restoringIdx,  setRestoringIdx]  = useState(null);

  
  const remoteCursors    = useRef({});
  const monacoRef        = useRef(null);
  const lastCursorEmit   = useRef(0); 

  const myColor = useRef(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);

  
  const agoraClient     = useRef(null);
  const localAudioTrack = useRef(null);
  const localVideoTrack = useRef(null);
  const [inCall,        setInCall]        = useState(false);
  const [micMuted,      setMicMuted]      = useState(false);
  const [camOff,        setCamOff]        = useState(false);
  const [remoteUsers,   setRemoteUsers]   = useState([]);

  const joinCall = async () => {
    const APP_ID = '6d749d7111a14d7385ade0f8ba62d0ae'; 
    const res    = await fetch(`${API_BASE}/api/agora-token?channel=${roomId}`);
    const { token } = await res.json();

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    agoraClient.current = client;

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video') {
        setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
        setTimeout(() => user.videoTrack?.play(`remote-video-${user.uid}`), 100);
      }
      if (mediaType === 'audio') user.audioTrack?.play();
    });

    client.on('user-unpublished', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    await client.join(APP_ID, roomId, token, null);
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    localAudioTrack.current = audioTrack;
    localVideoTrack.current = videoTrack;
    await client.publish([audioTrack, videoTrack]);
    setInCall(true);
    setTimeout(() => videoTrack.play('local-video'), 100);
  };

  const leaveCall = async () => {
    localAudioTrack.current?.close();
    localVideoTrack.current?.close();
    await agoraClient.current?.leave();
    setInCall(false);
    setRemoteUsers([]);
  };

  const toggleMic = () => {
    const muted = !micMuted;
    localAudioTrack.current?.setMuted(muted);
    setMicMuted(muted);
  };

  const toggleCam = () => {
    const off = !camOff;
    localVideoTrack.current?.setMuted(off);
    setCamOff(off);
  };

  
  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0, animId;
    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      if (cursorRef.current) { cursorRef.current.style.left = mx - 6 + 'px'; cursorRef.current.style.top = my - 6 + 'px'; }
    };
    const loop = () => {
      rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
      if (ringRef.current) { ringRef.current.style.left = rx - 18 + 'px'; ringRef.current.style.top = ry - 18 + 'px'; }
      animId = requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mousemove', onMove);
    
    return () => { cancelAnimationFrame(animId); document.removeEventListener('mousemove', onMove); };
  }, []);

  
  useEffect(() => {
    
    const socket = io(API_BASE, {
      reconnection:        true,
      reconnectionAttempts: 10,
      reconnectionDelay:   1000,
      transports:          ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { roomId, username });
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
    });

    
    socket.on('join-error', ({ message }) => {
      alert(`⚠ ${message}`);
      socket.disconnect();
      navigate('/');
    });

    socket.on('room-state', (state) => {
      if (state.language && VALID_LANG_IDS.has(state.language)) setLanguage(state.language);
      
      if (typeof state.code === 'string' && state.code.length <= MAX_CODE_LEN) {
        applyingRemote.current = true;
        setCode(state.code);
      }
      if (state.users) setUsers(state.users);
      if (Array.isArray(state.history)) setHistory(state.history);
    });

    
    socket.on('code-update', (newCode) => {
      if (typeof newCode !== 'string' || newCode.length > MAX_CODE_LEN) return;
      applyingRemote.current = true;
      setCode(newCode);
    });

    
    socket.on('language-update', (lang) => {
      if (!VALID_LANG_IDS.has(lang)) return;
      applyingRemote.current = true;
      setLanguage(lang);
      setCode(STARTER_CODE[lang] || '');
    });

    
    socket.on('theme-update', ({ theme: newTheme }) => {
      if (typeof newTheme === 'string' && EDITOR_THEMES.find(t => t.id === newTheme)) {
        setTheme(newTheme);
        if (monacoRef.current) monacoRef.current.editor.setTheme(newTheme);
      }
    });

    
    socket.on('code-output-update', ({ output: remoteOutput, status: remoteStatus }) => {
      if (typeof remoteOutput === 'string' && typeof remoteStatus === 'string') {
        setOutput(remoteOutput);
        setOutputStatus(remoteStatus);
        setShowOutput(true);
      }
    });

  
    socket.on('history-update', (snapshots) => {
      if (Array.isArray(snapshots)) setHistory(snapshots);
    });

  
    socket.on('snapshot-restored', ({ username: restorer }) => {
      setOutput(`✦ ${restorer} restored a previous snapshot`);
      setOutputStatus('success');
      setShowOutput(true);
    });

    socket.on('user-joined', (user) => {
      setUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, { ...user, color: USER_COLORS[prev.length % USER_COLORS.length] }];
      });
    });

    socket.on('user-left', (userId) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      setRemoteCursorById(userId, null);
    });

    
    socket.on('chat-message', ({ socketId, username: fromUser, text, timestamp }) => {
      if (typeof text !== 'string' || text.length > 500) return;
      setMessages(prev => [...prev, { socketId, username: fromUser, text, timestamp, own: false }]);
     
      setShowChat(prev => {
        if (!prev) setUnreadCount(c => c + 1);
        return prev;
      });
    });

    
    socket.on('cursor-move', ({ socketId, username: cursorUser, color, line, column }) => {
      if (typeof line !== 'number' || typeof column !== 'number') return;
      updateRemoteCursor(socketId, cursorUser, color, line, column);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, username, navigate]);

  
  const handleCodeChange = useCallback((value) => {

    if (applyingRemote.current) {
      applyingRemote.current = false;
      setCode(value);
      return;
    }
    setCode(value);
    
    if (!value || value.length > MAX_CODE_LEN) return;
    socketRef.current?.emit('code-change', { roomId, code: value });
  }, [roomId]);

  
  const handleLanguageChange = (langId) => {
    if (!VALID_LANG_IDS.has(langId)) return; 
    setLanguage(langId);
    const newCode = STARTER_CODE[langId] || '';
    setCode(newCode);
    socketRef.current?.emit('language-change', { roomId, language: langId });
    socketRef.current?.emit('code-change',     { roomId, code: newCode });
    setShowLangDropdown(false);
    setOutput('');
    setOutputStatus('idle');
  };

  
  const runCode = async () => {
    
    const now = Date.now();
    runTimestamps.current = runTimestamps.current.filter(t => now - t < 30_000);
    if (runTimestamps.current.length >= 5) {
      setOutput('Rate limit: max 5 runs per 30 seconds. Please wait.');
      setOutputStatus('error');
      setShowOutput(true);
      return;
    }
    runTimestamps.current.push(now);

    
    if (!code || code.length > MAX_CODE_LEN) {
      setOutput('Error: Code is too large to run (max 100KB).');
      setOutputStatus('error');
      setShowOutput(true);
      return;
    }

    const langId = JUDGE0_LANG_ID[language];
    if (!langId) {
      setOutput(`Error: Language "${language}" is not supported.`);
      setOutputStatus('error');
      setShowOutput(true);
      return;
    }

    setOutputStatus('running');
    setShowOutput(true);
    setOutput('⟳ Submitting code...');
    socketRef.current?.emit('code-output', { roomId, output: '⟳ Running...', status: 'running' });

    try {
    
      const submitRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language_id: langId,
          source_code: code,
        }),
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        setOutput(`Error: Execution service returned HTTP ${submitRes.status}.\n${errText}`);
        setOutputStatus('error');
        return;
      }

      let result = await submitRes.json();

      
      let attempts = 0;
      while ((result.status?.id === 1 || result.status?.id === 2) && attempts < 10) {
        await new Promise(r => setTimeout(r, 1000));
        setOutput(`⟳ Running... (${attempts + 1}s)`);
        const pollRes = await fetch(
          `https://ce.judge0.com/submissions/${result.token}?base64_encoded=false&fields=stdout,stderr,compile_output,status,exit_code`,
        );
        if (pollRes.ok) result = await pollRes.json();
        attempts++;
      }

      
      const stdout     = result.stdout         || '';
      const stderr     = result.stderr         || '';
      const compileErr = result.compile_output || '';
      const statusId   = result.status?.id;
      const statusDesc = result.status?.description || '';

      let finalOut = '';
      if (compileErr) finalOut += `[Compile Error]\n${compileErr}\n`;
      if (stdout)     finalOut += stdout;
      if (stderr)     finalOut += stderr;

      
      if (!finalOut) {
        finalOut = statusId === 3
          ? '(program exited with no output)'
          : `(${statusDesc || 'execution failed'})`;
      }

      const isError = statusId !== 3;
      const finalOutput = finalOut.trimEnd();
      setOutput(finalOutput);
      setOutputStatus(isError ? 'error' : 'success');
      socketRef.current?.emit('code-output', { roomId, output: finalOutput, status: isError ? 'error' : 'success' });

    } catch (err) {
      if (err instanceof SyntaxError) {
        setOutput('Error: Execution service returned an unexpected response.');
      } else {
        setOutput('Error: Could not connect to execution service. Check your internet connection.');
      }
      setOutputStatus('error');
      socketRef.current?.emit('code-output', { roomId, output: 'Error: Could not connect to execution service.', status: 'error' });
    }
  };

  
  const copyRoomId = () => {
    
    navigator.clipboard.writeText(roomId).catch(() => {
      
      const el = document.createElement('textarea');
      el.value = roomId;
      el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  
  useEffect(() => {
    if (!showLangDropdown) return;
    const handler = (e) => {
      if (!e.target.closest('.lang-selector')) setShowLangDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLangDropdown]);


  useEffect(() => {
    if (!showThemeDropdown) return;
    const handler = (e) => {
      if (!e.target.closest('.theme-selector')) setShowThemeDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showThemeDropdown]);

  
  const exportCode = () => {
    const ext      = LANG_EXT[language] || 'txt';
    const filename = `devroom_${roomId}.${ext}`;
    const blob     = new Blob([code], { type: 'text/plain' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };


  const shareAsGist = async () => {
    setSharingGist(true);
    try {
      const ext = LANG_EXT[language] || 'txt';
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${process.env.REACT_APP_GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          description: `DevRoom — ${roomId}`,
          public: true,
          files: { [`main.${ext}`]: { content: code } }
        }),
      });
      const data = await res.json();
      const url = data.html_url;
      if (!url) {
        alert('Gist failed. Check your GitHub token.');
        setSharingGist(false);
        return;
      }
      setGistUrl(url);
      navigator.clipboard.writeText(url).catch(() => {});
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.click();
    } catch {
      alert('Failed to create Gist. Check your internet connection.');
    }
    setSharingGist(false);
  };

  
  const updateRemoteCursor = (socketId, cursorUsername, color, line, column) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const prev = remoteCursors.current[socketId];
    
    if (prev?.decorationIds) {
      editor.deltaDecorations(prev.decorationIds, []);
    }

    
    const newDecorationIds = editor.deltaDecorations([], [
      {
        range: new monaco.Range(line, column, line, column),
        options: {
          className: `remote-cursor-${socketId.replace(/[^a-z0-9]/gi, '')}`,
          afterContentClassName: `remote-cursor-label-${socketId.replace(/[^a-z0-9]/gi, '')}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      },
    ]);

    
    const safeId = socketId.replace(/[^a-z0-9]/gi, '');
    const styleId = `cursor-style-${safeId}`;
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .remote-cursor-${safeId} {
          border-left: 2px solid ${color};
          margin-left: -1px;
        }
        .remote-cursor-label-${safeId}::after {
          content: "${cursorUsername.replace(/"/g, '')}";
          background: ${color};
          color: #000;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 0 3px 3px 3px;
          pointer-events: none;
          white-space: nowrap;
          position: absolute;
          top: -18px;
          z-index: 100;
        }
      `;
      document.head.appendChild(style);
    }

    remoteCursors.current[socketId] = { decorationIds: newDecorationIds, username: cursorUsername, color };
  };

  const setRemoteCursorById = (socketId, _null) => {
    const editor = editorRef.current;
    if (!editor) return;
    const prev = remoteCursors.current[socketId];
    if (prev?.decorationIds) editor.deltaDecorations(prev.decorationIds, []);
    delete remoteCursors.current[socketId];
    const safeId = socketId.replace(/[^a-z0-9]/gi, '');
    const styleEl = document.getElementById(`cursor-style-${safeId}`);
    if (styleEl) styleEl.remove();
  };

  
  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || text.length > 500) return;
    const timestamp = Date.now();
    socketRef.current?.emit('chat-message', { roomId, text, timestamp });
    setMessages(prev => [...prev, { socketId: 'me', username, text, timestamp, own: true }]);
    setChatInput('');
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  
  const restoreSnapshot = (index) => {
    setRestoringIdx(index);
    socketRef.current?.emit('restore-snapshot', { roomId, index });
    setTimeout(() => setRestoringIdx(null), 1500);
  };

  
  useEffect(() => {
    if (showChat) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  
  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

  const ce = () => {
    if (cursorRef.current) cursorRef.current.style.transform = 'scale(2)';
    if (ringRef.current) { ringRef.current.style.transform = 'scale(1.4)'; ringRef.current.style.borderColor = 'rgba(56,189,248,0.9)'; }
  };
  const cl = () => {
    if (cursorRef.current) cursorRef.current.style.transform = 'scale(1)';
    if (ringRef.current) { ringRef.current.style.transform = 'scale(1)'; ringRef.current.style.borderColor = 'rgba(56,189,248,0.4)'; }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }

        .room-wrap {
          height: 100vh;
          background: #050813;
          font-family: 'Space Grotesk', sans-serif;
          color: #f0f9ff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          cursor: none;
        }

        .dr-cursor { position:fixed;width:10px;height:10px;background:#38bdf8;border-radius:50%;pointer-events:none;z-index:9999;transition:transform 0.15s ease; }
        .dr-ring { position:fixed;width:36px;height:36px;border:1.5px solid rgba(56,189,248,0.4);border-radius:50%;pointer-events:none;z-index:9998;transition:all 0.12s ease; }

        /* TOP BAR */
        .room-topbar {
          height: 56px;
          background: rgba(7,11,28,0.95);
          border-bottom: 1px solid rgba(56,189,248,0.12);
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
          flex-shrink: 0;
          backdrop-filter: blur(20px);
          z-index: 50;
        }

        .topbar-logo { display:flex;align-items:center;gap:8px;text-decoration:none;cursor:none;margin-right:8px; }
        .topbar-logo-icon {
          width:32px;height:32px;background:linear-gradient(145deg,#0c4a6e,#0284c7);
          border-radius:8px;display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 12px rgba(14,165,233,0.4);animation:logoPulse 2.5s ease-in-out infinite;flex-shrink:0;
        }
        @keyframes logoPulse { 0%{box-shadow:0 0 0 0 rgba(14,165,233,0.6);}70%{box-shadow:0 0 0 10px rgba(14,165,233,0);}100%{box-shadow:0 0 0 0 rgba(14,165,233,0);} }
        .topbar-brand { font-family:'Syne',sans-serif;font-size:18px;font-weight:800;background:linear-gradient(135deg,#38bdf8,#0ea5e9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
        .topbar-divider { width:1px;height:28px;background:rgba(56,189,248,0.12);flex-shrink:0; }

        .room-id-pill {
          display:flex;align-items:center;gap:8px;padding:6px 12px;
          background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.15);
          border-radius:8px;cursor:none;transition:all 0.3s;
        }
        .room-id-pill:hover { background:rgba(56,189,248,0.1);border-color:rgba(56,189,248,0.3); }
        .room-id-label { font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(56,189,248,0.6);letter-spacing:1px; }
        .room-id-value { font-family:'JetBrains Mono',monospace;font-size:13px;color:#38bdf8;font-weight:500; }
        .copy-icon { font-size:13px;opacity:0.7; }

        .conn-status { display:flex;align-items:center;gap:6px;font-size:12px;font-family:'JetBrains Mono',monospace; }
        .conn-dot { width:7px;height:7px;border-radius:50%;animation:connPulse 2s ease-in-out infinite; }
        .conn-dot.online { background:#34d399; }
        .conn-dot.offline { background:#f87171;animation:none; }
        @keyframes connPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(1.3);} }

        .topbar-spacer { flex:1; }

        .lang-selector { position:relative; }
        .lang-btn {
          display:flex;align-items:center;gap:8px;padding:7px 14px;
          background:rgba(7,11,28,0.8);border:1px solid rgba(56,189,248,0.18);
          border-radius:8px;cursor:none;font-family:'Space Grotesk',sans-serif;
          font-size:13px;font-weight:600;color:white;transition:all 0.3s;
        }
        .lang-btn:hover { border-color:rgba(56,189,248,0.4);background:rgba(56,189,248,0.06); }
        .lang-btn-arrow { font-size:10px;color:rgba(148,163,184,0.5);margin-left:2px;transition:transform 0.3s; }
        .lang-btn-arrow.open { transform:rotate(180deg); }

        .lang-dropdown {
          position:absolute;top:calc(100% + 8px);right:0;width:200px;
          background:rgba(7,11,28,0.97);border:1px solid rgba(56,189,248,0.18);
          border-radius:12px;overflow:hidden;
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 30px rgba(14,165,233,0.08);
          z-index:200;animation:dropIn 0.2s ease;max-height:320px;overflow-y:auto;
        }
        .lang-dropdown::-webkit-scrollbar { width:4px; }
        .lang-dropdown::-webkit-scrollbar-thumb { background:rgba(56,189,248,0.2);border-radius:4px; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);} }
        .lang-option {
          display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:none;
          transition:background 0.2s;font-size:14px;border-bottom:1px solid rgba(56,189,248,0.06);
        }
        .lang-option:last-child { border-bottom:none; }
        .lang-option:hover { background:rgba(56,189,248,0.08); }
        .lang-option.active { background:rgba(56,189,248,0.12);color:#38bdf8; }
        .lang-option-name { font-weight:500; }

        .run-btn {
          display:flex;align-items:center;gap:7px;padding:8px 18px;
          background:linear-gradient(135deg,#16a34a,#22c55e);border:none;border-radius:8px;
          color:white;font-size:13px;font-weight:700;cursor:none;
          font-family:'Space Grotesk',sans-serif;transition:all 0.3s;
          box-shadow:0 4px 16px rgba(34,197,94,0.3);position:relative;overflow:hidden;
        }
        .run-btn::before { content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transition:left 0.4s; }
        .run-btn:hover::before { left:100%; }
        .run-btn:hover { transform:translateY(-1px);box-shadow:0 8px 24px rgba(34,197,94,0.45); }
        .run-btn:disabled { opacity:0.5;cursor:not-allowed;transform:none; }
        .run-btn .spin { animation:spin 1s linear infinite;display:inline-block; }
        @keyframes spin { from{transform:rotate(0deg);}to{transform:rotate(360deg);} }

        .icon-btn {
          width:36px;height:36px;display:flex;align-items:center;justify-content:center;
          background:rgba(7,11,28,0.8);border:1px solid rgba(56,189,248,0.15);
          border-radius:8px;cursor:none;font-size:16px;transition:all 0.3s;
          color:rgba(148,163,184,0.7);
        }
        .icon-btn:hover { background:rgba(56,189,248,0.08);border-color:rgba(56,189,248,0.3);color:#38bdf8; }
        .icon-btn.active { background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.3);color:#38bdf8; }

        /* ── THEME SELECTOR ── */
        .theme-selector { position:relative; }
        .theme-btn {
          display:flex;align-items:center;gap:7px;padding:7px 12px;
          background:rgba(7,11,28,0.8);border:1px solid rgba(167,139,250,0.25);
          border-radius:8px;cursor:none;font-family:'Space Grotesk',sans-serif;
          font-size:13px;font-weight:600;color:rgba(167,139,250,0.9);transition:all 0.3s;
        }
        .theme-btn:hover { border-color:rgba(167,139,250,0.5);background:rgba(167,139,250,0.06); }
        .theme-btn-arrow { font-size:10px;color:rgba(167,139,250,0.4);margin-left:2px;transition:transform 0.3s; }
        .theme-btn-arrow.open { transform:rotate(180deg); }
        .theme-dropdown {
          position:absolute;top:calc(100% + 8px);right:0;width:240px;
          background:rgba(7,11,28,0.97);border:1px solid rgba(167,139,250,0.2);
          border-radius:12px;overflow:hidden;
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 30px rgba(139,92,246,0.08);
          z-index:200;animation:dropIn 0.2s ease;
        }
        .theme-option {
          display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:none;
          transition:background 0.2s;font-size:13px;border-bottom:1px solid rgba(167,139,250,0.07);
          color:rgba(203,213,225,0.8);
        }
        .theme-option:last-child { border-bottom:none; }
        .theme-option:hover { background:rgba(167,139,250,0.08); }
        .theme-option.active { background:rgba(167,139,250,0.12);color:#a78bfa; }
        .theme-option-info { display:flex;flex-direction:column;gap:1px;flex:1; }
        .theme-option-name { font-weight:600;font-size:13px; }
        .theme-option-desc { font-size:10px;color:rgba(148,163,184,0.4);font-family:'JetBrains Mono',monospace;letter-spacing:0.5px; }

        /* ── EXPORT BUTTON ── */
        .export-btn {
          display:flex;align-items:center;gap:6px;padding:7px 14px;
          background:rgba(7,11,28,0.8);border:1px solid rgba(52,211,153,0.25);
          border-radius:8px;cursor:none;font-family:'Space Grotesk',sans-serif;
          font-size:13px;font-weight:600;color:rgba(52,211,153,0.9);transition:all 0.3s;
          position:relative;overflow:hidden;
        }
        .export-btn::before { content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(52,211,153,0.1),transparent);transition:left 0.4s; }
        .export-btn:hover::before { left:100%; }
        .export-btn:hover { border-color:rgba(52,211,153,0.5);background:rgba(52,211,153,0.06);transform:translateY(-1px); }
        .export-btn.saved { border-color:rgba(52,211,153,0.7);background:rgba(52,211,153,0.12);color:#34d399; }

        .room-main { flex:1;display:flex;overflow:hidden; }

        .room-sidebar {
          width:220px;background:rgba(5,8,19,0.9);
          border-right:1px solid rgba(56,189,248,0.1);
          display:flex;flex-direction:column;flex-shrink:0;
          transition:width 0.3s ease;overflow:hidden;
        }
        .room-sidebar.hidden { width:0; }
        .sidebar-header { padding:14px 16px 10px;border-bottom:1px solid rgba(56,189,248,0.08); }
        .sidebar-title { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(56,189,248,0.5);font-family:'JetBrains Mono',monospace;font-weight:600; }
        .users-list { padding:8px;flex:1;overflow-y:auto; }
        .user-item { display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;margin-bottom:4px;transition:background 0.2s; }
        .user-item:hover { background:rgba(56,189,248,0.05); }
        .user-avatar { width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:'Syne',sans-serif;flex-shrink:0; }
        .user-info { flex:1;min-width:0; }
        .user-name { font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .user-you { font-size:10px;color:rgba(148,163,184,0.4);font-family:'JetBrains Mono',monospace; }
        .user-online-dot { width:6px;height:6px;border-radius:50%;background:#34d399;flex-shrink:0;animation:connPulse 2s ease-in-out infinite; }

        .editor-area { flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative; }
        .editor-tabs { height:38px;background:rgba(5,8,19,0.95);border-bottom:1px solid rgba(56,189,248,0.08);display:flex;align-items:center;padding:0 16px;gap:4px;flex-shrink:0; }
        .editor-tab { display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:6px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.15);font-size:12px;font-family:'JetBrains Mono',monospace;color:#38bdf8; }
        .monaco-wrap { flex:1;overflow:hidden;position:relative; }

        .output-panel { height:220px;background:rgba(3,5,14,0.97);border-top:1px solid rgba(56,189,248,0.1);display:flex;flex-direction:column;flex-shrink:0;animation:slideUp 0.3s ease; }
        @keyframes slideUp { from{transform:translateY(100%);}to{transform:translateY(0);} }
        .output-resize { height:4px;background:rgba(56,189,248,0.08);cursor:ns-resize;transition:background 0.2s;flex-shrink:0; }
        .output-resize:hover { background:rgba(56,189,248,0.25); }
        .output-header { padding:8px 16px;border-bottom:1px solid rgba(56,189,248,0.08);display:flex;align-items:center;gap:10px;flex-shrink:0; }
        .output-title { font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(56,189,248,0.5); }
        .output-status { display:flex;align-items:center;gap:5px;font-size:11px;font-family:'JetBrains Mono',monospace;padding:2px 8px;border-radius:4px; }
        .output-status.success { background:rgba(34,197,94,0.1);color:#4ade80;border:1px solid rgba(34,197,94,0.2); }
        .output-status.error { background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2); }
        .output-status.running { background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.2); }
        .output-close { margin-left:auto;cursor:none;color:rgba(148,163,184,0.4);font-size:16px;transition:color 0.2s; }
        .output-close:hover { color:white; }
        .output-content { flex:1;overflow-y:auto;padding:14px 20px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;color:#e2e8f0;white-space:pre-wrap;word-break:break-all; }
        .output-content::-webkit-scrollbar { width:4px; }
        .output-content::-webkit-scrollbar-thumb { background:rgba(56,189,248,0.15);border-radius:4px; }
        .output-content.error-text { color:#f87171; }
        .output-content.running-text { color:rgba(56,189,248,0.6); }
        .empty-output { display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:rgba(148,163,184,0.3);font-family:'JetBrains Mono',monospace;font-size:13px; }

        .tooltip { position:relative; }
        .tooltip-text { position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:rgba(7,11,28,0.95);border:1px solid rgba(56,189,248,0.2);color:white;font-size:11px;font-family:'JetBrains Mono',monospace;padding:4px 10px;border-radius:6px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.2s; }
        .tooltip:hover .tooltip-text { opacity:1; }

        /* ── CHAT PANEL ── */
        .sidebar-tabs { display:flex;border-bottom:1px solid rgba(56,189,248,0.08);flex-shrink:0; }
        .sidebar-tab {
          flex:1;padding:10px 0;text-align:center;font-size:11px;letter-spacing:1.5px;
          text-transform:uppercase;font-family:'JetBrains Mono',monospace;font-weight:600;
          color:rgba(148,163,184,0.4);cursor:none;transition:all 0.2s;border-bottom:2px solid transparent;
          position:relative;
        }
        .sidebar-tab:hover { color:rgba(148,163,184,0.7); }
        .sidebar-tab.active { color:#38bdf8;border-bottom-color:#38bdf8; }
        .chat-badge {
          position:absolute;top:6px;right:20px;background:#f87171;color:#000;
          font-size:9px;font-weight:800;border-radius:8px;padding:1px 5px;
          min-width:16px;text-align:center;
        }

        .chat-panel { flex:1;display:flex;flex-direction:column;overflow:hidden; }
        .chat-messages {
          flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px;
        }
        .chat-messages::-webkit-scrollbar { width:3px; }
        .chat-messages::-webkit-scrollbar-thumb { background:rgba(56,189,248,0.15);border-radius:4px; }
        .chat-empty {
          flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:6px;color:rgba(148,163,184,0.25);font-size:11px;
          font-family:'JetBrains Mono',monospace;text-align:center;padding:20px;
        }
        .chat-msg {
          display:flex;flex-direction:column;gap:2px;padding:8px 10px;
          border-radius:10px;animation:msgIn 0.2s ease;max-width:100%;
        }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
        .chat-msg.own {
          background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.12);
          align-self:flex-end;
        }
        .chat-msg.other {
          background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
          align-self:flex-start;
        }
        .chat-msg-header { display:flex;align-items:center;gap:6px; }
        .chat-msg-user { font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace; }
        .chat-msg-time { font-size:9px;color:rgba(148,163,184,0.3);font-family:'JetBrains Mono',monospace;margin-left:auto; }
        .chat-msg-text { font-size:12px;color:#e2e8f0;line-height:1.5;word-break:break-word; }

        .chat-input-row {
          padding:8px;border-top:1px solid rgba(56,189,248,0.08);display:flex;gap:6px;flex-shrink:0;
        }
        .chat-input {
          flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(56,189,248,0.12);
          border-radius:8px;padding:7px 10px;color:#e2e8f0;font-size:12px;
          font-family:'Space Grotesk',sans-serif;outline:none;transition:border 0.2s;cursor:text;
        }
        .chat-input:focus { border-color:rgba(56,189,248,0.35); }
        .chat-input::placeholder { color:rgba(148,163,184,0.3); }
        .chat-send-btn {
          width:32px;height:32px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.2);
          border-radius:8px;cursor:none;display:flex;align-items:center;justify-content:center;
          font-size:13px;transition:all 0.2s;flex-shrink:0;
        }
        .chat-send-btn:hover { background:rgba(56,189,248,0.2);border-color:rgba(56,189,248,0.4); }

        /* ── HISTORY PANEL ── */
        .history-panel { flex:1;display:flex;flex-direction:column;overflow:hidden; }
        .history-empty {
          flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:6px;color:rgba(148,163,184,0.25);font-size:11px;
          font-family:'JetBrains Mono',monospace;text-align:center;padding:20px;
        }
        .history-list { flex:1;overflow-y:auto;padding:6px; }
        .history-list::-webkit-scrollbar { width:3px; }
        .history-list::-webkit-scrollbar-thumb { background:rgba(56,189,248,0.15);border-radius:4px; }
        .history-item {
          padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:none;
          border:1px solid rgba(56,189,248,0.08);background:rgba(255,255,255,0.02);
          transition:all 0.2s;animation:msgIn 0.2s ease;
        }
        .history-item:hover { background:rgba(56,189,248,0.05);border-color:rgba(56,189,248,0.18); }
        .history-item-header { display:flex;align-items:center;gap:6px;margin-bottom:4px; }
        .history-trigger {
          font-size:9px;padding:2px 7px;border-radius:4px;font-weight:700;
          font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;text-transform:uppercase;
        }
        .history-trigger.run { background:rgba(34,197,94,0.12);color:#4ade80;border:1px solid rgba(34,197,94,0.2); }
        .history-trigger.leave { background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.2); }
        .history-trigger.lang-change { background:rgba(167,139,250,0.1);color:#a78bfa;border:1px solid rgba(167,139,250,0.2); }
        .history-trigger.before-restore { background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.2); }
        .history-item-user { font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace; }
        .history-item-time { font-size:9px;color:rgba(148,163,184,0.3);font-family:'JetBrains Mono',monospace;margin-left:auto; }
        .history-item-lang { font-size:10px;color:rgba(148,163,184,0.4);font-family:'JetBrains Mono',monospace;margin-bottom:6px; }
        .history-item-preview {
          font-size:10px;color:rgba(148,163,184,0.45);font-family:'JetBrains Mono',monospace;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          background:rgba(0,0,0,0.3);padding:4px 8px;border-radius:5px;margin-bottom:7px;
        }
        .history-restore-btn {
          width:100%;padding:5px;background:rgba(56,189,248,0.08);
          border:1px solid rgba(56,189,248,0.15);border-radius:6px;
          color:rgba(56,189,248,0.7);font-size:10px;font-weight:700;cursor:none;
          font-family:'JetBrains Mono',monospace;letter-spacing:1px;transition:all 0.2s;
        }
        .history-restore-btn:hover { background:rgba(56,189,248,0.15);border-color:rgba(56,189,248,0.35);color:#38bdf8; }
        .history-restore-btn.restoring { background:rgba(52,211,153,0.12);border-color:rgba(52,211,153,0.3);color:#34d399; }
        .history-count {
          padding:6px 12px;text-align:center;font-size:9px;color:rgba(148,163,184,0.25);
          font-family:'JetBrains Mono',monospace;letter-spacing:1px;flex-shrink:0;
          border-bottom:1px solid rgba(56,189,248,0.05);
        }

        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(56,189,248,0.15);border-radius:4px; }
      `}</style>

      <div ref={cursorRef} className="dr-cursor"/>
      <div ref={ringRef} className="dr-ring"/>

      <div className="room-wrap">

        {/* TOP BAR */}
        <div className="room-topbar">
          <a href="/" className="topbar-logo" onMouseEnter={ce} onMouseLeave={cl}>
            <div className="topbar-logo-icon">
              <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                <path d="M 30 25 L 15 50 L 30 75" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M 70 25 L 85 50 L 70 75" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="55" y1="20" x2="45" y2="80" stroke="white" strokeWidth="8" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="topbar-brand">DevRoom</span>
          </a>

          <div className="topbar-divider"/>

          <div className="room-id-pill tooltip" onClick={copyRoomId} onMouseEnter={ce} onMouseLeave={cl}>
            <span className="room-id-label">ROOM</span>
            <span className="room-id-value">{roomId}</span>
            <span className="copy-icon">{copied ? '✅' : '📋'}</span>
            <span className="tooltip-text">{copied ? 'Copied!' : 'Copy Room ID'}</span>
          </div>

          <div className="conn-status">
            <div className={`conn-dot ${connected ? 'online' : 'offline'}`}/>
            <span style={{color: connected ? '#34d399' : '#f87171', fontSize:'11px'}}>
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>

          <div className="topbar-spacer"/>

          <div className="lang-selector">
            <button className="lang-btn" onClick={() => setShowLangDropdown(prev => !prev)} onMouseEnter={ce} onMouseLeave={cl}>
              <span>{currentLang.icon}</span>
              <span>{currentLang.name}</span>
              <span className={`lang-btn-arrow${showLangDropdown ? ' open' : ''}`}>▼</span>
            </button>
            {showLangDropdown && (
              <div className="lang-dropdown">
                {LANGUAGES.map(lang => (
                  <div key={lang.id} className={`lang-option${language === lang.id ? ' active' : ''}`} onClick={() => handleLanguageChange(lang.id)} onMouseEnter={ce} onMouseLeave={cl}>
                    <span>{lang.icon}</span>
                    <span className="lang-option-name">{lang.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="run-btn" onClick={runCode} disabled={outputStatus === 'running'} onMouseEnter={ce} onMouseLeave={cl}>
            {outputStatus === 'running'
              ? <><span className="spin">⟳</span> Running...</>
              : <><span>▶</span> Run Code</>
            }
          </button>

          {/* ── THEME SELECTOR ── */}
          <div className="theme-selector">
            <button className="theme-btn" onClick={() => setShowThemeDropdown(prev => !prev)} onMouseEnter={ce} onMouseLeave={cl}>
              <span>🎨</span>
              <span>{EDITOR_THEMES.find(t => t.id === theme)?.name || 'Theme'}</span>
              <span className={`theme-btn-arrow${showThemeDropdown ? ' open' : ''}`}>▼</span>
            </button>
            {showThemeDropdown && (
              <div className="theme-dropdown">
                {EDITOR_THEMES.map(t => (
                  <div
                    key={t.id}
                    className={`theme-option${theme === t.id ? ' active' : ''}`}
                    onClick={() => { 
                      setTheme(t.id); 
                      setShowThemeDropdown(false);
                      socketRef.current?.emit('theme-change', { roomId, theme: t.id });
                      if (monacoRef.current) monacoRef.current.editor.setTheme(t.id);
                    }}
                    onMouseEnter={ce} onMouseLeave={cl}
                  >
                    <span style={{fontSize:'18px'}}>{t.icon}</span>
                    <div className="theme-option-info">
                      <span className="theme-option-name">{t.name}</span>
                      <span className="theme-option-desc">{t.desc}</span>
                    </div>
                    {theme === t.id && <span style={{fontSize:'11px',color:'#a78bfa'}}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── EXPORT / SAVE BUTTON ── */}
          <div className="tooltip">
            <button className={`export-btn${exported ? ' saved' : ''}`} onClick={exportCode} onMouseEnter={ce} onMouseLeave={cl}>
              <span>{exported ? '✅' : '💾'}</span>
              <span>{exported ? 'Saved!' : 'Export'}</span>
            </button>
            <span className="tooltip-text">Save code as file</span>
          </div>

          {/* ── GIST SHARE BUTTON ── */}
          <div className="tooltip">
            <button
              className={`export-btn${gistUrl ? ' saved' : ''}`}
              onClick={shareAsGist}
              disabled={sharingGist}
              onMouseEnter={ce} onMouseLeave={cl}
              style={{borderColor: gistUrl ? 'rgba(167,139,250,0.7)' : 'rgba(167,139,250,0.25)', color: gistUrl ? '#a78bfa' : 'rgba(167,139,250,0.9)'}}
            >
              <span>{sharingGist ? '⟳' : gistUrl ? '✅' : '🔗'}</span>
              <span>{sharingGist ? 'Sharing...' : gistUrl ? 'Shared!' : 'Gist'}</span>
            </button>
            <span className="tooltip-text">{gistUrl ? 'Click to open Gist' : 'Share code as GitHub Gist'}</span>
          </div>

          <div className="tooltip">
            <button className={`icon-btn${showUsers ? ' active' : ''}`} onClick={() => setShowUsers(prev => !prev)} onMouseEnter={ce} onMouseLeave={cl}>👥</button>
            <span className="tooltip-text">Toggle Users</span>
          </div>

          <div className="tooltip">
            <button className={`icon-btn${showOutput ? ' active' : ''}`} onClick={() => setShowOutput(prev => !prev)} onMouseEnter={ce} onMouseLeave={cl}>📟</button>
            <span className="tooltip-text">Toggle Output</span>
          </div>

          <div className="tooltip">
            <button className="icon-btn" onClick={() => navigate('/')} onMouseEnter={ce} onMouseLeave={cl} style={{color:'rgba(248,113,113,0.7)'}}>⏏</button>
            <span className="tooltip-text">Leave Room</span>
          </div>
        </div>

        {/* MAIN */}
        <div className="room-main">

          {/* SIDEBAR */}
          <div className={`room-sidebar${showUsers ? '' : ' hidden'}`}>
            {/* Tabs: Users | Chat | History */}
            <div className="sidebar-tabs">
              <div
                className={`sidebar-tab${!showChat && !showHistory ? ' active' : ''}`}
                onClick={() => { setShowChat(false); setShowHistory(false); }}
                onMouseEnter={ce} onMouseLeave={cl}
              >
                👥 Users
              </div>
              <div
                className={`sidebar-tab${showChat ? ' active' : ''}`}
                onClick={() => { setShowChat(true); setShowHistory(false); }}
                onMouseEnter={ce} onMouseLeave={cl}
              >
                💬 Chat
                {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
              </div>
              <div
                className={`sidebar-tab${showHistory ? ' active' : ''}`}
                onClick={() => { setShowHistory(true); setShowChat(false); }}
                onMouseEnter={ce} onMouseLeave={cl}
              >
                🕐 History
                {history.length > 0 && <span className="chat-badge" style={{background:'rgba(167,139,250,0.8)',color:'#000'}}>{history.length}</span>}
              </div>
            </div>

            {/* USERS TAB */}
            {!showChat && !showHistory && (
              <div className="users-list">
                <div className="user-item">
                  <div className="user-avatar" style={{background:`${myColor.current}22`,border:`1px solid ${myColor.current}44`,color:myColor.current}}>
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name" style={{color:myColor.current}}>{username}</div>
                    <div className="user-you">you</div>
                  </div>
                  <div className="user-online-dot"/>
                </div>
                {users.filter(u => u.username !== username).map((user, i) => (
                  <div key={user.id} className="user-item">
                    <div className="user-avatar" style={{background:`${USER_COLORS[i%USER_COLORS.length]}22`,border:`1px solid ${USER_COLORS[i%USER_COLORS.length]}44`,color:USER_COLORS[i%USER_COLORS.length]}}>
                      {user.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.username}</div>
                    </div>
                    <div className="user-online-dot"/>
                  </div>
                ))}
              </div>
            )}

            {/* CHAT TAB */}
            {showChat && !showHistory && (
              <div className="chat-panel">
                <div className="chat-messages">
                  {messages.length === 0 && (
                    <div className="chat-empty">
                      <span style={{fontSize:'28px'}}>💬</span>
                      <span>No messages yet.</span>
                      <span>Say something!</span>
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const msgColor = msg.own ? myColor.current : USER_COLORS[users.findIndex(u => u.id === msg.socketId) % USER_COLORS.length] || '#94a3b8';
                    const time = new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                    return (
                      <div key={i} className={`chat-msg ${msg.own ? 'own' : 'other'}`}>
                        <div className="chat-msg-header">
                          <span className="chat-msg-user" style={{color: msg.own ? myColor.current : msgColor}}>
                            {msg.own ? 'You' : msg.username}
                          </span>
                          <span className="chat-msg-time">{time}</span>
                        </div>
                        <div className="chat-msg-text">{msg.text}</div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef}/>
                </div>
                <div className="chat-input-row">
                  <input
                    ref={chatInputRef}
                    className="chat-input"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value.slice(0, 500))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                    maxLength={500}
                  />
                  <button className="chat-send-btn" onClick={sendMessage} onMouseEnter={ce} onMouseLeave={cl}>
                    ➤
                  </button>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {showHistory && (
              <div className="history-panel">
                {history.length === 0 ? (
                  <div className="history-empty">
                    <span style={{fontSize:'28px'}}>🕐</span>
                    <span>No snapshots yet.</span>
                    <span>Run code or change language</span>
                    <span>to create checkpoints.</span>
                  </div>
                ) : (
                  <>
                    <div className="history-count">
                      {history.length} snapshot{history.length !== 1 ? 's' : ''} · newest first
                    </div>
                    <div className="history-list">
                      {[...history].reverse().map((snap, revIdx) => {
                        const realIdx = history.length - 1 - revIdx;
                        const triggerLabels = {
                          'run': '▶ Run',
                          'leave': '← Left',
                          'lang-change': '⇄ Lang',
                          'before-restore': '⤺ Pre-restore',
                        };
                        const time = new Date(snap.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
                        const langObj = LANGUAGES.find(l => l.id === snap.language);
                        const preview = snap.code.split('\n').find(l => l.trim()) || '(empty)';
                        const isRestoring = restoringIdx === realIdx;
                        return (
                          <div key={realIdx} className="history-item">
                            <div className="history-item-header">
                              <span className={`history-trigger ${snap.trigger}`}>
                                {triggerLabels[snap.trigger] || snap.trigger}
                              </span>
                              <span className="history-item-user" style={{color: USER_COLORS[realIdx % USER_COLORS.length]}}>
                                {snap.username}
                              </span>
                              <span className="history-item-time">{time}</span>
                            </div>
                            <div className="history-item-lang">
                              {langObj?.icon} {langObj?.name || snap.language} · {snap.code.split('\n').length} lines
                            </div>
                            <div className="history-item-preview">{preview}</div>
                            <button
                              className={`history-restore-btn${isRestoring ? ' restoring' : ''}`}
                              onClick={() => restoreSnapshot(realIdx)}
                              onMouseEnter={ce} onMouseLeave={cl}
                            >
                              {isRestoring ? '✓ Restoring...' : '⤺ Restore this snapshot'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* EDITOR */}
          <div className="editor-area">
            <div className="editor-tabs">
              <div className="editor-tab">
                <span>{currentLang.icon}</span>
                {/* BUG-3 FIX: use centralised LANG_EXT map instead of inline ternary chain */}
                <span>main.{LANG_EXT[language] || 'txt'}</span>
              </div>
            </div>

            <div className="monaco-wrap" onClick={() => setShowLangDropdown(false)}>
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={handleCodeChange}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                  
                  defineCustomThemes(monaco);
                  
                  monaco.editor.setTheme(theme);
                
                  const emitCursor = (lineNumber, column) => {
                    const now = Date.now();
                    if (now - lastCursorEmit.current < 50) return; 
                    lastCursorEmit.current = now;
                    socketRef.current?.emit('cursor-move', {
                      roomId,
                      color:  myColor.current,
                      line:   lineNumber,
                      column: column,
                    });
                  };

                  
                  editor.onDidChangeCursorPosition((e) => {
                    emitCursor(e.position.lineNumber, e.position.column);
                  });

                  
                  editor.onMouseDown((e) => {
                    if (e.target?.position) {
                      
                      lastCursorEmit.current = 0;
                      emitCursor(e.target.position.lineNumber, e.target.position.column);
                    }
                  });

                  
                  editor.onKeyDown((e) => {
                    
                    setTimeout(() => {
                      const pos = editor.getPosition();
                      if (pos) emitCursor(pos.lineNumber, pos.column);
                    }, 10);
                  });
                }}
                theme={theme}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontLigatures: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  padding: { top: 16, bottom: 16 },
                  lineHeight: 1.7,
                  letterSpacing: 0.5,
                  renderLineHighlight: 'gutter',
                  bracketPairColorization: { enabled: true },
                }}
              />
            </div>

            {showOutput && (
              <div className="output-panel">
                <div className="output-resize"/>
                <div className="output-header">
                  <span className="output-title">// output</span>
                  {outputStatus !== 'idle' && (
                    <span className={`output-status ${outputStatus}`}>
                      {outputStatus === 'running' ? '⟳ running' : outputStatus === 'success' ? '✓ success' : '✗ error'}
                    </span>
                  )}
                  <span className="output-close" onClick={() => setShowOutput(false)} onMouseEnter={ce} onMouseLeave={cl}>×</span>
                </div>
                <div className={`output-content${outputStatus === 'error' ? ' error-text' : outputStatus === 'running' ? ' running-text' : ''}`}>
                  {outputStatus === 'idle' && (
                    <div className="empty-output">
                      <span style={{fontSize:'24px'}}>▶</span>
                      <span>Run your code to see output here</span>
                    </div>
                  )}
                  {outputStatus === 'running' && '⟳ Executing code...'}
                  {(outputStatus === 'success' || outputStatus === 'error') && output}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── VIDEO CALL PANEL ── */}
      {inCall && (
        <div style={{position:'fixed',bottom:'80px',right:'20px',zIndex:1000,display:'flex',flexDirection:'column',gap:'8px',alignItems:'flex-end'}}>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'flex-end'}}>
            <div id="local-video" style={{width:'160px',height:'120px',background:'#0a0f1e',borderRadius:'10px',border:'2px solid #38bdf8',overflow:'hidden'}}/>
            {remoteUsers.map(u => (
              <div key={u.uid} id={`remote-video-${u.uid}`} style={{width:'160px',height:'120px',background:'#0a0f1e',borderRadius:'10px',border:'2px solid #34d399',overflow:'hidden'}}/>
            ))}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={toggleMic} style={{padding:'8px 14px',background:micMuted?'rgba(248,113,113,0.2)':'rgba(56,189,248,0.15)',border:`1px solid ${micMuted?'#f87171':'#38bdf8'}`,borderRadius:'8px',color:'white',cursor:'pointer',fontSize:'13px'}}>
              {micMuted ? '🔇 Unmute' : '🎙 Mute'}
            </button>
            <button onClick={toggleCam} style={{padding:'8px 14px',background:camOff?'rgba(248,113,113,0.2)':'rgba(56,189,248,0.15)',border:`1px solid ${camOff?'#f87171':'#38bdf8'}`,borderRadius:'8px',color:'white',cursor:'pointer',fontSize:'13px'}}>
              {camOff ? '📷 Cam On' : '📹 Cam Off'}
            </button>
            <button onClick={leaveCall} style={{padding:'8px 14px',background:'rgba(248,113,113,0.2)',border:'1px solid #f87171',borderRadius:'8px',color:'#f87171',cursor:'pointer',fontSize:'13px'}}>
              📵 End Call
            </button>
          </div>
        </div>
      )}

      
      {!inCall && (
        <button onClick={joinCall} style={{position:'fixed',bottom:'20px',right:'20px',zIndex:1000,padding:'12px 20px',background:'linear-gradient(135deg,#0284c7,#38bdf8)',border:'none',borderRadius:'12px',color:'white',fontWeight:'700',fontSize:'14px',cursor:'pointer',boxShadow:'0 4px 20px rgba(56,189,248,0.4)',fontFamily:"'Space Grotesk',sans-serif"}}>
          📹 Join Voice/Video
        </button>
      )}
    </>
  );
};

export default Room;