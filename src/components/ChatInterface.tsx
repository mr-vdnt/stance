import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ShieldAlert, Cpu, LogIn, LogOut, User as UserIcon, Layers, Upload, Camera, Mic, Paperclip, ChevronRight, AlertCircle, Trash2, Edit2, Sun, Moon, RotateCcw, X, FileText, Image as ImageIcon, Video, Music, Newspaper, Activity, Zap, Sparkles, Plus, LayoutDashboard, Settings, Eye } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Message, Attachment } from "../types";
import { aiService } from "../services/aiService";
import { dbService } from "../services/dbService";
import { UserProfileModal } from "./UserProfileModal";
import { CameraCapture } from "./CameraCapture";
import { uploadFile } from "../services/storageService";
import { MessageItem } from "./MessageItem";
import { NewsFeed } from "./NewsFeed";
import { Dashboard } from "./Dashboard";
import { AIOrb } from "./AIOrb";
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTitle, setCurrentTitle] = useState("New Conversation");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [ethicalMode, setEthicalMode] = useState<typeof ETHICAL_MODES[number]['id']>('utilitarian');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: 'soft' | 'hard' } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showNewsFeed, setShowNewsFeed] = useState(false);
  const [showRationalMonitor, setShowRationalMonitor] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [viewingMessageId, setViewingMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [aiGenConfig, setAiGenConfig] = useState<{ isOpen: boolean, type: 'image' | 'video' }>({ isOpen: false, type: 'image' });
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isAttachmentsMenuOpen, setIsAttachmentsMenuOpen] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const recognitionRef = useRef<any>(null);
  
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
      setSelectedCommandIndex(0);
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

  useEffect(() => {
    if (showCommands) {
      setSelectedCommandIndex(0);
    }
  }, [showCommands]);

  const handleCommandSelect = (cmdId: string) => {
    const cmd = COMMANDS.find(c => c.id === cmdId);
    if (cmd) {
      setInput(`/${cmd.id} `);
      setShowCommands(false);
      textareaRef.current?.focus();
    }
  };

  const isPro = MODELS.find(m => m.id === selectedModel)?.isPro;

  const activeAssistantMessages = messages.filter(m => m.role === 'assistant' && !m.isDeleted && (m.biasScores || m.optimizationReport));
  
  const biasScores = activeAssistantMessages.length > 0 ? {
    toxicity: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.toxicity ?? m.optimizationReport?.indicator_scores_after?.toxicity ?? 0), 0) / activeAssistantMessages.length,
    genderBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.genderBias ?? m.optimizationReport?.indicator_scores_after?.genderBias ?? 0), 0) / activeAssistantMessages.length,
    racialBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.racialBias ?? m.optimizationReport?.indicator_scores_after?.racialBias ?? 0), 0) / activeAssistantMessages.length,
    politicalBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.politicalBias ?? m.optimizationReport?.indicator_scores_after?.politicalBias ?? 0), 0) / activeAssistantMessages.length,
    ageism: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.ageism ?? m.optimizationReport?.indicator_scores_after?.ageism ?? 0), 0) / activeAssistantMessages.length,
    ableism: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.ableism ?? m.optimizationReport?.indicator_scores_after?.ableism ?? 0), 0) / activeAssistantMessages.length,
    socialBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.socialBias ?? m.optimizationReport?.indicator_scores_after?.socialBias ?? 0), 0) / activeAssistantMessages.length,
    economicBias: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.economicBias ?? m.optimizationReport?.indicator_scores_after?.economicBias ?? 0), 0) / activeAssistantMessages.length,
    logical: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.logical ?? m.optimizationReport?.indicator_scores_after?.logical ?? 0), 0) / activeAssistantMessages.length,
    overallScore: activeAssistantMessages.reduce((sum, m) => sum + (m.biasScores?.overallScore ?? m.optimizationReport?.indicator_scores_after?.certainty ?? 0), 0) / activeAssistantMessages.length,
  } : null;

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant' && !m.isDeleted);
  
  const targetMessage = viewingMessageId ? messages.find(m => m.id === viewingMessageId) : null;
  const targetBiasScores = targetMessage ? (targetMessage.biasScores || targetMessage.optimizationReport?.indicator_scores_after) : biasScores;
  const targetOptimizationReport = targetMessage?.optimizationReport;

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
  const categoriesRaw = targetBiasScores ? [
    (targetBiasScores as any).toxicity || 0,
    (targetBiasScores as any).genderBias || 0,
    (targetBiasScores as any).racialBias || 0,
    (targetBiasScores as any).politicalBias || 0,
    (targetBiasScores as any).ageism || 0,
    (targetBiasScores as any).ableism || 0,
    (targetBiasScores as any).socialBias || 0,
    (targetBiasScores as any).economicBias || 0,
    (targetBiasScores as any).logical || 0,
    (targetBiasScores as any).overallScore || (targetBiasScores as any).certainty || 0
  ] : [];
  
  const roundedPercentages = getRoundedPercentages(categoriesRaw);
  const normalizedScores = targetBiasScores ? {
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
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError("AUTHENTICATION BLOCKED: Please enable popups for this site or open the app in a NEW TAB to continue.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Silently handle cancelled request
        console.log("Auth popup request cancelled.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Silently handle user closing popup
      } else {
        setError(err.message || "Failed to establish secure link.");
      }
      console.error("Login failed:", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleRegenerate = async (targetMessageId?: string) => {
    if (!activeConversationId || isLoading || !user || messages.length === 0) return;

    // Find the target assistant message and its associated user message
    const historyToUse = messages.filter(m => !m.isDeleted);
    
    let actualAssistantIdx = -1;
    if (targetMessageId) {
      actualAssistantIdx = historyToUse.findIndex(m => m.id === targetMessageId);
    } else {
      const lastAssistantIdx = [...historyToUse].reverse().findIndex(m => m.role === 'assistant');
      if (lastAssistantIdx !== -1) {
        actualAssistantIdx = historyToUse.length - 1 - lastAssistantIdx;
      }
    }
    
    if (actualAssistantIdx === -1) return;
    const assistantMsg = historyToUse[actualAssistantIdx];
    
    // Find the user message that preceded this assistant message
    const userMsgIdx = [...historyToUse.slice(0, actualAssistantIdx)].reverse().findIndex(m => m.role === 'user');
    if (userMsgIdx === -1) return;
    
    const actualUserIdx = actualAssistantIdx - 1 - userMsgIdx;
    const lastUserMsg = historyToUse[actualUserIdx];
    
    // History should include everything up to (but not including) this user message
    const historyForAI = historyToUse
      .slice(0, actualUserIdx)
      .map(m => ({ role: m.role, content: m.content, attachments: m.attachments }));

    setIsLoading(true);
    setError(null);

    try {
      // If we're regenerating an old message, we should hard-delete the following branch
      if (actualAssistantIdx < historyToUse.length - 1) {
        const descendantIds = historyToUse.slice(actualAssistantIdx + 1)
          .map(m => m.id)
          .filter(Boolean) as string[];
        if (descendantIds.length > 0) {
          await dbService.hardDeleteMessage(assistantMsg.id, descendantIds);
        } else {
          await dbService.deleteMessage(assistantMsg.id);
        }
      } else {
        // Just soft-delete the single last assistant message
        await dbService.deleteMessage(assistantMsg.id);
      }

      setStreamingText("");
      let finalFullText = "";

      const stream = aiService.processStreamingInput(
        lastUserMsg.content, 
        historyForAI, 
        selectedModel, 
        ethicalMode, 
        lastUserMsg.attachments || []
      );

      for await (const part of stream) {
        if (!part.isFull && part.chunk) {
          setStreamingText(prev => (prev || "") + part.chunk);
        } else if (part.isFull) {
          finalFullText = part.fullResponse || "";
        }
      }

      setStreamingText(null);

      const assistantMsgId = await dbService.addMessage({
        conversationId: activeConversationId,
        role: "assistant",
        content: finalFullText,
        originalContent: finalFullText,
        isCorrected: false,
        parentId: lastUserMsg.id
      });

      // Background rationality & fairness optimization
      aiService.optimizeResponse(lastUserMsg.content, finalFullText).then(report => {
        if (assistantMsgId && report) dbService.updateMessageOptimizationReport(assistantMsgId, report);
      });

      // Update title with new context
      const updatedHistory = [...historyToUse.slice(0, actualAssistantIdx), { role: 'assistant', content: finalFullText } as Message];
      const newTitle = await aiService.generateTitleFromHistory(updatedHistory);
      await dbService.updateConversationTitle(activeConversationId, newTitle);
      
    } catch (err) {
      console.error("Regeneration Error:", err);
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

      setStreamingText("");
      let finalFullText = "";

      const stream = aiService.processStreamingInput(
        newContent, 
        historyForAI, 
        selectedModel, 
        ethicalMode, 
        attachmentsToUse
      );

      for await (const part of stream) {
        if (!part.isFull && part.chunk) {
          setStreamingText(prev => (prev || "") + part.chunk);
        } else if (part.isFull) {
          finalFullText = part.fullResponse || "";
        }
      }

      setStreamingText(null);

      const assistantMsgId = await dbService.addMessage({
        conversationId: activeConversationId,
        role: "assistant",
        content: finalFullText,
        originalContent: finalFullText,
        isCorrected: false,
        parentId: messageId
      });

      // Background rationality & fairness optimization
      aiService.optimizeResponse(newContent, finalFullText).then(report => {
        if (assistantMsgId && report) dbService.updateMessageOptimizationReport(assistantMsgId, report);
      });

      // 5. Sync Rational Monitor (happens automatically via subscription)
      
      // 6. Update title
      const updatedHistory = [...historyToUse, { role: 'user', content: newContent }, { role: 'assistant', content: finalFullText }] as Message[];
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

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim() || isGeneratingAI || !user) return;
    
    setIsGeneratingAI(true);
    setError(null);
    try {
      let currentId = activeConversationId;
      if (!currentId) {
        currentId = await dbService.createConversation(`Generation: ${aiPrompt.substring(0, 20)}...`, selectedModel, ethicalMode);
        setActiveConversationId(currentId);
        onConversationCreated?.();
      }

      const isImage = aiGenConfig.type === 'image';
      let mediaUrl = "";
      let mimeType = "image/png";
      let fileName = "generated-image.png";

      if (isImage) {
        mediaUrl = await aiService.generateImage(aiPrompt);
      } else {
        // AI Video simulation/placeholder since native SDK doesn't support it yet
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate work
        mediaUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
        mimeType = "video/mp4";
        fileName = "generated-clip.mp4";
      }
      
      const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
      
      // User message
      const userMsgId = await dbService.addMessage({
        conversationId: currentId,
        role: "user",
        content: `Generate ${aiGenConfig.type}: ${aiPrompt}`,
        parentId: lastMsgId
      });

      // Assistant message with media
      await dbService.addMessage({
        conversationId: currentId,
        role: "assistant",
        content: `I've generated the ${aiGenConfig.type} based on your neural prompt.`,
        attachments: [{
          id: Math.random().toString(36).substring(7),
          name: fileName,
          type: mimeType,
          url: mediaUrl,
          size: 0
        }],
        parentId: userMsgId
      });

      setAiGenConfig({ ...aiGenConfig, isOpen: false });
      setAiPrompt("");
    } catch (err: any) {
      console.error("AI generation failed:", err);
      setError(`Failed to generate ${aiGenConfig.type}. Please verify your prompt and try again.`);
    } finally {
      setIsGeneratingAI(false);
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

  const renderRationalMonitorContent = () => (
    <div className="mb-12 overflow-y-auto custom-scrollbar flex-1 pr-1 md:pr-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]"></div>
          <h3 className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[var(--text-main)] opacity-80">
            {viewingMessageId ? "Message Analysis" : "Session Monitor"}
          </h3>
        </div>
        {viewingMessageId && (
          <button 
            onClick={() => setViewingMessageId(null)}
            className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Compact Ethical Mode Selector Tabs */}
      {!viewingMessageId && (
        <div className="mb-8">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 opacity-80 ml-1">Ethical Framework</span>
            <div className="grid grid-cols-5 gap-1 md:gap-1.5 p-1 md:p-1.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-2xl border border-black/10 dark:border-white/10 backdrop-blur-md shadow-inner">
              {ETHICAL_MODES.map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => {
                    setEthicalMode(mode.id);
                    if (activeConversationId) dbService.updateConversationMetadata(activeConversationId, { ethicalMode: mode.id });
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 md:py-2.5 rounded-xl transition-all duration-300 relative group",
                    ethicalMode === mode.id 
                      ? "bg-white dark:bg-white/10 text-indigo-500 dark:text-indigo-400 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-none ring-1 ring-black/5 dark:ring-white/10" 
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                  title={mode.name}
                >
                  <span className={cn(
                    "text-base md:text-lg mb-0.5 transition-transform duration-300 group-hover:scale-110",
                    ethicalMode === mode.id ? "scale-110" : ""
                  )}>{mode.icon}</span>
                  {ethicalMode === mode.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute -bottom-1 inset-x-3 h-0.5 bg-indigo-500 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {targetBiasScores ? (
        <div className="space-y-8 md:space-y-10">
          <div className="h-48 md:h-64 min-h-[192px] md:min-h-[256px] w-full bg-black/5 dark:bg-white/5 rounded-3xl p-2 md:p-4 flex items-center justify-center overflow-hidden">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
              <RadarChart cx="50%" cy="50%" outerRadius="60%" data={biasData}>
                <PolarGrid stroke="var(--text-secondary)" strokeOpacity={0.5} />
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

          <div className="grid grid-cols-2 gap-2 md:gap-4">
            {[
              { label: "Toxic", score: normalizedScores?.toxicity || 0, color: "bg-red-500", cardBg: "bg-red-500/10", cardBorder: "border-red-500/20", textColor: "text-red-700" },
              { label: "Gender", score: normalizedScores?.genderBias || 0, color: "bg-pink-500", cardBg: "bg-pink-500/10", cardBorder: "border-pink-500/20", textColor: "text-pink-700" },
              { label: "Race", score: normalizedScores?.racialBias || 0, color: "bg-emerald-500", cardBg: "bg-emerald-500/10", cardBorder: "border-emerald-500/20", textColor: "text-emerald-700" },
              { label: "Political", score: normalizedScores?.politicalBias || 0, color: "bg-blue-600", cardBg: "bg-blue-600/10", cardBorder: "border-blue-600/20", textColor: "text-blue-700" },
              { label: "Age", score: normalizedScores?.ageism || 0, color: "bg-orange-500", cardBg: "bg-orange-500/10", cardBorder: "border-orange-500/20", textColor: "text-orange-700" },
              { label: "Disability", score: normalizedScores?.ableism || 0, color: "bg-violet-600", cardBg: "bg-violet-600/10", cardBorder: "border-violet-600/20", textColor: "text-violet-700" },
              { label: "Social", score: normalizedScores?.socialBias || 0, color: "bg-sky-500", cardBg: "bg-sky-500/10", cardBorder: "border-sky-500/20", textColor: "text-sky-700" },
              { label: "Economic", score: normalizedScores?.economicBias || 0, color: "bg-purple-600", cardBg: "bg-purple-600/10", cardBorder: "border-purple-600/20", textColor: "text-purple-700" },
              { label: "Logical", score: normalizedScores?.logical || 0, color: "bg-indigo-600", cardBg: "bg-indigo-600/10", cardBorder: "border-indigo-600/20", textColor: "text-indigo-700" },
              { label: "Certainty", score: normalizedScores?.certainty || 0, color: "bg-emerald-500", cardBg: "bg-emerald-500/10", cardBorder: "border-emerald-500/20", textColor: "text-emerald-700" }
            ].map((item) => (
              <div key={item.label} className={cn(
                "p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md group/card",
                "bg-black/[0.02] border-black/5 dark:bg-white/[0.04] dark:border-white/10 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
                !isDarkMode && item.cardBg,
                !isDarkMode && item.cardBorder,
                "hover:brightness-95 dark:hover:brightness-110"
              )}>
                <div className="flex flex-col gap-2">
                  <span className={cn(
                    "text-[10px] uppercase font-black tracking-[0.1em]",
                    !isDarkMode ? item.textColor : "text-zinc-400"
                  )}>{item.label}</span>
                  <span className={cn(
                    "text-sm font-black tracking-tight",
                    !isDarkMode ? "text-zinc-900" : "text-white/85"
                  )}>
                    {(item.score * 100).toFixed(0)}%
                  </span>
                  <div className="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn("h-full rounded-full", item.color)} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {targetOptimizationReport && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pt-8 border-t border-black/5 dark:border-white/5"
            >
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 mb-4 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Rationale
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 italic leading-relaxed bg-black/[0.02] dark:bg-white/[0.02] p-4 rounded-2xl border border-black/5 dark:border-white/5">
                  "{targetOptimizationReport.rationale_summary}"
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 mb-4 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Transformations
                </h4>
                <div className="space-y-3">
                  {targetOptimizationReport.changes_made.map((change, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500/40 group-hover:bg-indigo-500 dark:bg-indigo-400/40 dark:group-hover:bg-indigo-400 transition-colors" />
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-medium leading-tight">
                        {change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-black/5 dark:border-white/5 rounded-3xl p-8 text-center space-y-4">
          <Cpu className="w-8 h-8 text-zinc-500 opacity-20" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold leading-relaxed opacity-40 px-6">
            Waiting for neural cycle ignition.
          </span>
        </div>
      )}
    </div>
  );

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Use a small timeout to ensure state update before submit if we were to trigger it automatically.
    // However, the user said "encouraging further user interaction", so setting the input might be enough, 
    // but usually "displays suggestions" implies clicking one sends it.
    // Let's make it send immediately for better UX.
  };

  useEffect(() => {
    if (input && input.startsWith('Suggestion:')) {
      const realInput = input.replace('Suggestion:', '');
      setInput(realInput);
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [input]);

  const onSuggestionSelect = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => {
      handleSubmit(null as any, suggestion);
    }, 10);
  };

  const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const finalInput = (overrideInput || input).trim();
    if ((!finalInput && pendingFiles.length === 0) || isLoading || !user) return;

    const userText = finalInput;
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

      const historyForAI = messages
        .filter(m => !m.isDeleted)
        .map(m => ({ role: m.role, content: m.content, attachments: m.attachments }));
        
      setStreamingText("");
      let finalFullText = "";
      
      const stream = aiService.processStreamingInput(userText, historyForAI, selectedModel, ethicalMode, uploadedAttachments);
      
      for await (const part of stream) {
        if (!part.isFull && part.chunk) {
          setStreamingText(prev => (prev || "") + part.chunk);
        } else if (part.isFull) {
          finalFullText = part.fullResponse || "";
        }
      }

      setStreamingText(null);

      const assistantMsgId = await dbService.addMessage({
        conversationId: currentId,
        role: "assistant",
        content: finalFullText,
        originalContent: finalFullText,
        isCorrected: false,
        parentId: userMsgId || lastMsgId
      });

      // Trigger optimization in background to keep UI responsive
      aiService.optimizeResponse(userText, finalFullText).then(report => {
        if (assistantMsgId && report) dbService.updateMessageOptimizationReport(assistantMsgId, report);
      });

      // Update title with full history
      const updatedHistory = [
        ...messages,
        { role: 'user', content: userText, attachments: uploadedAttachments } as Message,
        { role: 'assistant', content: finalFullText } as Message
      ];
      
      const newTitle = await aiService.generateTitleFromHistory(updatedHistory);
      await dbService.updateConversationTitle(currentId, newTitle);

      // Trigger follow-up suggestions in background
      aiService.generateFollowUpSuggestions(updatedHistory).then(suggestions => {
        if (assistantMsgId && suggestions.length > 0) {
          dbService.updateMessageSuggestions(assistantMsgId, suggestions);
        }
      });

      // Trigger bias-aware search suggestions in background
      aiService.generateBiasAwareSearchSuggestions(updatedHistory).then(searchSuggestions => {
        if (assistantMsgId && searchSuggestions.length > 0) {
          dbService.updateMessageSearchSuggestions(assistantMsgId, searchSuggestions);
        }
      });

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
    <div className="flex-1 flex flex-col md:flex-row h-full min-w-0 font-sans overflow-hidden relative">
      {/* Left Chat Window */}
      <div className="flex-1 flex flex-col bg-transparent min-w-0 relative h-full">
        {/* Header */}
        <header className="h-14 md:h-20 flex items-center justify-between px-3 md:px-10 glass-panel border-b-0 border-r-0 border-l-0 rounded-none sticky top-0 z-30 shrink-0 transition-all duration-500 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
          <div className="flex gap-2 md:gap-6 items-center truncate min-w-0">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={onToggleMenu}
              className="lg:hidden p-2 rounded-xl bg-black/5 dark:bg-white/5 text-[var(--text-main)] active:scale-90 transition-all shrink-0"
              aria-label="Toggle Menu"
            >
              <Layers className="w-5 h-5 rotate-90" />
            </button>

            <div className="flex flex-col gap-0.5 md:gap-1 items-start truncate min-w-0 group cursor-pointer" 
                 onClick={() => activeConversationId && onRename?.(activeConversationId, currentTitle)}>
              <div className="flex items-center gap-1.5 truncate max-w-full">
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[var(--text-main)] truncate max-w-full opacity-90 group-hover:opacity-100 transition-opacity">
                  {currentTitle}
                </span>
                <Edit2 className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
              </div>
              <div className="flex gap-1 md:gap-1.5 p-0.5 md:p-1 bg-black/5 dark:bg-white/10 rounded-lg md:rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-x-auto no-scrollbar max-w-[120px] sm:max-w-[180px] md:max-w-xs">
                {MODELS.map(m => (
                  <button 
                    key={m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModel(m.id);
                      if (activeConversationId) dbService.updateConversationMetadata(activeConversationId, { preferredModel: m.id });
                    }}
                    className={cn(
                      "px-2 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-bold uppercase transition-all tracking-wider whitespace-nowrap",
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
          <div className="flex items-center gap-1.5 md:gap-6">
            <button 
              onClick={() => {
                setShowDashboard(!showDashboard);
                setShowNewsFeed(false);
                setShowRationalMonitor(false);
              }}
              className={cn(
                "p-2 md:p-2.5 rounded-xl md:rounded-2xl transition-all relative group",
                showDashboard ? "bg-indigo-600 text-white shadow-lg" : "bg-black/5 dark:bg-white/5 text-[var(--text-main)] hover:bg-black/10"
              )}
              title="Global Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button 
              onClick={() => setShowNewsFeed(!showNewsFeed)}
              className={cn(
                "p-2 md:p-2.5 rounded-xl md:rounded-2xl transition-all relative group",
                showNewsFeed ? "bg-indigo-500 text-white shadow-lg" : "bg-black/5 dark:bg-white/5 text-[var(--text-main)] hover:bg-black/10"
              )}
              title="Global News Feed"
            >
              <Newspaper className="w-4 h-4 md:w-5 md:h-5" />
              {showNewsFeed && (
                <div className="absolute -top-1 -right-1 w-2 md:w-2.5 h-2 md:h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
              )}
            </button>

            <button 
              onClick={() => setShowRationalMonitor(!showRationalMonitor)}
              className={cn(
                "p-2 md:p-2.5 rounded-xl md:rounded-2xl transition-all relative group lg:hidden",
                showRationalMonitor ? "bg-indigo-500 text-white shadow-lg" : "bg-black/5 dark:bg-white/5 text-[var(--text-main)] hover:bg-black/10"
              )}
              title="Rational Integrity Monitor"
            >
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              {biasScores && (
                <div className="absolute -top-1 -right-1 w-2 md:w-2.5 h-2 md:h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[11px] text-[var(--text-main)] uppercase font-bold tracking-widest">{user.displayName || 'Agent'}</span>
                  <div className="flex gap-3">
                    <button onClick={() => setShowProfileModal(true)} className="text-[9px] text-zinc-600 hover:text-indigo-500 transition-colors uppercase font-bold tracking-widest cursor-pointer opacity-60">Profile</button>
                    <button onClick={handleLogout} className="text-[9px] text-zinc-600 hover:text-red-500 transition-colors uppercase font-bold tracking-widest cursor-pointer opacity-60">Log Out</button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="p-0.5 rounded-2xl bg-gradient-to-tr from-brand-orange to-brand-gold shadow-lg hover:scale-105 transition-transform"
                >
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-[14px] overflow-hidden bg-black/20">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/20 text-zinc-400">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="flex items-center gap-2.5 px-4 md:px-6 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-70"
                style={{ background: 'var(--gradient-cta)' }}
              >
                {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span className="hidden sm:inline">{isAuthenticating ? "Authenticating..." : "Auth Init"}</span>
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
            "flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-16 space-y-8 md:space-y-24 scroll-smooth custom-scrollbar relative",
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
                  {!user && (
                    <button 
                      onClick={handleLogin}
                      disabled={isAuthenticating}
                      className="px-12 py-4 text-white text-[10px] uppercase font-bold tracking-[0.3em] rounded-full transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed mx-auto"
                      style={{ background: 'var(--gradient-cta)' }}
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Establishing...
                        </>
                      ) : "Establish Link"}
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
                onRegenerate={m.role === 'assistant' ? () => handleRegenerate(m.id) : undefined}
                onInspect={(id) => {
                  setViewingMessageId(id);
                  setShowRationalMonitor(true);
                }}
                onSuggestionClick={onSuggestionSelect}
              />
            ))}

            {streamingText !== null && (
              <MessageItem 
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingText,
                  createdAt: new Date(),
                  conversationId: activeConversationId || "new"
                }}
              />
            )}
          </div>

          {!isLoading && messages.length > 0 && messages.filter(m => !m.isDeleted).slice(-1)[0]?.role === 'assistant' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center -mt-6"
            >
              <button 
                onClick={() => handleRegenerate()}
                className="group flex items-center gap-3 px-8 py-3.5 rounded-full bg-white dark:bg-zinc-900 border border-indigo-500/30 dark:border-indigo-400/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white hover:border-indigo-600 shadow-xl hover:shadow-indigo-500/20 active:scale-95"
              >
                <div className="relative">
                  <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-700 ease-in-out" />
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                Regenerate Protocol Analysis
              </button>
            </motion.div>
          )}

          {isLoading && streamingText === null && (
            <div className="flex gap-4 md:gap-8 animate-in fade-in slide-in-from-left-2 duration-500">
              <AIOrb isThinking={true} className="flex-shrink-0" />
              <div className="flex-1 bg-[var(--bubble-ai)] px-8 py-7 rounded-[2.5rem] border border-[var(--border-color)] flex items-center gap-4 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Processing Rational Vectors...</span>
              </div>
            </div>
          )}
        </div>

        <footer className="p-3 md:p-8 pt-0 md:pt-2 sticky bottom-0 z-30">
          <div className="max-w-4xl mx-auto relative px-1 md:px-0">
            
            {/* Command Palette */}
            <AnimatePresence>
              {showCommands && filteredCommands.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full mb-4 md:mb-6 w-full max-w-md left-0 rounded-[2.5rem] md:rounded-[2rem] bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden z-[60] p-2"
                >
                  <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Logical Operatives</span>
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] bg-indigo-500/5 px-2 py-0.5 rounded-md hidden sm:block">↑↓ to navigate</span>
                  </div>
                  <div className="max-h-[50vh] sm:max-h-60 overflow-y-auto custom-scrollbar relative">
                    {filteredCommands.map((cmd, idx) => (
                      <button
                        key={cmd.id}
                        onClick={() => handleCommandSelect(cmd.id)}
                        onMouseEnter={() => setSelectedCommandIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 transition-all text-left relative z-10",
                          selectedCommandIndex === idx ? "text-[var(--text-main)]" : "text-[var(--text-secondary)]"
                        )}
                      >
                        {selectedCommandIndex === idx && (
                          <motion.div 
                            layoutId="commandHighlight"
                            className="absolute inset-0 bg-indigo-500/10 z-[-1]"
                            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
                          />
                        )}
                        <div className={cn(
                          "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                          selectedCommandIndex === idx ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110" : "bg-[var(--bg-app)]"
                        )}>
                          {cmd.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-[12px] md:text-sm font-bold uppercase tracking-wider transition-colors",
                            selectedCommandIndex === idx ? "text-indigo-500" : "text-[var(--text-main)]"
                          )}>{cmd.label}</span>
                          <span className="text-[9px] md:text-[10px] opacity-60 font-medium truncate">{cmd.description}</span>
                        </div>
                        {selectedCommandIndex === idx && (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="ml-auto hidden sm:flex items-center gap-2"
                          >
                             <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md uppercase tracking-widest italic">Execute</span>
                             <ChevronRight className="w-3 h-3 text-indigo-500" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group/composer">
              <AnimatePresence>
                {showCamera && (
                  <CameraCapture 
                    onCapture={(file) => {
                      setPendingFiles(prev => [...prev, file]);
                      setShowCamera(false);
                    }}
                    onClose={() => setShowCamera(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {messages.length > 0 && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, x: -10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute -top-8 md:-top-10 left-3 md:left-6 flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full backdrop-blur-md z-10 shadow-sm"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      Context active ({messages.filter(m => !m.isDeleted).length} turns)
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Glow Effect */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 rounded-[2rem] opacity-0 group-focus-within/composer:opacity-100 transition-opacity duration-1000 blur-sm pointer-events-none" />
              
              <div className="relative bg-white/90 dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 group-focus-within/composer:border-indigo-500/30 group-focus-within/composer:bg-white dark:group-focus-within/composer:bg-zinc-900 backdrop-blur-3xl rounded-[1.8rem] md:rounded-[2rem] p-3 md:p-4 transition-all duration-500 shadow-xl overflow-hidden">

                <AnimatePresence>
                  {pendingFiles.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 px-2 md:px-3 pb-4 pt-1 mb-2 border-b border-black/5 dark:border-white/5"
                    >
                      {pendingFiles.map((file, idx) => (
                        <motion.div 
                          key={`${file.name}-${idx}`}
                          initial={{ scale: 0.8, x: -10 }}
                          animate={{ scale: 1, x: 0 }}
                          className="flex items-center gap-2 md:gap-3 pl-2.5 md:pl-3 pr-1.5 md:pr-2 py-1.5 md:py-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 rounded-xl group/chip transition-all cursor-default"
                        >
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                            {file.type.startsWith('image/') ? <ImageIcon className="w-3 md:w-3.5 h-3 md:h-3.5 text-indigo-500" /> : 
                             file.type.startsWith('video/') ? <Video className="w-3 md:w-3.5 h-3 md:h-3.5 text-indigo-500" /> :
                             <FileText className="w-3 md:w-3.5 h-3 md:h-3.5 text-indigo-500" />}
                          </div>
                          <span className="text-[9px] md:text-[10px] font-bold text-[var(--text-main)] truncate max-w-[80px] md:max-w-[100px]">{file.name}</span>
                          <button 
                            onClick={() => removePendingFile(idx)}
                            className="p-1 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 transition-all opacity-40 group-hover/chip:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 md:gap-4 overflow-hidden min-h-[48px] md:min-h-[56px]">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowCommands(false);
                      } else if (e.key === 'Enter' && !e.shiftKey) {
                        if (showCommands && filteredCommands.length > 0 && filteredCommands[selectedCommandIndex]) {
                          e.preventDefault();
                          handleCommandSelect(filteredCommands[selectedCommandIndex].id);
                        } else {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      } else if (showCommands && filteredCommands.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                        }
                      }
                    }}
                    placeholder={user ? (window.innerWidth < 640 ? "Ask anything..." : "Execute logical query...") : "Auth Required"}
                    rows={1}
                    disabled={!user || isLoading}
                    className="flex-1 bg-transparent border-none p-2 md:p-3 text-sm md:text-[15px] font-medium text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:outline-none resize-none custom-scrollbar min-h-[40px] md:min-h-[48px] max-h-[250px] transition-all"
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 md:gap-1.5 pb-1 md:pb-2 pr-1 md:pr-2 shrink-0">
                    <div className="flex items-center pr-2 md:pr-4 mr-1 md:mr-2 border-r border-black/5 dark:border-white/5 gap-1">
                      <button
                        type="button"
                        onClick={() => setIsActionsExpanded(!isActionsExpanded)}
                        className={cn(
                          "p-2 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 z-20",
                          isActionsExpanded 
                            ? "bg-rose-500 text-white rotate-45 shadow-lg shadow-rose-500/20" 
                            : "bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-indigo-500 hover:bg-indigo-500/10"
                        )}
                        title={isActionsExpanded ? "Close Actions" : "Open Actions"}
                      >
                        <Plus className="w-4 h-4 md:w-5 md:h-5" />
                      </button>

                      <AnimatePresence>
                        {isActionsExpanded && (
                          <motion.div 
                            initial={{ width: 0, opacity: 0, x: -10 }}
                            animate={{ width: 'auto', opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: -10 }}
                            className="flex items-center gap-1 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                fileInputRef.current?.click();
                                setIsActionsExpanded(false);
                              }}
                              className="p-2 md:p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all hover:scale-110 active:scale-95"
                              title="Upload Files"
                            >
                              <Upload className="w-4 h-4 md:w-5 md:h-5" />
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                className="hidden"
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowCamera(true);
                                setIsActionsExpanded(false);
                              }}
                              className="p-2 md:p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all hover:scale-110 active:scale-95 shrink-0"
                              title="Capture Photo"
                            >
                              <Camera className="w-4 h-4 md:w-5 md:h-5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                toggleListening();
                                if (!isListening) setIsActionsExpanded(false);
                              }}
                              className={cn(
                                "p-2 md:p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 shrink-0",
                                isListening 
                                  ? "bg-rose-500 text-white shadow-lg animate-pulse" 
                                  : "bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-indigo-500 hover:bg-indigo-500/10"
                              )}
                              title={isListening ? "Stop Voice Input" : "Voice Input"}
                            >
                              <Mic className={cn("w-4 h-4 md:w-5 md:h-5", isListening && "animate-bounce")} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAiGenConfig({ isOpen: true, type: 'image' });
                                setIsActionsExpanded(false);
                              }}
                              className="p-2 md:p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all hover:scale-110 active:scale-95 shrink-0"
                              title="Neural Generation"
                            >
                              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      type="submit"
                      disabled={(!input.trim() && pendingFiles.length === 0) || isLoading || !user}
                      onClick={handleSubmit}
                      className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-[1.2rem] md:rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 group/send relative",
                        (input.trim() || pendingFiles.length > 0) && !isLoading 
                          ? "bg-indigo-600 text-white shadow-indigo-600/20" 
                          : "bg-black/5 dark:bg-white/5 text-zinc-400"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5" />
                      )}
                    </button>
                  </div>
                </div>
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
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-loose max-w-xs mx-auto">
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
      <aside className="w-80 glass-panel border-l-0 rounded-none p-10 hidden lg:flex flex-col transition-all duration-500">
        {renderRationalMonitorContent()}
      </aside>

      <AnimatePresence>
        {showDashboard && user && (
          <Dashboard userId={user.uid} onClose={() => setShowDashboard(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewsFeed && (
          <motion.aside 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full sm:w-96 border-l border-[var(--border-color)] z-[70] bg-[var(--bg-secondary)] shadow-2xl fixed inset-y-0 right-0 lg:absolute"
          >
            <div className="flex flex-col h-full relative">
              <button 
                onClick={() => setShowNewsFeed(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 z-10 lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
              <NewsFeed />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRationalMonitor && (
          <motion.aside 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-96 border-l border-[var(--border-color)] z-50 bg-[var(--bg-secondary)] shadow-2xl fixed inset-y-0 right-0 lg:hidden p-10 overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-main)]">Rational Monitor</h2>
              <button 
                onClick={() => setShowRationalMonitor(false)}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderRationalMonitorContent()}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {user && showProfileModal && (
          <UserProfileModal 
            user={user} 
            onClose={() => setShowProfileModal(false)} 
          />
        )}
      </AnimatePresence>

      {/* AI Generation Modal Overlay */}
      <AnimatePresence>
        {aiGenConfig.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAiGenConfig({ ...aiGenConfig, isOpen: false })}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Neural Forge</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Synthesize {aiGenConfig.type} from semantic descriptions</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAiGenConfig({ ...aiGenConfig, isOpen: false })}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Neural Prompt</div>
                  <textarea
                    autoFocus
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={`e.g., A futuristic cyberpunk cityscape in the style of ethereal watercolor...`}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 outline-none min-h-[150px] transition-all resize-none custom-scrollbar"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerateAI();
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 42}`} alt="AI Variant" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white">
                      +99
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateAI}
                    disabled={!aiPrompt.trim() || isGeneratingAI}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/30 group"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Forging...
                      </>
                    ) : (
                      <>
                        Materialize
                        <Zap className="w-4 h-4 transition-transform group-hover:scale-125" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="px-8 py-4 bg-zinc-50 dark:bg-black/20 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Tokens: AUTO</span>
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-indigo-600">
                  <div className="flex items-center gap-1.5 opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
                    <Settings className="w-3 h-3" />
                    Advanced
                  </div>
                  <div className="flex items-center gap-1.5 opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
                    <Eye className="w-3 h-3" />
                    Preview
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
