import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ShieldAlert, Cpu, LogIn, LogOut, User as UserIcon, Layers, Upload, Camera, Mic, Paperclip, ChevronRight, AlertCircle, Trash2, Edit2, Sun, Moon, RotateCcw, X, FileText, Image as ImageIcon, Video, Music } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Message, Attachment } from "../types";
import { aiService } from "../services/aiService";
import { dbService } from "../services/dbService";
import { uploadFile } from "../services/storageService";
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
  { id: "gemini-3-flash-preview", name: "Flash", description: "Speed + Multi-modal", isPro: false },
  { id: "gemini-3.1-pro-preview", name: "Pro", description: "Complex logic + Multi-modal", isPro: true },
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const COMMANDS = [
    { id: 'summarize', icon: <FileText className="w-4 h-4" />, label: 'Summarize', description: 'Condense documents into core insights' },
    { id: 'analyze', icon: <Layers className="w-4 h-4" />, label: 'Analyze', description: 'Deep structural and logical evaluation' },
    { id: 'compare', icon: <RotateCcw className="w-4 h-4" />, label: 'Compare', description: 'Cross-reference multiple data points' },
    { id: 'code', icon: <Cpu className="w-4 h-4" />, label: 'Generate Code', description: 'Executable technical output' },
    { id: 'creative', icon: <Sun className="w-4 h-4" />, label: 'Creative', description: 'Unrestricted conceptual generation' },
  ];

  const filteredCommands = COMMANDS.filter(c => 
    c.id.toLowerCase().includes(commandQuery.toLowerCase()) || 
    c.label.toLowerCase().includes(commandQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
        setInput("/");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (input.startsWith('/')) {
      const query = input.slice(1).split(' ')[0];
      setCommandQuery(query);
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  }, [input]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  const handleCommandSelect = (cmdId: string) => {
    const cmd = COMMANDS.find(c => c.id === cmdId);
    if (cmd) {
      setInput(`/${cmd.id} `);
      setShowCommands(false);
      textareaRef.current?.focus();
    }
  };

  const isPro = MODELS.find(m => m.id === selectedModel)?.isPro;

  const activeAssistantMessages = messages.filter(m => m.role === 'assistant' && !m.isDeleted && m.biasScores);
  
  const biasScores = activeAssistantMessages.length > 0 ? {
    toxicity: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.toxicity || 0), 0) / activeAssistantMessages.length,
    genderBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.genderBias || 0), 0) / activeAssistantMessages.length,
    racialBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.racialBias || 0), 0) / activeAssistantMessages.length,
    politicalBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.politicalBias || 0), 0) / activeAssistantMessages.length,
    ageism: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.ageism || 0), 0) / activeAssistantMessages.length,
    ableism: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.ableism || 0), 0) / activeAssistantMessages.length,
    socialBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.socialBias || 0), 0) / activeAssistantMessages.length,
    economicBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.economicBias || 0), 0) / activeAssistantMessages.length,
    logical: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.logical || 0), 0) / activeAssistantMessages.length,
    overallScore: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.overallScore || 0), 0) / activeAssistantMessages.length,
  } : null;

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant' && !m.isDeleted);
  
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

  // 1. Overall Analysis (10 Categories) - Sums to 100%
  const categoriesRaw = biasScores ? [
    biasScores.toxicity || 0,
    biasScores.genderBias || 0,
    biasScores.racialBias || 0,
    biasScores.politicalBias || 0,
    biasScores.ageism || 0,
    biasScores.ableism || 0,
    biasScores.socialBias || 0,
    biasScores.economicBias || 0,
    biasScores.logical || 0,
    biasScores.overallScore || 0 // Added Certainty/Confidence as a balanced vector
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
    certainty: roundedPercentages[9] / 100,
  } : null;

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
    { subject: 'CERTAINTY', A: normalizedScores.certainty * 100 },
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

  const handleRegenerate = async (targetMessageId?: string) => {
    if (!activeConversationId || isLoading || !user) return;

    // Use specific message or the last user message in the current list
    const historyToUse = messages.filter(m => !m.isDeleted);
    const lastUserMsgIndex = [...historyToUse].reverse().findIndex(m => m.role === 'user');
    
    if (lastUserMsgIndex === -1) return;
    
    const lastUserMsg = historyToUse[historyToUse.length - 1 - lastUserMsgIndex];
    const historyForAI = historyToUse
      .slice(0, historyToUse.length - 1 - lastUserMsgIndex)
      .map(m => ({ role: m.role, content: m.content, attachments: m.attachments }));

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiService.processInput(
        lastUserMsg.content, 
        historyForAI, 
        selectedModel, 
        ethicalMode, 
        lastUserMsg.attachments || []
      );

      await dbService.addMessage({
        conversationId: activeConversationId,
        role: "assistant",
        content: result.finalContent,
        originalContent: result.originalContent,
        biasScores: result.biasScores,
        isCorrected: result.isCorrected,
        parentId: lastUserMsg.id
      });

      // Update title with new context
      const updatedHistory = [...historyToUse, { role: 'assistant', content: result.finalContent } as Message];
      const newTitle = await aiService.generateTitleFromHistory(updatedHistory);
      await dbService.updateConversationTitle(activeConversationId, newTitle);
      
    } catch (err) {
      setError("Regeneration Failure: Failed to reconstruct rational response.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRewriteMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId || isLoading || !user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Update the user message content
      await dbService.updateMessageContent(messageId, newContent);
      
      // 2. Find the descendants to remove (the old AI response etc)
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1) {
        const descendantIds = messages.slice(msgIndex + 1)
          .map(m => m.id)
          .filter(Boolean) as string[];
        
        if (descendantIds.length > 0) {
          // Permanently remove following messages to rebuild context cleanly
          await dbService.hardDeleteMessage(descendantIds[0], descendantIds.slice(1));
        }
      }
      
      // 3. Generate new response based on updated content
      const historyToUse = messages.slice(0, msgIndex);
      const historyForAI = historyToUse
        .filter(m => !m.isDeleted)
        .map(m => ({ role: m.role, content: m.content, attachments: m.attachments }));
      
      const currentMessage = messages[msgIndex];
      const attachmentsToUse = currentMessage.attachments || [];

      const result = await aiService.processInput(
        newContent, 
        historyForAI, 
        selectedModel, 
        ethicalMode, 
        attachmentsToUse
      );

      // 4. Add new assistant message linked to the rewritten prompt
      await dbService.addMessage({
        conversationId: activeConversationId,
        role: "assistant",
        content: result.finalContent,
        originalContent: result.originalContent,
        biasScores: result.biasScores,
        isCorrected: result.isCorrected,
        parentId: messageId
      });

      // 5. Sync Rational Monitor (happens automatically via subscription)
      
      // 6. Update title
      const updatedHistory = [...historyToUse, { role: 'user', content: newContent }, { role: 'assistant', content: result.finalContent }] as Message[];
      const newTitle = await aiService.generateTitleFromHistory(updatedHistory);
      await dbService.updateConversationTitle(activeConversationId, newTitle);

    } catch (err) {
      setError("Rewrite Failure: Failed to resynchronize rational response.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteConfig) return;
    
    try {
      const targetId = deleteConfig.id;
      const targetType = deleteConfig.type;
      const isAssistant = messages.find(m => m.id === targetId)?.role === 'assistant';

      if (targetType === 'soft') {
        await dbService.deleteMessage(targetId);
      } else {
        // Hard Delete / History Rollback
        const msgIndex = messages.findIndex(m => m.id === targetId);
        if (msgIndex !== -1) {
          const descendantIds = messages.slice(msgIndex + 1)
            .map(m => m.id)
            .filter(Boolean) as string[];
          
          await dbService.hardDeleteMessage(targetId, descendantIds);
          
          // Rebuild state check: if we deleted an assistant message, we might want to regenerate it
          // Or if we deleted a user message, the history is truncated and we wait for new user input.
        }
      }
      setDeleteConfig(null);
    } catch (err) {
      setError("Protocol Failure: Failed to synchronize history vectors.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && pendingFiles.length === 0) || isLoading || !user) return;

    const userText = input;
    const currentPendingFiles = [...pendingFiles];
    
    setInput("");
    setPendingFiles([]);
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

      // Upload files first
      const uploadedAttachments: Attachment[] = [];
      for (const file of currentPendingFiles) {
        const attachment = await uploadFile(file, currentId, (progress) => {
          setUploadingFiles(prev => ({ ...prev, [file.name]: progress }));
        });
        uploadedAttachments.push(attachment);
        setUploadingFiles(prev => {
          const newState = { ...prev };
          delete newState[file.name];
          return newState;
        });
      }

      const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

      const userMsgId = await dbService.addMessage({
        conversationId: currentId,
        role: "user",
        content: userText,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        parentId: lastMsgId
      });

      const history = messages
        .filter(m => !m.isDeleted)
        .map(m => ({ role: m.role, content: m.content, attachments: m.attachments }));
        
      const result = await aiService.processInput(userText, history, selectedModel, ethicalMode, uploadedAttachments);

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
        { role: 'user', content: userText, conversationId: currentId, attachments: uploadedAttachments, createdAt: new Date() },
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
      setUploadingFiles({});
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-w-0 font-sans overflow-hidden">
      {/* Left Chat Window */}
      <div className="flex-1 flex flex-col bg-transparent min-w-0 relative h-full">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 md:px-10 glass-panel border-b-0 border-r-0 border-l-0 rounded-none sticky top-0 z-10 shrink-0 transition-all duration-500">
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
                        ? "bg-indigo-600 text-white shadow-md scale-[1.02]" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex-1 overflow-y-auto px-6 md:px-10 py-10 space-y-12 scroll-smooth custom-scrollbar relative",
            isDragging && "bg-indigo-500/5 backdrop-blur-sm"
          )}
        >
          <AnimatePresence>
            {isDragging && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
              >
                <div className="p-10 rounded-[3rem] bg-indigo-500/10 border-2 border-dashed border-indigo-500 flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-indigo-500 animate-bounce" />
                  <span className="text-xl font-bold text-indigo-600 uppercase tracking-widest">Release to Analyze</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                    <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-indigo-500/20"></div>
                    <Layers className="w-5 h-5 text-indigo-500" />
                    <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-indigo-500/20"></div>
                  </div>
                 <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[var(--text-main)] lowercase font-sans">
                   absolute<br/>
                   <span className="italic opacity-40 font-light pr-4">decisive</span>STANCE<span className="text-indigo-600">.</span>
                 </h1>
               </div>

               <div className="flex flex-col items-center space-y-10">
                 <div className="flex flex-col items-center gap-3">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                     <span className="text-xl font-bold tracking-tight text-[var(--text-main)] uppercase tracking-[0.2em]">Neural System</span>
                   </div>
                   <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.4em] opacity-80">I resolve. I distinguish. I decide.</p>
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
          
          <div className="max-w-5xl mx-auto w-full space-y-12 flex flex-col">
            {messages.map((m, i) => (
              <MessageItem 
                key={m.id || i} 
                message={m} 
                onDelete={(id, type) => setDeleteConfig({ id, type })}
                onRewrite={handleRewriteMessage}
              />
            ))}
          </div>

          {!isLoading && messages.length > 0 && messages.filter(m => !m.isDeleted).slice(-1)[0]?.role === 'user' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center -mt-6"
            >
              <button 
                onClick={() => handleRegenerate()}
                className="group flex items-center gap-3 px-8 py-3.5 rounded-full bg-white dark:bg-white/5 border border-indigo-500/20 text-indigo-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-xl hover:shadow-indigo-500/20 active:scale-95"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
                Regenerate Protocol Analysis
              </button>
            </motion.div>
          )}

          {isLoading && (
            <div className="flex gap-4 md:gap-8 animate-in fade-in slide-in-from-left-2 duration-500">
              <div className="w-10 h-10 bg-black/5 dark:bg-white/5 text-zinc-500 rounded-2xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold animate-pulse uppercase tracking-tighter">AI</div>
              <div className="flex-1 bg-[var(--bubble-ai)] px-8 py-7 rounded-[2.5rem] border border-[var(--border-color)] flex items-center gap-4 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Processing Rational Vectors...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Composer (Command Center) */}
        <footer className="p-6 md:p-12 bg-transparent transition-all duration-700">
          <div className="max-w-4xl mx-auto relative">
            
            {/* Command Palette */}
            <AnimatePresence>
              {showCommands && filteredCommands.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full mb-6 w-full max-w-md left-0 rounded-[2rem] bg-[#0B0F1A]/95 border border-indigo-500/20 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 p-2"
                >
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Logical Operatives</span>
                    <span className="text-[9px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded-md">↑↓ to navigate</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredCommands.map((cmd, idx) => (
                      <button
                        key={cmd.id}
                        onClick={() => handleCommandSelect(cmd.id)}
                        onMouseEnter={() => setSelectedCommandIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-4 transition-all text-left",
                          selectedCommandIndex === idx ? "bg-indigo-600/10 text-white" : "text-zinc-500 hover:bg-white/5"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          selectedCommandIndex === idx ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5"
                        )}>
                          {cmd.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold uppercase tracking-wider">{cmd.label}</span>
                          <span className="text-[10px] opacity-60 font-medium">{cmd.description}</span>
                        </div>
                        {selectedCommandIndex === idx && (
                          <div className="ml-auto flex items-center gap-2">
                             <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md uppercase tracking-widest italic">Ready</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group/composer">
              {/* Glow Effect */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 rounded-[2rem] opacity-0 group-focus-within/composer:opacity-100 transition-opacity duration-1000 blur-sm pointer-events-none" />
              
              <div className="relative bg-[#0B0F1A]/80 dark:bg-[#0B0F1A]/90 border border-white/5 group-focus-within/composer:border-indigo-500/30 backdrop-blur-3xl rounded-[2rem] p-4 transition-all duration-700 shadow-2xl overflow-hidden">
                
                {/* File Chips inside Input */}
                <AnimatePresence>
                  {pendingFiles.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 px-3 pb-4 pt-1 mb-2 border-b border-white/5"
                    >
                      {pendingFiles.map((file, idx) => (
                        <motion.div 
                          key={`${file.name}-${idx}`}
                          initial={{ scale: 0.8, x: -10 }}
                          animate={{ scale: 1, x: 0 }}
                          className="flex items-center gap-3 pl-3 pr-2 py-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 rounded-xl group/chip transition-all cursor-default"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            {file.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-indigo-500" /> : 
                             file.type.startsWith('video/') ? <Video className="w-3.5 h-3.5 text-indigo-500" /> :
                             <FileText className="w-3.5 h-3.5 text-indigo-500" />}
                          </div>
                          <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[100px]">{file.name}</span>
                          <button 
                            onClick={() => removePendingFile(idx)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 transition-all opacity-40 group-hover/chip:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-4 overflow-hidden min-h-[56px]">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        if (showCommands && filteredCommands[selectedCommandIndex]) {
                          e.preventDefault();
                          handleCommandSelect(filteredCommands[selectedCommandIndex].id);
                        } else {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      } else if (showCommands) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                        }
                      }
                    }}
                    placeholder={user ? "Execute logical query..." : "Authentication Required"}
                    rows={1}
                    disabled={!user || isLoading}
                    className="flex-1 bg-transparent border-none p-3 text-[15px] font-medium text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none custom-scrollbar min-h-[48px] max-h-[300px] transition-all"
                  />

                  {/* Multi-modal Action Row */}
                  <div className="flex items-center gap-1.5 pb-2 pr-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      multiple 
                      className="hidden" 
                    />
                    
                    <div className="flex items-center gap-1 pr-4 mr-2 border-r border-white/5">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 rounded-2xl text-zinc-500 hover:text-indigo-400 hover:bg-white/5 transition-all group/icon"
                        title="Attach Media"
                      >
                        <ImageIcon className="w-4 h-4 transition-transform group-hover/icon:scale-110" />
                      </button>
                      <button 
                        type="button" 
                        className="p-3 rounded-2xl text-zinc-500 hover:text-indigo-400 hover:bg-white/5 transition-all group/icon"
                        title="Voice Input"
                      >
                        <Mic className="w-4 h-4 transition-transform group-hover/icon:scale-110" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 rounded-2xl text-zinc-500 hover:text-indigo-400 hover:bg-white/5 transition-all group/icon"
                        title="Attach Metadata"
                      >
                        <Paperclip className="w-4 h-4 transition-transform group-hover/icon:scale-110" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={(!input.trim() && pendingFiles.length === 0) || isLoading || !user}
                      onClick={handleSubmit}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 group/send relative",
                        (input.trim() || pendingFiles.length > 0) && !isLoading 
                          ? "bg-indigo-600 text-white shadow-indigo-600/20" 
                          : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 transition-transform group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5" />
                      )}
                      
                      {/* Interaction Hint */}
                      {!isLoading && input.trim() && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 border border-white/10 rounded-md text-[8px] font-bold text-zinc-400 uppercase tracking-widest opacity-0 group-hover/send:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          ENTER TO EXECUTE
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Context Awareness Layer */}
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.15em]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Logical Integrity Maintained
              </div>
              <div className="h-3 w-px bg-white/5" />
              <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.15em] hover:text-indigo-500 transition-colors cursor-help group/hint">
                <ShieldAlert className="w-3 h-3 opacity-40 group-hover/hint:opacity-100" />
                Absolute Decisiveness Protocol Active
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfig(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-lg bg-[var(--glass-bg)] border rounded-[3rem] p-10 md:p-14 shadow-2xl backdrop-blur-3xl overflow-hidden",
                deleteConfig.type === 'hard' ? "border-rose-500/30" : "border-[var(--glass-border)]"
              )}
            >
              <div className={cn(
                "absolute top-0 inset-x-0 h-1.5 opacity-50",
                deleteConfig.type === 'hard' ? "bg-gradient-to-r from-rose-500 to-transparent" : "bg-gradient-to-r from-zinc-500 to-transparent"
              )} />
              
              <div className="flex flex-col items-center text-center space-y-8">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center",
                  deleteConfig.type === 'hard' ? "bg-rose-500/10" : "bg-zinc-500/10"
                )}>
                  {deleteConfig.type === 'hard' ? (
                    <ShieldAlert className="w-10 h-10 text-rose-500" />
                  ) : (
                    <Trash2 className="w-8 h-8 text-zinc-500" />
                  )}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold uppercase tracking-widest text-[var(--text-main)] italic">
                    {deleteConfig.type === 'hard' ? 'PROTOCOL WIPE' : 'SOFT REDACTION'}
                    <span className={deleteConfig.type === 'hard' ? "text-rose-500" : "text-zinc-500"}>!</span>
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-loose max-w-xs mx-auto">
                    {deleteConfig.type === 'hard' 
                      ? "Executing this command will PERMANENTLY ERADICATE this prompt and all subsequent rational vectors from the core storage. This action is irreversible."
                      : "This will mask the message content locally while maintaining the structural integrity of the rational sequence."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button 
                    onClick={handleDeleteMessage}
                    className={cn(
                      "flex-1 py-5 rounded-[1.5rem] text-white text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95",
                      deleteConfig.type === 'hard' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" : "bg-zinc-800 hover:bg-zinc-900 shadow-zinc-800/20"
                    )}
                  >
                    Confirm {deleteConfig.type === 'hard' ? 'Purge' : 'Redaction'}
                  </button>
                  <button 
                    onClick={() => setDeleteConfig(null)}
                    className="flex-1 py-5 rounded-[1.5rem] bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] text-[var(--text-main)] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95"
                  >
                    Abort
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Right Sidebar: Bias Vector Analysis */}
      <aside className="w-80 glass-panel border-l-0 rounded-none p-10 hidden xl:flex flex-col transition-all duration-500">
        <div className="mb-12 overflow-y-auto custom-scrollbar flex-1 pr-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]"></div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--text-main)] opacity-60">Rational Monitor</h3>
          </div>

          {/* Compact Ethical Mode Selector Tabs */}
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 opacity-50 ml-1">Ethical Framework</span>
              <div className="grid grid-cols-5 gap-1 p-1 bg-white dark:bg-white/5 rounded-xl border border-[var(--border-color)] dark:border-white/5">
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
                        ? "bg-indigo-50 dark:bg-white/10 text-[var(--accent-primary)] shadow-sm" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
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
          
          {biasScores ? (
            <div className="space-y-10">
              <div className="h-64 min-h-[256px] w-full bg-black/5 dark:bg-white/5 rounded-3xl p-4 flex items-center justify-center overflow-hidden">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                  <RadarChart cx="50%" cy="50%" outerRadius="55%" data={biasData}>
                    <PolarGrid stroke="var(--border-color)" opacity={0.3} />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 7, fontWeight: '800', letterSpacing: '0.1em' }} 
                    />
                    <Radar
                      name="Bias Vector"
                      dataKey="A"
                      stroke="var(--accent-primary)"
                      fill="var(--accent-primary)"
                      fillOpacity={0.15}
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
                  { label: "Certainty", score: normalizedScores?.certainty || 0, color: "bg-brand-orange shadow-[0_0_10px_rgba(255,159,67,0.4)]" }
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-[var(--border-color)] dark:border-transparent hover:shadow-md transition-all">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] uppercase text-[var(--text-secondary)] font-bold tracking-widest">{item.label}</span>
                      <span className="text-xs font-bold text-[var(--text-main)] tracking-tight">{(item.score * 100).toFixed(0)}%</span>
                      <div className="h-1 bg-[var(--bg-app)] dark:bg-white/5 rounded-full overflow-hidden mt-1">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", item.color)} 
                          style={{ width: `${item.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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

    </div>
  );
}
