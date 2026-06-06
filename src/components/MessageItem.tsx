import { useState, memo } from "react";
import { ThumbsUp, ThumbsDown, Info, ChevronDown, ChevronUp, MoreHorizontal, Trash2, RotateCcw, FileText, Image as ImageIcon, Video, Music, Download, ExternalLink, Edit3, Copy, Check, Activity, Zap, Fingerprint, Plus, Search, Shield, AlertTriangle, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Message, Attachment } from "../types";
import { cn } from "../lib/utils";
import { dbService } from "../services/dbService";
import { motion, AnimatePresence } from "motion/react";
import { BiasRadarChart, AnalyticalSummary, DataVisualizationWrapper } from "./Visualizations";
import { AIOrb } from "./AIOrb";

const AttachmentPreview = memo(({ attachment }: { attachment: Attachment }) => {
  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');

  return (
    <div className="group/file relative rounded-[1.5rem] md:rounded-3xl overflow-hidden border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl transition-all hover:shadow-2xl hover:scale-[1.02] duration-500">
      {isImage && (
        <div className="aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <img 
            src={attachment.previewUrl || attachment.url} 
            alt={attachment.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover/file:scale-110"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {isVideo && (
        <div className="aspect-video w-full bg-black relative">
          <video 
            src={attachment.url} 
            controls 
            className="w-full h-full"
            poster={attachment.previewUrl}
          />
        </div>
      )}

      {isAudio && (
        <div className="p-6 bg-indigo-500/5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Music className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--text-main)] truncate max-w-[200px]">{attachment.name}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">Audio Content</span>
            </div>
          </div>
          <audio src={attachment.url} controls className="w-full h-8 opacity-80" />
        </div>
      )}

      {!isAudio && (
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!isImage && !isVideo && (
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[150px]">{attachment.name}</span>
              <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">{(attachment.size / 1024).toFixed(0)} KB</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href={attachment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 dark:text-zinc-500 transition-colors"
              title="Open Original"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a 
              href={attachment.url} 
              download={attachment.name}
              className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
});

const RationalMonitor = memo(({ message, onInspect }: { message: Message; onInspect?: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showShift, setShowShift] = useState(true);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  
  const indicators = [
    { label: 'Toxicity', key: 'toxicity', desc: 'Measures inflammatory, insulting, or aggressive language patterns.', color: 'bg-red-500', lightBg: 'bg-red-500/10', lightBorder: 'border-red-200/50', lightText: 'text-red-700' },
    { label: 'Gender Bias', key: 'genderBias', desc: 'Checks for gender stereotypes or unequal representation.', color: 'bg-pink-500', lightBg: 'bg-pink-500/10', lightBorder: 'border-pink-200/50', lightText: 'text-pink-700' },
    { label: 'Racial Bias', key: 'racialBias', desc: 'Monitors for ethnic prejudices or racial stereotyping.', color: 'bg-emerald-500', lightBg: 'bg-emerald-500/10', lightBorder: 'border-emerald-200/50', lightText: 'text-emerald-700' },
    { label: 'Logical', key: 'logical', desc: 'Evaluates the factual grounding and syllogistic integrity.', isPositive: true, color: 'bg-indigo-500', lightBg: 'bg-indigo-500/10', lightBorder: 'border-indigo-200/50', lightText: 'text-indigo-700' },
    { label: 'Political', key: 'politicalBias', desc: 'Identifies ideological leanings or agenda-driven phrasing.', color: 'bg-blue-500', lightBg: 'bg-blue-500/10', lightBorder: 'border-blue-200/50', lightText: 'text-blue-700' },
    { label: 'Ageism', key: 'ageism', desc: 'Detects bias or discrimination based on perceived age.', color: 'bg-orange-500', lightBg: 'bg-orange-500/10', lightBorder: 'border-orange-200/50', lightText: 'text-orange-700' },
    { label: 'Ableism', key: 'ableism', desc: 'Screens for ableist language or accessibility neglect.', color: 'bg-violet-500', lightBg: 'bg-violet-500/10', lightBorder: 'border-violet-200/50', lightText: 'text-violet-700' },
    { label: 'Social', key: 'socialBias', desc: 'Analyzes class-based assumptions or social status prejudice.', color: 'bg-sky-500', lightBg: 'bg-sky-500/10', lightBorder: 'border-sky-200/50', lightText: 'text-sky-700' },
    { label: 'Economic', key: 'economicBias', desc: 'Flags bias related to wealth, poverty, or financial standing.', color: 'bg-purple-500', lightBg: 'bg-purple-500/10', lightBorder: 'border-purple-200/50', lightText: 'text-purple-700' },
    { label: 'Certainty', key: 'certainty', desc: 'Statistical confidence in the neutrality of this specific response.', isPositive: true, color: 'bg-emerald-400', lightBg: 'bg-emerald-400/10', lightBorder: 'border-emerald-200/50', lightText: 'text-emerald-700' },
  ];

  const currentScores = message.optimizationReport?.indicator_scores_after || message.biasScores || {};
  const previousScores = message.optimizationReport?.indicator_scores_before;
  const confidenceScores = message.biasScores?.confidenceScores;

  return (
    <div className="mt-4 border border-black/[0.03] dark:border-white/[0.03] rounded-[2rem] md:rounded-3xl overflow-hidden bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] backdrop-blur-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && message.id) onInspect?.(message.id);
        }}
        className="w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:bg-indigo-500/5 transition-all group/monitor"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)] shrink-0" />
          <span className="truncate">Rational Integrity Monitor Active</span>
          {message.optimizationReport && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-500/10 text-[8px] border border-indigo-500/20 hidden sm:inline-block">Optimized</span>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="opacity-0 group-hover/monitor:opacity-100 transition-opacity text-[8px] font-bold text-indigo-500/60 uppercase hidden sm:block">System Diagnostic</div>
          <div className="flex gap-1">
            {indicators.slice(0, 3).map((ind, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1 h-3 rounded-full transition-all duration-500",
                  ((currentScores as any)[ind.key] || 0) < 0.1 ? "bg-emerald-500/40" : "bg-rose-500/40 shadow-[0_0_4px_rgba(244,63,94,0.3)]"
                )} 
              />
            ))}
          </div>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 md:px-6 pb-4 md:pb-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">Neurality Vector Analysis</div>
                {activeInfo && (
                  <motion.span 
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    className="text-[8px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded-lg"
                  >
                    Definition Active
                  </motion.span>
                )}
              </div>
              {previousScores && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowShift(!showShift); }}
                  className="text-[8px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <Activity className="w-2.5 h-2.5" />
                  {showShift ? "Hide Score Shift" : "View Score Shift"}
                </button>
              )}
            </div>

            <AnalyticalSummary message={message} />

            <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-6 border-t border-black/5 dark:border-white/5 pt-8">
              {indicators.map((ind) => {
                const score = (currentScores as any)[ind.key] || 0;
                const prevScore = previousScores ? (previousScores as any)[ind.key] : null;
                const confidence = confidenceScores ? (confidenceScores as any)[ind.key] : null;
                const diff = prevScore !== null ? score - prevScore : 0;
                const isCritical = !ind.isPositive && score > 0.15;
                const isOptimal = ind.isPositive && score > 0.9;
                const isDetailed = activeInfo === ind.key;

                return (
                  <button 
                    key={ind.key} 
                    onClick={() => setActiveInfo(isDetailed ? null : ind.key)}
                    className={cn(
                      "rounded-xl md:rounded-2xl p-2 md:p-3 border backdrop-blur-sm group/indicator text-left transition-all relative overflow-hidden",
                      isDetailed 
                        ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/10" 
                        : cn("dark:bg-white/10 dark:border-white/10 hover:bg-black/[0.05] dark:hover:bg-white/[0.15]", ind.lightBg, ind.lightBorder),
                      isCritical && "bg-rose-500/5 border-rose-500/20 animate-pulse",
                      isOptimal && "shadow-[inset_0_0_12px_rgba(16,185,129,0.05)]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("text-[8px] font-black uppercase tracking-widest", "dark:text-zinc-400", ind.lightText)}>{ind.label}</div>
                        {isDetailed && <Info className="w-2.5 h-2.5 text-indigo-500" />}
                      </div>
                      {showShift && diff !== 0 && (
                        <div className={cn(
                          "flex items-center gap-0.5 text-[8px] font-bold",
                          diff < 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {diff < 0 ? <ChevronDown className="w-2 h-2" /> : <ChevronUp className="w-2 h-2" />}
                          {(Math.abs(diff) * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-sm font-mono font-black",
                        "dark:text-zinc-100",
                        !ind.isPositive ? (score < 0.1 ? "text-emerald-500" : "text-rose-600") : (score > 0.8 ? "text-emerald-500" : "text-amber-600")
                      )}>
                        {(score * 100).toFixed(0)}%
                      </span>
                      {showShift && prevScore !== null && (
                        <span className="text-[9px] text-zinc-500 line-through opacity-50">
                          {(prevScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div className="mt-2 h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden relative">
                      {showShift && prevScore !== null && (
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-zinc-400 dark:bg-zinc-600 z-10 opacity-30"
                          style={{ left: `${prevScore * 100}%` }}
                        />
                      )}
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000",
                          ind.color
                        )}
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>

                    <AnimatePresence>
                      {isDetailed && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-indigo-500/10"
                        >
                          <p className="text-[9px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">
                            {ind.desc}
                          </p>
                          {confidence !== null && (
                            <div className="mt-2 flex items-center justify-between bg-white/5 p-1 px-2 rounded-lg">
                              <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-tighter">Confidence</span>
                              <span className="text-[7px] font-mono text-indigo-500">{(confidence * 100).toFixed(0)}%</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isDetailed && confidence !== null && (
                      <div className="mt-2 text-[7px] font-mono text-zinc-400 opacity-0 group-hover/indicator:opacity-100 transition-opacity">
                        Conf: {(confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {message.optimizationReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-indigo-500/10">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 mb-3 flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    Deep Diagnostic Rationale
                  </div>
                  <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
                      "{message.optimizationReport.rationale_summary}"
                    </p>
                  </div>
                </div>

                {message.optimizationReport.changes_made && message.optimizationReport.changes_made.length > 0 && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 mb-3 flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      Optimization Trace
                    </div>
                    <div className="space-y-2">
                      {message.optimizationReport.changes_made.map((change: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 group">
                          <div className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500/40 group-hover:bg-indigo-500 transition-colors dark:bg-indigo-400/40 dark:group-hover:bg-indigo-400" />
                          <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-medium leading-tight">
                            {change}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Neural Summary if no optimization but has bias scores */}
            {!message.optimizationReport && message.biasScores?.summary && (
              <div className="pt-6 border-t border-indigo-500/10">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 mb-3 flex items-center gap-2">
                  <Fingerprint className="w-3 h-3" />
                  Neural Profile Summary
                </div>
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {message.biasScores.summary}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface MessageItemProps {
  message: Message;
  onDelete?: (id: string, type: 'soft' | 'hard') => void;
  onRewrite?: (id: string, content: string) => void;
  onRegenerate?: () => void;
  onInspect?: (id: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
}

export const MessageItem = memo(({ message, onDelete, onRewrite, onRegenerate, onInspect, onSuggestionClick }: MessageItemProps) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isAssistant = message.role === "assistant";
  const isLongText = message.content.length > 800;

  const handleFeedback = async (type: 'up' | 'down') => {
    if (message.id) {
      await dbService.updateMessageFeedback(message.id, type);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (message.isDeleted) {
    return (
      <div className={cn(
        "flex gap-3 md:gap-8 group animate-in fade-in slide-in-from-bottom-4 duration-700 w-full",
        isAssistant ? "max-w-4xl" : "max-w-2xl ml-auto flex-row-reverse"
      )}>
        {isAssistant ? (
          <AIOrb className="shrink-0 opacity-50 w-8 h-8 md:w-10 md:h-10" size="sm" />
        ) : (
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl shrink-0 flex items-center justify-center text-[8px] md:text-[9px] font-bold border opacity-50 bg-indigo-50 text-indigo-400 border-indigo-100">
            YOU
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="px-5 md:px-8 py-3 md:py-4 rounded-[1.8rem] md:rounded-[2rem] border border-dashed border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 text-zinc-400 text-[10px] md:text-xs italic flex items-center gap-2">
            <Trash2 className="w-3 h-3" />
            This message was deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 md:gap-8 group animate-in fade-in slide-in-from-bottom-4 duration-700 w-full",
      isAssistant ? "max-w-4xl" : "max-w-2xl ml-auto flex-row-reverse text-right"
    )}>
      {/* Avatar/Role Icon */}
      {isAssistant ? (
        <div className="relative group/orb shrink-0">
          <AIOrb className="transition-all group-hover/orb:scale-110 duration-500 w-8 h-8 md:w-10 md:h-10" />
          <div className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 md:h-3 md:w-3 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-emerald-500 border-2 border-white dark:border-zinc-900"></span>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl shrink-0 flex items-center justify-center text-[8px] md:text-[9px] font-bold border transition-all hover:scale-110 duration-500 shadow-sm bg-indigo-600 text-white border-indigo-700 shadow-indigo-200">
          YOU
        </div>
      )}

      <div className={cn(
        "flex-1 min-w-0 flex flex-col space-y-3 md:space-y-4",
        !isAssistant && "items-end"
      )}>
        <div className={cn(
          "px-5 md:px-8 py-5 md:py-7 rounded-[2rem] md:rounded-[2.5rem] border backdrop-blur-2xl transition-all duration-500 group relative w-fit",
          isAssistant 
            ? "bg-[var(--bubble-ai)] border-[var(--glass-border)] text-[var(--text-main)] shadow-sm max-w-[95%] md:max-w-[800px] self-start" 
            : "bg-[var(--bubble-user)] border-indigo-100/50 text-[var(--text-main)] shadow-sm max-w-[95%] md:max-w-[700px] self-end text-left"
        )}>
          {/* Action Menu (Top-Right of bubble) */}
          <div className={cn(
            "absolute top-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-y-2 group-hover:translate-y-0",
            isAssistant ? "right-4" : "left-4 text-left"
          )}>
            <div className="relative inline-block">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Message actions"
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-all shadow-sm"
              >
                <MoreHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-3xl shadow-2xl p-1.5 z-20 overflow-hidden text-left"
                  >
                    {!isAssistant ? (
                      // User Messages: Exactly 2 options
                      <>
                        <button 
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group/item"
                        >
                          <div className="flex items-center gap-3 font-bold uppercase tracking-wider text-[10px]">
                            <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                            Rewrite Prompt
                          </div>
                        </button>

                        <div className="h-px bg-[var(--glass-border)] my-1" />

                        <button 
                          onClick={() => {
                            if (message.id) onDelete?.(message.id, 'hard');
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors group/item"
                        >
                          <div className="flex items-center gap-3 font-bold uppercase tracking-wider text-[10px]">
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Prompt
                          </div>
                        </button>
                      </>
                    ) : (
                      // Assistant Messages
                      <>
                        <button 
                          onClick={() => {
                            if (message.id) onDelete?.(message.id, 'soft');
                            setShowMenu(false);
                          }}
                          className="w-full flex flex-col items-start px-4 py-3 text-sm text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group/item"
                        >
                          <div className="flex items-center gap-3 font-bold group-hover/item:text-[var(--text-main)] transition-colors text-[10px] uppercase tracking-wider">
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            Soft Redaction
                          </div>
                          <span className="text-[8px] uppercase tracking-widest mt-1 opacity-40">Local Only</span>
                        </button>

                        <div className="h-px bg-[var(--glass-border)] my-1" />

                        <button 
                          onClick={() => {
                            if (message.id) onDelete?.(message.id, 'hard');
                            setShowMenu(false);
                          }}
                          className="w-full flex flex-col items-start px-4 py-3 text-sm text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors group/item"
                        >
                          <div className="flex items-center gap-3 font-bold text-[10px] uppercase tracking-wider">
                            <RotateCcw className="w-3.5 h-3.5" />
                            Protocol Wipe
                          </div>
                          <span className="text-[8px] uppercase tracking-widest mt-1 opacity-50 font-black">History Rollback</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className={cn(
            "prose prose-sm max-w-none leading-relaxed font-sans font-medium dark:prose-invert markdown-body",
            isAssistant ? "text-[var(--text-main)]" : "text-[var(--text-main)]"
          )}>
            {isEditing ? (
              <div className="space-y-4">
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[120px] bg-black/5 dark:bg-white/5 border border-indigo-500/30 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-[var(--text-main)]"
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (message.id) onRewrite?.(message.id, editContent);
                      setIsEditing(false);
                    }}
                    className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    Confirm Rewrite
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(message.content);
                    }}
                    className="px-6 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:text-[var(--text-main)] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words flow-text">
                <div className={cn(
                  "relative transition-all duration-700 ease-in-out overflow-hidden",
                  !isExpanded && isLongText ? "max-h-[250px]" : "max-h-[none]"
                )}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                  {!isExpanded && isLongText && (
                    <div className={cn(
                      "absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t pointer-events-none",
                      isAssistant ? "from-[var(--bubble-ai)]" : "from-[var(--bubble-user)]"
                    )} />
                  )}
                </div>
                <DataVisualizationWrapper content={message.content} />
                {isLongText && (
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:text-indigo-600 transition-all group/expand"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover/expand:bg-indigo-500 group-hover/expand:text-white transition-all">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {isExpanded ? 'Collapse Analysis' : 'Expand Analysis'}
                  </button>
                )}
              </div>
            )}
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className={cn(
              "grid gap-4 mt-6",
              message.attachments.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            )}>
              {message.attachments.map((attachment) => (
                <AttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}

          {isAssistant && (message.biasScores || message.optimizationReport) && (
            <RationalMonitor message={message} onInspect={onInspect} />
          )}

          {isAssistant && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-black/5 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
              {message.isCorrected && (
                <div className="mr-auto flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Optimized for Rationality
                </div>
              )}
              
              <button 
                onClick={handleCopy}
                className={cn(
                  "p-2 rounded-xl transition-all border",
                  copied 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg" 
                    : "bg-black/5 dark:bg-white/5 text-zinc-500 border-transparent hover:text-indigo-500 hover:bg-indigo-500/5"
                )}
                title={copied ? "Copied!" : "Copy Response"}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button 
                onClick={() => handleFeedback('up')}
                className={cn(
                  "p-2 rounded-xl transition-all border",
                  message.feedback === 'up' 
                    ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-lg" 
                    : "bg-black/5 dark:bg-white/5 text-zinc-500 border-transparent hover:text-green-500 hover:bg-green-500/5"
                )}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleFeedback('down')}
                className={cn(
                  "p-2 rounded-xl transition-all border",
                  message.feedback === 'down' 
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-lg" 
                    : "bg-black/5 dark:bg-white/5 text-zinc-500 border-transparent hover:text-rose-500 hover:bg-rose-500/5"
                )}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              {onRegenerate && (
                <button 
                  onClick={onRegenerate}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 border border-transparent hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/20 hover:border-indigo-500/20 dark:hover:border-indigo-400/30 transition-all group/regen"
                  title="Regenerate Response"
                >
                  <RotateCcw className="w-3.5 h-3.5 group-hover/regen:rotate-[-90deg] transition-transform duration-500" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isAssistant && message.suggestions && message.suggestions.length > 0 && (
        <div className="flex flex-col gap-4 ml-10 md:ml-20 mt-8 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
            <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500/80">Suggested Inquiries</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="group/suggest px-5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-indigo-500/10 hover:border-indigo-500/40 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-indigo-500/10 flex items-center gap-2"
              >
                <Plus className="w-3 h-3 text-indigo-500/40 group-hover/suggest:text-indigo-500 transition-colors" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {isAssistant && message.searchSuggestions && message.searchSuggestions.length > 0 && (
        <div className="flex flex-col gap-6 ml-10 md:ml-20 mt-12 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
              <span className="p-1.5 rounded-xl bg-indigo-500/10">
                <Search className="w-3.5 h-3.5 text-indigo-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500/80">Neural Vector Explorer</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {message.searchSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion.query)}
                className={cn(
                  "flex flex-col items-start px-7 py-6 rounded-[2.5rem] border transition-all hover:scale-[1.03] active:scale-95 shadow-sm group/suggest relative overflow-hidden text-left",
                  suggestion.category === 'neutral' 
                    ? "bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/40 hover:shadow-emerald-500/10" 
                    : suggestion.category === 'mildly_biased'
                    ? "bg-amber-500/[0.03] border-amber-500/10 hover:border-amber-500/40 hover:shadow-amber-500/10"
                    : "bg-rose-500/[0.03] border-rose-500/10 hover:border-rose-500/40 hover:shadow-rose-500/10"
                )}
              >
                <div className="flex items-center justify-between w-full mb-4">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5",
                    suggestion.category === 'neutral' 
                      ? "text-emerald-700 bg-emerald-500/10 border border-emerald-500/20" 
                      : suggestion.category === 'mildly_biased'
                      ? "text-amber-700 bg-amber-500/10 border border-amber-500/20"
                      : "text-rose-700 bg-rose-500/10 border border-rose-500/20"
                  )}>
                    {suggestion.category === 'neutral' ? <Shield className="w-2.5 h-2.5 fill-current" /> : <AlertTriangle className="w-2.5 h-2.5 fill-current" />}
                    {suggestion.category.replace('_', ' ')}
                  </span>
                  
                  <div className="flex items-center gap-1 text-indigo-500 opacity-0 group-hover/suggest:opacity-100 transition-all translate-x-2 group-hover/suggest:translate-x-0">
                    <span className="text-[8px] font-black uppercase tracking-widest">Explore</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                <div className="text-[13px] font-black text-[var(--text-main)] group-hover/suggest:text-indigo-600 transition-colors leading-tight mb-3">
                  {suggestion.query}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <Fingerprint className="w-2.5 h-2.5 text-zinc-400" />
                    <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">
                      {suggestion.bias_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <Activity className="w-2.5 h-2.5 text-zinc-400" />
                    <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">
                      {suggestion.bias_direction}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed opacity-70 group-hover/suggest:opacity-100 transition-opacity">
                  {suggestion.reason}
                </p>
                
                {/* Visual state indicator */}
                <div className={cn(
                  "absolute bottom-0 right-0 w-24 h-24 blur-3xl rounded-full opacity-0 group-hover/suggest:opacity-10 transition-opacity duration-700",
                  suggestion.category === 'neutral' ? "bg-emerald-500" : suggestion.category === 'mildly_biased' ? "bg-amber-500" : "bg-rose-500"
                )} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
