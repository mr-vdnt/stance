import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ShieldAlert, Cpu, LogIn, LogOut, User as UserIcon, Layers, Upload, Camera, Mic, Paperclip, ChevronRight, AlertCircle, Trash2, Edit2, Sun, Moon, RotateCcw } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Message } from "../types";
import { aiService } from "../services/aiService";
import { dbService } from "../services/dbService";
import { MessageItem } from "./MessageItem";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface ChatInterfaceProps {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  onConversationCreated?: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, currentTitle: string) => void;
  onToggleMenu?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

const MODELS = [
  { id: "gemini-3-flash-preview", name: "Flash", description: "Speed optimized", isPro: false },
  { id: "gemini-3.1-pro-preview", name: "Pro", description: "Complex reasoning + Files", isPro: true },
];

const ETHICAL_MODES = [
  { id: 'utilitarian' as const, name: 'Utilitarian', icon: '⚖️' },
  { id: 'equal-value' as const, name: 'Equal Value', icon: '🤝' },
  { id: 'duty-based' as const, name: 'Duty-Based', icon: '📜' },
  { id: 'randomized' as const, name: 'Randomized Neutral', icon: '🎲' },
  { id: 'interpretive' as const, name: 'Thinking/UserChoice', icon: '💡' },
];

export function ChatInterface({ 
  activeConversationId, 
  setActiveConversationId, 
  onConversationCreated, 
  onDelete, 
  onRename, 
  onToggleMenu,
  isDarkMode,
  onToggleTheme
}: ChatInterfaceProps) {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTitle, setCurrentTitle] = useState("New Conversation");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [ethicalMode, setEthicalMode] = useState<typeof ETHICAL_MODES[number]['id']>('utilitarian');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: 'soft' | 'hard' } | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isPro = MODELS.find(m => m.id === selectedModel)?.isPro;

  const analyzedMessage = selectedAnalysisId 
    ? messages.find(m => m.id === selectedAnalysisId) 
    : [...messages].reverse().find(m => m.role === 'assistant' && !m.isDeleted);
  
  const biasScores = analyzedMessage?.biasScores;
  
  // Normalization helper (Largest Remainder Method) to ensure scores sum to exactly 100%
  const getRoundedPercentages = (vals: number[], targetSum: number = 100) => {
    const total = vals.reduce((a, b) => a + b, 0);
    if (total === 0) return vals.map(() => 0);
    
    // 1. Calculate precise percentages and their floor values
    const percentages = vals.map(v => (v / total) * targetSum);
    const floors = percentages.map(v => Math.floor(v));
    const remainders = percentages.map((v, i) => ({ index: i, val: v - Math.floor(v) }));
    
    // 2. Calculate the difference from the target sum
    let currentSum = floors.reduce((a, b) => a + b, 0);
    const diff = targetSum - currentSum;
    
    // 3. Distribute the difference to items with the largest remainders
    remainders.sort((a, b) => b.val - a.val);
    for (let i = 0; i < diff; i++) {
      floors[remainders[i].index]++;
    }
    
    return floors;
  };

  // 1. Overall Analysis (9 Categories) - Sums to 100%
  const categoriesRaw = biasScores ? [
    biasScores.toxicity || 0,
    biasScores.genderBias || 0,
    biasScores.racialBias || 0,
    biasScores.politicalBias || 0,
    biasScores.ageism || 0,
    biasScores.ableism || 0,
    biasScores.socialBias || 0,
    biasScores.economicBias || 0,
    biasScores.logical || 0
  ] : [];
  
  const roundedPercentages = getRoundedPercentages(categoriesRaw);
  const normalizedScores = biasScores ? {
    toxicity: roundedPercentages[0] / 100,
    genderBias: roundedPercentages[1] / 100,
    racialBias: roundedPercentages[2] / 100,
    politicalBias: roundedPercentages[3] / 100,
    ageism: roundedPercentages[4] / 100,
    ableism: roundedPercentages[5] / 100,
    socialBias: roundedPercentages[6] / 100,
    economicBias: roundedPercentages[7] / 100,
    logical: roundedPercentages[8] / 100,
  } : null;

  // 2. Certainty Calculation (Average of confidence scores)
  const calculateCertainty = () => {
    if (!biasScores?.confidenceScores) return 0;
    const scores = Object.values(biasScores.confidenceScores);
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };
  const certaintyAvg = calculateCertainty();

  const biasData = normalizedScores ? [
    { subject: 'TOXIC', A: normalizedScores.toxicity * 100 },
    { subject: 'GENDER', A: normalizedScores.genderBias * 100 },
    { subject: 'RACE', A: normalizedScores.racialBias * 100 },
    { subject: 'POLITIC', A: normalizedScores.politicalBias * 100 },
    { subject: 'AGE', A: normalizedScores.ageism * 100 },
    { subject: 'ABLEISM', A: normalizedScores.ableism * 100 },
    { subject: 'SOCIAL', A: normalizedScores.socialBias * 100 },
    { subject: 'ECON', A: normalizedScores.economicBias * 100 },
    { subject: 'LOGIC', A: normalizedScores.logical * 100 },
  ] : [];

  useEffect(() => {
    // Suppress benign Vite websocket errors that trigger unhandled rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('WebSocket') || event.reason?.message?.includes('vite')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => {
      unsubscribe();
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (activeConversationId && user) {
      const unsubscribe = dbService.subscribeToMessages(activeConversationId, (newMessages) => {
        setMessages(newMessages);
      });
      
      // Load ethical mode and model from conversation if they exist
      const loadConvData = async () => {
        try {
          const conversations = await dbService.getConversations();
          const current = conversations.find(c => c.id === activeConversationId);
          if (current) {
            if (current.preferredModel) setSelectedModel(current.preferredModel);
            if (current.ethicalMode) setEthicalMode(current.ethicalMode);
            if (current.title) setCurrentTitle(current.title);
          }
        } catch (err) {
          setError("Failed to load session preferences.");
        }
      };
      loadConvData();
      
      return () => unsubscribe();
    } else if (!activeConversationId) {
      setMessages([]);
    }
  }, [activeConversationId, user]);

  const handleLogin = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError("AUTHENTICATION BLOCKED: Please enable popups for this site or open the app in a NEW TAB to continue.");
      } else {
        setError(err.message || "Failed to establish secure link.");
      }
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteMessage = async () => {
    if (!deleteConfig) return;
    
    try {
      // Find the message to shift focus to if we are deleting the selected one or its ancestor
      if (selectedAnalysisId) {
        const msgIndex = messages.findIndex(m => m.id === deleteConfig.id);
        const selectedIndex = messages.findIndex(m => m.id === selectedAnalysisId);
        
        // If we are deleting the selected message OR it's a descendant during a hard wipe
        if (selectedAnalysisId === deleteConfig.id || (deleteConfig.type === 'hard' && selectedIndex > msgIndex)) {
          const prevAssistant = [...messages.slice(0, msgIndex)].reverse().find(m => m.role === 'assistant' && !m.isDeleted);
          setSelectedAnalysisId(prevAssistant?.id || null);
        }
      }

      if (deleteConfig.type === 'soft') {
        await dbService.deleteMessage(deleteConfig.id);
      } else {
        // Hard Delete / History Rollback
        // Find all messages that come after this one in the same conversation
        const msgIndex = messages.findIndex(m => m.id === deleteConfig.id);
        if (msgIndex !== -1) {
          const descendantIds = messages.slice(msgIndex + 1)
            .map(m => m.id)
            .filter(Boolean) as string[];
          
          await dbService.hardDeleteMessage(deleteConfig.id, descendantIds);
        }
      }
      setDeleteConfig(null);
    } catch (err) {
      setError("Protocol Failure: Failed to synchronize history vectors.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userText = input;
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      let currentId = activeConversationId;
      const isNewConversation = !currentId;

      if (!currentId) {
        // Initial placeholder title
        currentId = await dbService.createConversation("New Conversation", selectedModel, ethicalMode);
        setActiveConversationId(currentId);
        onConversationCreated?.();
      }

      const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

      const userMsgId = await dbService.addMessage({
        conversationId: currentId,
        role: "user",
        content: userText,
        parentId: lastMsgId
      });

      const history = messages
        .filter(m => !m.isDeleted)
        .map(m => ({ role: m.role, content: m.content }));
      const result = await aiService.processInput(userText, history, selectedModel, ethicalMode);

      await dbService.addMessage({
        conversationId: currentId,
        role: "assistant",
        content: result.finalContent,
        originalContent: result.originalContent,
        isCorrected: result.isCorrected,
        biasScores: result.biasScores,
        parentId: userMsgId || lastMsgId
      });

      // Update title after every exchange to keep it descriptive
      const updatedHistory = [
        ...messages,
        { role: 'user', content: userText, conversationId: currentId, createdAt: new Date() },
        { role: 'assistant', content: result.finalContent, conversationId: currentId, createdAt: new Date() }
      ] as Message[];
      
      const newTitle = await aiService.generateTitleFromHistory(updatedHistory);
      await dbService.updateConversationTitle(currentId, newTitle);
      onConversationCreated?.();

    } catch (err: any) {
      console.error("Chat Error:", err);
      setError("AI Service Interruption: Failed to process logical vector.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-w-0 font-sans overflow-hidden">
      {/* Left Chat Window */}
      <div className="flex-1 flex flex-col bg-transparent min-w-0 relative h-full">
        {/* Header */}
        <header className="h-20 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 md:px-10 bg-[var(--glass-bg)] backdrop-blur-2xl sticky top-0 z-10 shrink-0">
          <div className="flex gap-4 md:gap-6 items-center">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={onToggleMenu}
              className="lg:hidden p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 text-[var(--text-main)] active:scale-90 transition-all"
            >
              <Layers className="w-5 h-5 rotate-90" />
            </button>

            <div className="flex flex-col gap-1 items-start max-w-[150px] md:max-w-xs group cursor-pointer" 
                 onClick={() => activeConversationId && onRename?.(activeConversationId, currentTitle)}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] truncate max-w-full">
                  {currentTitle}
                </span>
                <Edit2 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                {MODELS.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      if (activeConversationId) dbService.updateConversationMetadata(activeConversationId, { preferredModel: m.id });
                    }}
                    className={cn(
                      "px-3 md:px-4 py-1.5 rounded-xl text-[9px] md:text-[10px] font-bold uppercase transition-all tracking-wider",
                      selectedModel === m.id 
                        ? "bg-[var(--text-main)] text-[var(--bg-app)] shadow-xl scale-[1.02]" 
                        : "text-zinc-500 hover:text-[var(--text-main)]"
                    )}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[11px] text-[var(--text-main)] uppercase font-bold tracking-widest">{user.displayName || 'Agent'}</span>
                  <button onClick={handleLogout} className="text-[9px] text-zinc-500 hover:text-brand-orange transition-colors uppercase font-bold tracking-widest cursor-pointer opacity-60">Log Out</button>
                </div>
                <div className="p-0.5 rounded-2xl bg-gradient-to-tr from-brand-orange to-brand-gold shadow-lg">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-[14px] overflow-hidden bg-black/20">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/20 text-zinc-400">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2.5 px-4 md:px-6 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-95"
                style={{ background: 'var(--gradient-cta)' }}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Auth Init</span>
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 md:px-10 py-10 space-y-12 scroll-smooth custom-scrollbar"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold uppercase tracking-widest"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto hover:scale-110 transition-transform">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto p-4 space-y-16 animate-in fade-in zoom-in-95 duration-1000">
               <div className="space-y-6">
                 <div className="flex items-center justify-center gap-4 opacity-30">
                    <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[var(--text-main)]"></div>
                    <Layers className="w-5 h-5" />
                    <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[var(--text-main)]"></div>
                 </div>
                 <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[var(--text-main)] lowercase font-sans">
                   absolute<br/>
                   <span className="italic opacity-40 font-light pr-4">decisive</span>STANCE<span className="text-brand-orange">.</span>
                 </h1>
               </div>

               <div className="flex flex-col items-center space-y-10">
                 <div className="flex flex-col items-center gap-3">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></div>
                     <span className="text-xl font-bold tracking-tight text-[var(--text-main)] uppercase tracking-[0.2em]">Neural System</span>
                   </div>
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] opacity-50">I resolve. I distinguish. I decide.</p>
                 </div>

                 {!user && (
                    <button 
                      onClick={handleLogin}
                      className="px-12 py-4 text-white text-[10px] uppercase font-bold tracking-[0.3em] rounded-full transition-all shadow-2xl hover:scale-105 active:scale-95"
                      style={{ background: 'var(--gradient-cta)' }}
                    >
                      Establish Link
                    </button>
                 )}
               </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div 
              key={m.id || i}
              onClick={() => m.role === 'assistant' && !m.isDeleted && setSelectedAnalysisId(m.id || null)}
              className={cn(
                "cursor-pointer transition-all duration-300 rounded-[2.8rem] p-2",
                selectedAnalysisId === m.id && m.role === 'assistant' ? "bg-brand-orange/5 ring-1 ring-brand-orange/20" : "hover:bg-black/2 dark:hover:bg-white/2"
              )}
            >
              <MessageItem 
                message={m} 
                onDelete={(id, type) => setDeleteConfig({ id, type })}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 md:gap-8 animate-in fade-in slide-in-from-left-2 duration-500">
              <div className="w-10 h-10 bg-black/5 dark:bg-white/5 text-zinc-500 rounded-2xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold animate-pulse uppercase tracking-tighter">AI</div>
              <div className="flex-1 bg-[var(--bubble-ai)] px-8 py-7 rounded-[2.5rem] border border-[var(--glass-border)] flex items-center gap-4 shadow-xl">
                <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Processing Rational Vectors...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <footer className="p-4 md:p-10 bg-transparent">
          <form onSubmit={handleSubmit} className="relative max-w-5xl mx-auto flex items-center shadow-2xl rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-brand-orange to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"></div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!user}
              placeholder={user ? "Execute logical query..." : "Authentication Required"}
              className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[1.5rem] md:rounded-[2rem] py-4 md:py-6 px-6 md:px-10 pr-12 md:pr-48 text-[14px] md:text-[15px] font-medium text-[var(--text-main)] placeholder:text-zinc-500/50 focus:outline-none transition-all disabled:opacity-50 backdrop-blur-3xl"
            />
            <div className="absolute right-3 md:right-6 flex items-center gap-2 md:gap-3">
              <AnimatePresence>
                {isPro && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hidden lg:flex items-center gap-2 pr-6 mr-2 border-r border-black/5 dark:border-white/5"
                  >
                    <button type="button" className="p-2.5 rounded-xl text-zinc-500 hover:text-brand-orange transition-all">
                      <Camera className="w-4 h-4" />
                    </button>
                    <button type="button" className="p-2.5 rounded-xl text-zinc-500 hover:text-brand-gold transition-all">
                      <Mic className="w-4 h-4" />
                    </button>
                    <button type="button" className="p-2.5 rounded-xl text-zinc-500 hover:text-brand-pink transition-all">
                       <Paperclip className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!input.trim() || isLoading || !user}
                className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 text-white disabled:bg-zinc-800 disabled:text-zinc-600"
                style={{ background: input.trim() && !isLoading ? 'var(--gradient-cta)' : undefined }}
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </form>
        </footer>
      </div>

      {/* Right Sidebar: Bias Vector Analysis */}
      <aside className="w-80 glass-morphism bg-[var(--glass-bg)] border-l ml-[-1px] p-10 hidden xl:flex flex-col">
        <div className="mb-12 overflow-y-auto custom-scrollbar flex-1 pr-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-orange shadow-[0_0_15px_rgba(255,159,67,0.5)]"></div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--text-main)] opacity-60">Rational Monitor</h3>
            </div>
            {selectedAnalysisId && (
              <button 
                onClick={() => setSelectedAnalysisId(null)}
                className="text-[9px] font-bold uppercase tracking-widest text-brand-orange hover:text-brand-orange/80 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Live Focus
              </button>
            )}
          </div>

          {/* Compact Ethical Mode Selector Tabs */}
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 opacity-50 ml-1">Ethical Framework</span>
              <div className="grid grid-cols-5 gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-white/5">
                {ETHICAL_MODES.map(mode => (
                  <button 
                    key={mode.id}
                    onClick={() => {
                      setEthicalMode(mode.id);
                      if (activeConversationId) dbService.updateConversationMetadata(activeConversationId, { ethicalMode: mode.id });
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-300 relative group",
                      ethicalMode === mode.id 
                        ? "bg-white/10 text-brand-orange shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                    title={mode.name}
                  >
                    <span className="text-sm mb-0.5">{mode.icon}</span>
                    {ethicalMode === mode.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 inset-x-2 h-0.5 bg-brand-orange rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {analyzedMessage?.biasScores ? (
            <div className="space-y-10">
              <div className="flex flex-col gap-1 mb-2">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-orange">Analyzing Vector:</span>
                <span className="text-[10px] font-medium text-zinc-500 truncate opacity-80">
                  {analyzedMessage.id?.slice(0, 8)}... - {new Date(analyzedMessage.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="h-64 min-h-[256px] w-full bg-black/5 dark:bg-white/5 rounded-3xl p-4 flex items-center justify-center overflow-hidden">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                  <RadarChart cx="50%" cy="50%" outerRadius="55%" data={biasData}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#888', fontSize: 7, fontWeight: '800', letterSpacing: '0.1em' }} 
                    />
                    <Radar
                      name="Bias Vector"
                      dataKey="A"
                      stroke="var(--color-brand-orange)"
                      fill="var(--color-brand-orange)"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Toxic", score: normalizedScores?.toxicity || 0, color: "bg-brand-orange" },
                  { label: "Gender", score: normalizedScores?.genderBias || 0, color: "bg-brand-pink" },
                  { label: "Race", score: normalizedScores?.racialBias || 0, color: "bg-brand-green" },
                  { label: "Political", score: normalizedScores?.politicalBias || 0, color: "bg-brand-blue" },
                  { label: "Age", score: normalizedScores?.ageism || 0, color: "bg-brand-gold" },
                  { label: "Disability", score: normalizedScores?.ableism || 0, color: "bg-purple-500" },
                  { label: "Social", score: normalizedScores?.socialBias || 0, color: "bg-cyan-500" },
                  { label: "Economic", score: normalizedScores?.economicBias || 0, color: "bg-indigo-500" },
                  { label: "Logical", score: normalizedScores?.logical || 0, color: "bg-[var(--text-main)]" },
                  { label: "Certainty", score: certaintyAvg, color: "bg-brand-orange shadow-[0_0_15px_rgba(255,159,67,0.4)]" }
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-all">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-widest">{item.label}</span>
                      <span className="text-xs font-bold text-[var(--text-main)] tracking-tight">{(item.score * 100).toFixed(0)}%</span>
                      <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", item.color)} 
                          style={{ width: `${item.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confidence Matrix (Certainty Table) */}
              <div className="space-y-4 pt-6 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between px-1">
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 opacity-60">Confidence Matrix</span>
                   <span className="text-[10px] font-bold text-brand-orange">avg: {(certaintyAvg * 100).toFixed(1)}%</span>
                </div>
                <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5">
                        <th className="px-4 py-2 text-[8px] font-bold uppercase tracking-widest text-zinc-500">Vector</th>
                        <th className="px-4 py-2 text-[8px] font-bold uppercase tracking-widest text-zinc-500 text-right">Decisiveness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {biasScores?.confidenceScores && Object.entries(biasScores.confidenceScores).map(([key, value]) => (
                        <tr key={key} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2 text-[10px] font-medium text-zinc-400 capitalize">{key.replace(/Bias$/, '')}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-[var(--text-main)] text-right">
                            {(value * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest leading-relaxed opacity-40 px-1 italic">
                  * Decisiveness represents the AI's internal certainty in its categorization protocol.
                </p>
              </div>
              
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-black/5 dark:border-white/5 rounded-3xl p-8 text-center space-y-4">
              <Cpu className="w-8 h-8 text-zinc-500 opacity-20" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold leading-relaxed opacity-40 px-6">
                Waiting for neural cycle ignition.
              </span>
            </div>
          )}
        </div>

        <div className="pt-10 border-t border-black/5 dark:border-white/5 mt-auto">
          <div className="p-6 rounded-3xl bg-black/5 dark:bg-white/2 border border-transparent flex items-center justify-center">
            <p className="text-[10px] text-zinc-500 font-bold leading-relaxed text-center uppercase tracking-[0.3em] opacity-60 italic">
              Protocols Active.
            </p>
          </div>
        </div>
      </aside>

      {/* Delete Message Confirmation Modal */}
      <AnimatePresence>
        {deleteConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfig(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-app)] border border-[var(--glass-border)] rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                {deleteConfig.type === 'hard' ? (
                  <RotateCcw className="w-12 h-12 text-rose-500 opacity-20 animate-pulse" />
                ) : (
                  <Trash2 className="w-8 h-8 text-zinc-500 opacity-20" />
                )}
              </div>
              
              <div className="relative space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold tracking-tight text-[var(--text-main)] italic">
                    {deleteConfig.type === 'hard' ? 'Protocol Wipe?' : 'Soft Redaction?'}
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold leading-relaxed opacity-60">
                    {deleteConfig.type === 'hard' 
                      ? "IRREVERSIBLE: This will remove this message and ALL downstream history, recalculating the conversation's logical integrity."
                      : "This will mask the content locally but preserve the conversation structure."}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    type="button"
                    onClick={handleDeleteMessage}
                    className={cn(
                      "w-full py-4 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                      deleteConfig.type === 'hard' 
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30" 
                        : "bg-zinc-800 hover:bg-zinc-900 shadow-zinc-900/30"
                    )}
                  >
                    Confirm {deleteConfig.type === 'hard' ? 'Wipe' : 'Redaction'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDeleteConfig(null)}
                    className="w-full py-4 rounded-2xl bg-black/5 dark:bg-white/5 text-[var(--text-main)] text-[10px] font-bold uppercase tracking-widest hover:bg-black/10 transition-all active:scale-95"
                  >
                    Abort
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
