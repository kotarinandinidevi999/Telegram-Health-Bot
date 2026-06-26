import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  ExternalLink, 
  HeartPulse, 
  Settings, 
  Copy, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  BookOpen, 
  ShieldAlert, 
  Activity, 
  Info, 
  Terminal, 
  Zap, 
  X,
  Play,
  Square,
  Sparkles,
  Award,
  ChevronRight,
  User,
  CheckCircle2
} from 'lucide-react';
import { Message, PresetCommand } from './types';
import FormattedMessage from './components/FormattedMessage';

const PRESET_COMMANDS: PresetCommand[] = [
  {
    label: "🦠 Get Disease Info",
    command: "Asthma",
    category: "disease",
    icon: "Virus",
    description: "Get brief overview, symptoms, causes, diagnosis, treatments, and prevention rules of Asthma."
  },
  {
    label: "🤒 Analyze Symptoms",
    command: "I have a dry cough, low fever, and fatigue",
    category: "symptom",
    icon: "Stethoscope",
    description: "Get differential lists of possible causes, explanation of overlap, other general tips."
  },
  {
    label: "💊 Ask About medicine",
    command: "What is Paracetamol used for?",
    category: "medicine",
    icon: "Activity",
    description: "See purpose, precautions, common side effects. Never lists dosages."
  },
  {
    label: "🌿 Dynamic Health Tips",
    command: "Give me diet and hydration advice",
    category: "tips",
    icon: "Sparkles",
    description: "Returns diet advice, sleep guidelines, hydration tips, and other wellness support."
  },
  {
    label: "🚨 Emergency Test",
    command: "I feel chest pain and difficulty breathing",
    category: "emergency",
    icon: "ShieldAlert",
    description: "Instantly triggers emergency protocol safety warnings, bypassing the main model."
  }
];

