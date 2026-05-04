import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "./components/ChatInterface";
import { History, Activity, Plus, Moon, Sun, Edit2, Trash2, Check, X, AlertTriangle, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { dbService } from "./services/dbService";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Conversation } from "./types";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; confirmText: string }>({
    isOpen: false,
    id: null,
    confirmText: ""
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setConversations([]);
        setActiveConversationId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchConversations = async () => {
    if (user?.uid) {
      const list = await dbService.getConversations(user.uid);
      setConversations(list);
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditingTitle("");
  };

  const handleSaveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let cleanTitle = editingTitle.trim();
    
    if (cleanTitle.length === 0) {
      cleanTitle = "New Session";
    }

    if (cleanTitle.length > 100) {
      addToast("Title too long (max 100 chars)", "error");
      return;
    }

    try {
      await dbService.updateConversationTitle(id, cleanTitle);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: cleanTitle } : c));
      addToast("Session renamed successfully");
      setEditingId(null);
    } catch (err) {
      addToast("Failed to rename session", "error");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, confirmText: "" });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || deleteModal.confirmText.toUpperCase() !== "DELETE") return;
    
    const idToDelete = deleteModal.id;
    
    try {
      // Optimistic update
      setConversations(prev => prev.filter(c => c.id !== idToDelete));
      if (activeConversationId === idToDelete) {
        setActiveConversationId(null);
      }
      
      setDeleteModal({ isOpen: false, id: null, confirmText: "" });
      
      await dbService.deleteConversation(idToDelete);
      addToast("Session deleted permanently");
    } catch (err) {
      addToast("Critical failure: Could not delete session", "error");
      fetchConversations(); // Rollback
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <main className="h-screen w-full flex items-center justify-center p-0 md:p-6 lg:p-10 relative overflow-hidden transition-all duration-700 bg-[var(--bg-app)]">
      {/* Background with subtle sophisticated texture */}
      <div className="absolute inset-0 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-20 dark:opacity-30 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      {/* Sophisticated Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] dark:bg-indigo-500/10 animate-pulse transition-all duration-700"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/5 blur-[120px] dark:bg-cyan-500/10 transition-all duration-700"></div>

 
      <div className="w-full h-full max-w-7xl flex gap-0 md:gap-6 lg:gap-10 relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Sidebar - Desktop & Mobile Drawer */}
        <aside className={cn(
          "w-[85vw] max-w-[320px] lg:w-80 glass-panel rounded-none md:rounded-[2.5rem] flex flex-col overflow-hidden transition-transform duration-500 z-50",
          "fixed inset-y-0 left-0 lg:relative lg:translate-x-0 lg:flex",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold tracking-tighter italic text-[var(--text-main)]">
                STANCE
              </h1>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-90"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-indigo-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
                </button>
              </div>
            </div>

            <button 
              onClick={() => {
                setActiveConversationId(null);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98]"
              style={{ background: 'var(--gradient-cta)' }}
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>
          
          <div className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar space-y-1.5 font-sans">
            <span className="px-4 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4 block opacity-80">Recent History</span>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConversationId(conv.id || null);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all text-left group cursor-pointer",
                  activeConversationId === conv.id 
                    ? "bg-white dark:bg-white/10 text-[var(--accent-primary)] shadow-sm ring-1 ring-[#EEF2FF] dark:ring-white/10" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-white/50"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors shrink-0",
                  activeConversationId === conv.id ? "bg-indigo-500/10 text-indigo-600" : "bg-black/5 dark:bg-white/5 text-zinc-400 group-hover:text-zinc-500"
                )}>
                  <History className="w-3.5 h-3.5" />
                </div>
                
                {editingId === conv.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      autoFocus
                      className="flex-1 bg-white/10 rounded-lg px-2 py-1 text-[11px] focus:outline-none"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveRename({ stopPropagation: () => {} } as any, conv.id!)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename({ stopPropagation: () => {} } as any, conv.id!);
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => handleSaveRename(e, conv.id!)} className="text-brand-green p-1">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={handleCancelRename} className="text-rose-500 p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold truncate flex-1 tracking-tight">{conv.title}</span>
                    <div className="flex lg:hidden group-hover:flex items-center gap-1">
                      <button 
                        onClick={(e) => handleStartRename(e, conv.id!, conv.title!)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteClick(e, conv.id!)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Interface Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 glass-panel rounded-none md:rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-200 transition-all duration-500">
            <ChatInterface 
              activeConversationId={activeConversationId} 
              setActiveConversationId={setActiveConversationId}
              onConversationCreated={fetchConversations}
              onRename={(id, title) => handleStartRename({ stopPropagation: () => {} } as any, id, title)}
              onDelete={(id) => setDeleteModal({ isOpen: true, id, confirmText: "" })}
              onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              isDarkMode={isDarkMode}
              onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            />
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModal({ isOpen: false, id: null, confirmText: "" })}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-modal p-8 rounded-[2rem] overflow-hidden border border-rose-500/20"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20"></div>
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight">Erase Logical Vector?</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed font-sans">
                    Are you sure you want to delete this chat? <span className="text-rose-500 font-bold uppercase">This action cannot be undone</span>.
                  </p>
                </div>

                <div className="w-full space-y-4">
                  <div className="space-y-1.5 flex flex-col items-start px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-500 opacity-80">Type "DELETE" to acknowledge</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={deleteModal.confirmText}
                      onChange={(e) => setDeleteModal(prev => ({ ...prev, confirmText: e.target.value }))}
                      placeholder="Verification required"
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-rose-500/50 outline-none transition-all placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setDeleteModal({ isOpen: false, id: null, confirmText: "" })}
                      className="px-6 py-3 rounded-2xl bg-white/5 text-[var(--text-main)] text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Abort
                    </button>
                    <button 
                      disabled={deleteModal.confirmText.toUpperCase() !== "DELETE"}
                      onClick={confirmDelete}
                      className="px-6 py-3 rounded-2xl bg-rose-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-500/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                    >
                      Purge
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast System */}
      <div className="fixed bottom-8 right-8 z-[110] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "min-w-[280px] p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3",
                toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                toast.type === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                "bg-brand-gold/10 border-brand-gold/20 text-brand-gold"
              )}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
              <span className="text-[11px] font-bold uppercase tracking-widest flex-1">{toast.message}</span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="p-1 rounded-lg hover:bg-white/5 opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
