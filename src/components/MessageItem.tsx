import { useState } from "react";
import { ThumbsUp, ThumbsDown, Info, ChevronDown, ChevronUp, MoreHorizontal, Trash2, RotateCcw, FileText, Image as ImageIcon, Video, Music, Download, ExternalLink, Edit3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Message, Attachment } from "../types";
import { cn } from "../lib/utils";
import { dbService } from "../services/dbService";
import { motion, AnimatePresence } from "motion/react";

interface AttachmentPreviewProps {
  attachment: Attachment;
}

function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');
  const isDoc = !isImage && !isVideo && !isAudio;

  return (
    <div className="group/file relative rounded-3xl overflow-hidden border border-[var(--border-color)] bg-white dark:bg-white/5 transition-all hover:shadow-xl hover:scale-[1.02] duration-500">
      {isImage && (
        <div className="aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <img 
            src={attachment.previewUrl || attachment.url} 
            alt={attachment.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover/file:scale-110"
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
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Audio Content</span>
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
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{(attachment.size / 1024).toFixed(0)} KB</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href={attachment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 transition-colors"
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
}

interface MessageItemProps {
  message: Message;
  onDelete?: (id: string, type: 'soft' | 'hard') => void;
  onRewrite?: (id: string, content: string) => void;
}

function RationalMonitor({ report }: { report: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const indicators = [
    { label: 'Toxicity', key: 'toxicity' },
    { label: 'Gender', key: 'genderBias' },
    { label: 'Race', key: 'racialBias' },
    { label: 'Political', key: 'politicalBias' },
    { label: 'Age', key: 'ageism' },
    { label: 'Disability', key: 'ableism' },
    { label: 'Social', key: 'socialBias' },
    { label: 'Economic', key: 'economicBias' },
    { label: 'Logical', key: 'logical' },
    { label: 'Certainty', key: 'certainty' },
  ];

  const scores = report.indicator_scores_after || {};

  return (
    <div className="mt-4 border border-indigo-500/20 rounded-3xl overflow-hidden bg-indigo-500/5 backdrop-blur-3xl transition-all duration-500">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:bg-indigo-500/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Rational Integrity Monitor Active
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6 overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {indicators.map((ind) => (
                <div key={ind.key} className="bg-black/10 dark:bg-white/5 rounded-2xl p-3 border border-white/5">
                  <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{ind.label}</div>
                  <div className="flex items-end gap-2">
                    <span className={cn(
                      "text-sm font-mono font-bold",
                      (ind.key === 'logical' || ind.key === 'certainty') 
                        ? (scores[ind.key] > 0.8 ? "text-emerald-400" : "text-amber-400")
                        : (scores[ind.key] < 0.1 ? "text-emerald-400" : "text-rose-400")
                    )}>
                      {(scores[ind.key] * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        (ind.key === 'logical' || ind.key === 'certainty') 
                          ? (scores[ind.key] > 0.8 ? "bg-emerald-500" : "bg-amber-500")
                          : (scores[ind.key] < 0.1 ? "bg-emerald-500" : "bg-rose-500")
                      )}
                      style={{ width: `${scores[ind.key] * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Diagnostic Summary</div>
                <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                  "{report.rationale_summary}"
                </p>
              </div>

              {report.changes_made && report.changes_made.length > 0 && (
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Optimization Trace</div>
                  <div className="flex flex-wrap gap-2">
                    {report.changes_made.map((change: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-500/10 text-indigo-500 text-[9px] font-bold uppercase rounded-lg border border-indigo-500/10">
                        {change}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MessageItem({ message, onDelete, onRewrite }: MessageItemProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isAssistant = message.role === "assistant";
  const isLongText = message.content.length > 800;

  const handleFeedback = async (type: 'up' | 'down') => {
    if (message.id) {
      await dbService.updateMessageFeedback(message.id, type);
    }
  };

  if (message.isDeleted) {
    return (
      <div className={cn(
        "flex gap-4 md:gap-8 group animate-in fade-in slide-in-from-bottom-4 duration-700",
        isAssistant ? "max-w-4xl" : "max-w-2xl ml-auto flex-row-reverse"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-[9px] font-bold border opacity-50",
          isAssistant 
            ? "bg-white dark:bg-white/5 text-zinc-400 border-black/5 dark:border-white/5" 
            : "bg-indigo-50 text-indigo-400 border-indigo-100"
        )}>
          {isAssistant ? "AI" : "YOU"}
        </div>
        <div className="flex-1">
          <div className="px-8 py-4 rounded-[2rem] border border-dashed border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 text-zinc-400 text-xs italic flex items-center gap-2">
            <Trash2 className="w-3 h-3" />
            This message was deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-4 md:gap-8 group animate-in fade-in slide-in-from-bottom-4 duration-700",
      isAssistant ? "max-w-4xl" : "max-w-2xl ml-auto flex-row-reverse"
    )}>
      {/* Avatar/Role Icon */}
      <div className={cn(
        "w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-[9px] font-bold border transition-all group-hover:scale-110 duration-500 shadow-sm",
        isAssistant 
          ? "bg-white dark:bg-white/5 text-zinc-500 border-[var(--border-color)] dark:border-white/5" 
          : "bg-indigo-600 text-white border-indigo-700 shadow-indigo-200"
      )}>
        {isAssistant ? "AI" : "YOU"}
      </div>

      <div className="flex-1 min-w-0 flex flex-col space-y-4">
        <div className={cn(
          "px-8 py-7 rounded-[2.5rem] border backdrop-blur-2xl transition-all duration-500 group relative w-full",
          isAssistant 
            ? "bg-[var(--bubble-ai)] border-[var(--glass-border)] text-[var(--text-main)] shadow-sm max-w-[800px] self-start" 
            : "bg-[var(--bubble-user)] border-indigo-100/50 text-[var(--text-main)] shadow-sm max-w-[700px] self-end"
        )}>
          {/* Action Menu (Top-Right of bubble) */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-y-2 group-hover:translate-y-0 text-right">
            <div className="relative inline-block">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Message actions"
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-all shadow-sm"
              >
                <MoreHorizontal className="w-4 h-4" />
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
                {isLongText && (
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:text-indigo-600 transition-all group/expand"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover/expand:bg-indigo-500 group-hover/expand:text-white transition-all">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {isExpanded ? 'Compress Analysis' : 'Expand Logical Vector'}
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

          {isAssistant && message.optimizationReport && (
            <RationalMonitor report={message.optimizationReport} />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