export default function App() {
  const [activeTab, setActiveTab ] = useState<'console' | 'simulator'>('console');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "g1",
      sender: "bot",
      text: `🩺 MediGuide AI – Live Assistant Active
      
📖 Overview:
Welcome to your MediGuide AI Workspace! I am activated and ready. I provide educational medical details following strict medical guidelines.
      
🤒 Symptoms:
• Test me by sending a health prompt or entering a condition!
• Try the quick command presets or connect a real Telegram bot.
      
⚠️ Warning: Always consult a professional for clinical concerns.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [botToken, setBotToken] = useState("");
  
  // Real active server state polling
  const [serverState, setServerState] = useState({
    status: 'idle',
    error: null as string | null,
    botInfo: null as { username: string; firstName: string } | null,
    tokenPrefix: null as string | null,
    stats: {
      connectedAt: null as string | null,
      totalMessagesProcessed: 0,
      emergencyTriggers: 0,
      activeChatsCount: 0
    }
  });

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [connectionMsg, setConnectionMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll Telegram Bot Status from server
  const fetchBotStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setServerState(data);
      }
    } catch (e) {
      console.error("Could not fetch telegram bot status:", e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchBotStatus();
    // Poll status periodically (every 5 seconds) to keep statistics updated live!
    const interval = setInterval(fetchBotStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of simulator when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Connect real telegram bot
  const handleConnectBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken.trim()) return;

    setConnectionMsg(null);
    setIsLoadingStatus(true);

    try {
      const response = await fetch('/api/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botToken })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setConnectionMsg({ type: 'success', text: `Successfully linked ${data.botInfo?.firstName || 'Bot'}! Polling is active.` });
        setBotToken("");
        fetchBotStatus();
      } else {
        setConnectionMsg({ type: 'error', text: data.error || "Connection failed. Please check the bot token." });
      }
    } catch (err: any) {
      setConnectionMsg({ type: 'error', text: "Internal connection error. Please try again." });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Disconnect Telegram bot
  const handleDisconnectBot = async () => {
    setConnectionMsg(null);
    setIsLoadingStatus(true);
    try {
      const response = await fetch('/api/telegram/stop', { method: 'POST' });
      if (response.ok) {
        setConnectionMsg({ type: 'success', text: "Telegram Bot connection terminated successfully." });
        fetchBotStatus();
      }
    } catch (err) {
      setConnectionMsg({ type: 'error', text: "Disconnect failed. Please try again." });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Submit in Simulator Chat Window
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    // Create unique id for user message
    const userMsgId = 'u-' + Date.now();
    const newUserMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    if (!customText) setInputText("");
    setIsTyping(true);

    try {
      // Map history to the simplified API scheme
      const historyPayload = messages.map(msg => ({
        role: msg.sender === 'bot' ? 'model' : 'user',
        text: msg.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botMsgId = 'b-' + Date.now();
        const responseText = data.text;

        setMessages(prev => [...prev, {
          id: botMsgId,
          sender: 'bot',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isEmergency: data.isEmergency
        }]);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Simulation response failed.");
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        sender: 'bot',
        text: `⚠️ Simulation Error\nCould not process query. Response details: ${err.message || 'Check model API key configuration inside Secrets panel.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText("/start");
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900" id="medi-guide-workspace">
      
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-3.5 transition-all" id="applet-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-xl shadow-xs">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg tracking-tight text-gray-900">MediGuide AI</h1>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded-full font-mono uppercase">
                  Telegram Daemon
                </span>
              </div>
              <p className="text-xs text-gray-500">Live AI Medical Information Assistant Dashboard & Simulated Environment</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              serverState.status === 'running' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : serverState.status === 'error'
                ? 'bg-red-50 border-red-200 text-red-800 animate-pulse'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                serverState.status === 'running' 
                  ? 'bg-emerald-500 animate-ping' 
                  : serverState.status === 'error'
                  ? 'bg-red-500' 
                  : 'bg-amber-500'
              }`} />
              <span className="font-mono">
                Real Bot Status: {serverState.status === 'running' ? '● Connected' : serverState.status === 'error' ? '● Error' : '○ Standby (Local)'}
              </span>
            </div>

            <button 
              onClick={fetchBotStatus}
              disabled={isLoadingStatus}
              className="p-2 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 rounded-lg transition"
              title="Refresh engine status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: INTERACTIVE CONTROLLER (7 COLS ON LARGE SCREENS) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          
          {/* TABS SELECTOR */}
          <div className="bg-white border border-gray-200 p-1.5 rounded-xl flex gap-1 shadow-xs">
            <button
              onClick={() => setActiveTab('console')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'console'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Telegram Connection Console
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Dynamic Chat Emulator
            </button>
          </div>

          {activeTab === 'console' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* BOT CONFIGURATION / CONTROLLER */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                    <h2 className="font-display font-semibold text-base text-gray-900">Telegram configuration</h2>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">Status check</span>
                </div>

                {connectionMsg && (
                  <div className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 animate-fadeIn ${
                    connectionMsg.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {connectionMsg.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <p className="font-sans leading-relaxed">{connectionMsg.text}</p>
                    <button onClick={() => setConnectionMsg(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {serverState.status === 'running' && serverState.botInfo ? (
                  /* RUNNING TELEGRAM STATE SHOWCASE */
                  <div className="bg-gradient-to-tr from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center font-display text-lg font-bold shadow-xs">
                          {serverState.botInfo.firstName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 font-display text-base tracking-tight">{serverState.botInfo.firstName}</h3>
                          <a 
                            href={`https://t.me/${serverState.botInfo.username}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-sky-700 font-medium hover:underline tracking-wide mt-0.5"
                          >
                            @{serverState.botInfo.username}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg font-mono flex items-center gap-1 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        Live Polling
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 mt-2">
                      <div className="p-3 bg-white/70 border border-white/60 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Total Queries</span>
                        <span className="text-xl font-display font-semibold text-gray-800">{serverState.stats.totalMessagesProcessed}</span>
                      </div>
                      <div className="p-3 bg-white/70 border border-white/60 rounded-xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">active chats</span>
                        <span className="text-xl font-display font-semibold text-gray-800">{serverState.stats.activeChatsCount}</span>
                      </div>
                      <div className="p-3 bg-white/70 border border-white/60 rounded-xl col-span-2 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Emergency Alerts Blocked</span>
                          <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            {serverState.stats.emergencyTriggers} events triggered
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">Uptime active</span>
                      </div>
                    </div>

                    <div className="border-t border-sky-100/50 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        Token in use: <code className="bg-white/80 px-2 py-0.5 rounded border border-sky-100 font-mono text-gray-700 text-[11px]">{serverState.tokenPrefix}</code>
                      </div>
                      <button 
                        onClick={handleDisconnectBot}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        Disconnect Bot Daemon
                      </button>
                    </div>
                  </div>
                ) : (
                  /* INACTIVE DISCONNECTED STATE */
                  <div className="flex flex-col gap-4">
                    <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 text-xs text-gray-600 leading-relaxed font-sans flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900">Run a LIVE Bot instance from this browser</p>
                        <p>
                          MediGuide AI has a real backend loop. Just supply a Telegram Bot API token. The container will instantly register, initiate polling, and respond to your users in Telegram following exact safety regulations.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleConnectBot} className="flex flex-col gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Telegram Bot Secret Token</label>
                        <div className="flex gap-2">
                          <input 
                            type="password"
                            placeholder="e.g. 782946571:AAFkW8zF3eKz_uP29D-K38vD7..."
                            value={botToken}
                            onChange={(e) => setBotToken(e.target.value)}
                            className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs transition"
                          />
                          <button
                            type="submit"
                            disabled={isLoadingStatus || !botToken.trim()}
                            className="px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs transition"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Launch Bot
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* STEP-BY-STEP BOTFATHER PROMPT GUIDE */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <BookOpen className="w-5 h-5 text-sky-500" />
                  <h3 className="font-display font-semibold text-base text-gray-950">How to create your Telegram Bot</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  <div className="p-3 bg-gray-50 rounded-xl flex flex-col justify-between border border-gray-100">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Step 1: BotFather</span>
                    <p className="text-xs text-gray-600 leading-relaxed font-sans mb-3">
                      Open Telegram, search for the official <strong className="text-gray-900">@BotFather</strong>, and start a conversation.
                    </p>
                    <a 
                      href="https://t.me/BotFather" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5 mt-auto"
                    >
                      Open BotFather
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl flex flex-col justify-between border border-gray-100">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Step 2: Create Bot</span>
                    <p className="text-xs text-gray-600 leading-relaxed font-sans mb-3">
                      Send command <code className="bg-white px-1.5 py-0.5 border border-gray-200 rounded font-mono text-gray-800 text-[10px]">/newbot</code>. 
                      Follow the prompts to name your assistant "MediGuide AI".
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono mt-auto">Choose a unique username</span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl flex flex-col justify-between border border-gray-100">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Step 3: Copy token</span>
                    <p className="text-xs text-gray-600 leading-relaxed font-sans mb-3">
                      Copy the API token shown (looks like <code className="font-mono text-gray-800 text-[10px]">123456:ABC...</code>) and paste it into the console above!
                    </p>
                    <button 
                      onClick={handleCopyCode}
                      className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5 mt-auto text-left"
                    >
                      {copiedText ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5" /> Copied command!
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-blue-600">
                          <Copy className="w-3 h-3" /> Copy start command
                        </span>
                      )}
                    </button>
                  </div>

                </div>

                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-gray-500 font-sans">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Real-time safety rules, medical disclaimers, and urgent alerts are managed on the server.</span>
                  </div>
                  <span className="font-mono text-[10px] text-sky-600 uppercase tracking-wider">v1.2 Active</span>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'simulator' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4 animate-fadeIn">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h3 className="font-display font-semibold text-base text-gray-900">Emulator Sandbox</h3>
                </div>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider">
                  Web-local prompt check
                </span>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Test the internal Gemini API health regulations instantly. Type any test scenario below or click on any of the preloaded clinical trigger cards inside the target shelf below.
              </p>

              {/* DEMO CARD PRESETS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Available Clinical Triggers (Ready Test Cases)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="preset-grid">
                  {PRESET_COMMANDS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputText(preset.command);
                        handleSendMessage(preset.command);
                        setActiveTab('simulator'); // fallback focus
                      }}
                      className="p-3 bg-gray-50 border border-gray-150 rounded-xl hover:bg-sky-50/50 hover:border-sky-200 text-left transition-all active:scale-[0.99] group flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[11px] font-semibold text-blue-700 group-hover:text-blue-800">
                          {preset.label}
                        </span>
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-sans leading-snug line-clamp-2">
                        {preset.description}
                      </p>
                      <code className="text-[9px] font-mono mt-2 text-gray-400 bg-white border border-gray-100 px-1 py-0.5 rounded max-w-full truncate block">
                        "{preset.command}"
                      </code>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TELEGRAM SAFETY STATEMENT POLICIES */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-display font-semibold text-sm text-gray-950 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Core Safety Directives (Programmed into Prompt)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed text-gray-600 font-sans">
              <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl space-y-1">
                <span className="font-semibold text-red-900 flex items-center gap-1">
                  🚫 Strict Prohibitions
                </span>
                <ul className="list-disc pl-4 space-y-1 text-red-800 text-[11px]">
                  <li>Never confirm a disease or state diagnostics.</li>
                  <li>Never prescribe dosage levels or medication administration rules, ever.</li>
                  <li>No claiming to cure or restore chronic failure.</li>
                </ul>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-1">
                <span className="font-semibold text-emerald-900 flex items-center gap-1">
                  🛡️ Active Mandates
                </span>
                <ul className="list-disc pl-4 space-y-1 text-emerald-800 text-[11px]">
                  <li>Always return educational information.</li>
                  <li>Always appends the official Mediguide safety disclaimer at final lines.</li>
                  <li>Always prompt urgent help if severe risks apply.</li>
                </ul>
              </div>
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: THE HIGH-FIDELITY TELEGRAM GRAPHICS ENVIRONMENT (5 COLS) */}
        <section className="lg:col-span-5 flex flex-col h-[650px] lg:h-auto min-h-[600px] bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden" id="telegram-mock">
          
          {/* Mock Client Header */}
          <div className="bg-white border-b border-gray-150 px-4 py-3 flex items-center justify-between" id="telegram-header">
            <div className="flex items-center gap-3">
              {/* Tele-Styled Icon */}
              <div className="relative">
                <div className="w-10 h-10 bg-[#2aabee] text-white rounded-full flex items-center justify-center font-display font-bold text-base shadow-xs">
                  M
                </div>
                {/* Active Indicator status */}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-semibold text-sm text-gray-900 tracking-tight">
                    {serverState.botInfo?.firstName || 'MediGuide AI Bot'}
                  </span>
                  <span className="text-[9px] bg-sky-50 text-sky-800 font-bold px-1.5 py-0.2 rounded border border-sky-100">
                    BOT
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-sans block leading-none">
                  {isTyping ? 'typing...' : 'bot is active'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10.5px] font-mono text-gray-400 block uppercase">Simulator Channel</span>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium mt-0.5 inline-block">
                Gemini-3.5-Flash
              </span>
            </div>
          </div>

          {/* TELEGRAM STYLE BACKGROUND & STREAM BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 telegram-bg min-h-0" id="telegram-scroll-area">
            
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[88%] ${msg.sender === 'user' ? 'ml-auto items-end animate-sliceUp' : 'mr-auto items-start animate-sliceDown'}`}
              >
                
                {/* ID Tagging & Metadata Header */}
                <span className="text-[10px] text-gray-400 mb-1 px-1 font-mono flex items-center gap-1">
                  {msg.sender === 'user' ? <User className="w-3 h-3" /> : <HeartPulse className="w-3 h-3 text-blue-500" />}
                  {msg.sender === 'user' ? 'Telegram User' : (serverState.botInfo?.firstName || 'MediGuide AI')} • {msg.timestamp}
                </span>

                {/* Bubble Container */}
                <div className={`p-1.5 rounded-2xl shadow-xs transition-colors ${
                  msg.sender === 'user' 
                    ? 'bg-[#e2f4fe] border border-sky-200 text-gray-900 rounded-tr-none' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                  {msg.sender === 'user' ? (
                    <div className="px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="px-2 py-1 max-w-full">
                      <FormattedMessage text={msg.text} isEmergency={msg.isEmergency} />
                    </div>
                  )}
                </div>

              </div>
            ))}

            {isTyping && (
              <div className="flex flex-col items-start mr-auto max-w-[88%] animate-pulse">
                <span className="text-[10px] text-gray-400 mb-1 px-1 font-mono">
                  {serverState.botInfo?.firstName || 'MediGuide AI'} is formulating response...
                </span>
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* TELEGRAM STYLE INPUT TRAY */}
          <div className="p-3 bg-white border-t border-gray-150 flex items-center gap-2" id="telegram-input-tray">
            <input 
              type="text" 
              placeholder="Send symptoms, disease name or wellness prompt..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isTyping) {
                  handleSendMessage();
                }
              }}
              disabled={isTyping}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2aabee] focus:border-[#2aabee] transition-all"
            />
            
            <button 
              onClick={() => handleSendMessage()}
              disabled={isTyping || !inputText.trim()}
              className="p-3 bg-[#2aabee] text-white rounded-full hover:bg-[#1a9bdb] disabled:opacity-40 shadow-xs hover:shadow-sm active:scale-95 transition-all text-xs flex items-center justify-center"
              title="Submit message to simulation"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

        </section>

      </main>

      {/* FOOTER SECTION */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4 text-center text-xs text-gray-400 mt-5 font-sans" id="workspace-footer">
        <p>© 2026 MediGuide AI workspace • Provided for educational sandbox checks only</p>
        <p className="mt-1">Built using Antigravity and the @google/genai SDK • Models default to gemini-3.5-flash</p>
      </footer>

    </div>
  );
}
