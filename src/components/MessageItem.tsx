import { useState } from "react";
import { ThumbsUp, ThumbsDown, Info, ChevronDown, ChevronUp, MoreHorizontal, Trash2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Message } from "../types";
import { cn } from "../lib/utils";
import { dbService } from "../services/dbService";

interface MessageItemProps {
  message: Message;
  onDelete?: (id: string, type: 'soft' | 'hard') => void;
}

export function MessageItem({ message, onDelete }: MessageItemProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isAssistant = message.role === "assistant";

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
            ? "bg-black/5 dark:bg-white/5 text-zinc-500 border-black/5 dark:border-white/5" 
            : "bg-brand-orange/10 text-brand-orange border-brand-orange/20"
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
        "w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-[9px] font-bold border transition-all group-hover:scale-110 duration-500",
        isAssistant 
          ? "bg-black/5 dark:bg-white/5 text-zinc-500 border-black/5 dark:border-white/5" 
          : "bg-brand-orange/10 text-brand-orange border-brand-orange/20 shadow-lg shadow-brand-orange/10"
      )}>
        {isAssistant ? "AI" : "YOU"}
      </div>

      <div className="flex-1 space-y-4 min-w-0 relative">
        <div className={cn(
          "px-8 py-7 rounded-[2.5rem] border backdrop-blur-2xl transition-all duration-500 shadow-2xl group",
          isAssistant 
            ? "bg-[var(--bubble-ai)] border-[var(--glass-border)] text-[var(--text-main)]" 
            : "bg-[var(--bubble-user)] border-brand-orange/5 text-[var(--text-main)] shadow-brand-orange/5"
        )}>
          {/* Action Menu */}
          <div className={cn(
            "absolute top-4 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            isAssistant ? "right-4" : "left-4"
          )}>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-[var(--text-main)] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className={cn(
                  "absolute mt-2 w-56 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-3xl shadow-2xl p-1.5 z-20 overflow-hidden",
                  isAssistant ? "right-0" : "left-0"
                )}>
                  <button 
                    onClick={() => {
                      if (message.id) onDelete?.(message.id, 'soft');
                      setShowMenu(false);
                    }}
                    className="w-full flex flex-col items-start px-4 py-3 text-sm text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group/item"
                  >
                    <div className="flex items-center gap-3 font-bold group-hover/item:text-[var(--text-main)] transition-colors">
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      Soft Redaction
                    </div>
                    <span className="text-[9px] uppercase tracking-widest mt-1 opacity-40">Local Only</span>
                  </button>

                  <div className="h-px bg-[var(--glass-border)] my-1" />

                  <button 
                    onClick={() => {
                      if (message.id) onDelete?.(message.id, 'hard');
                      setShowMenu(false);
                    }}
                    className="w-full flex flex-col items-start px-4 py-3 text-sm text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors group/item"
                  >
                    <div className="flex items-center gap-3 font-bold">
                      <RotateCcw className="w-4 h-4" />
                      Protocol Wipe
                    </div>
                    <span className="text-[9px] uppercase tracking-widest mt-1 opacity-50 font-black">History Rollback</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={cn(
            "prose prose-sm max-w-none leading-relaxed font-sans font-medium dark:prose-invert",
            isAssistant ? "text-[var(--text-main)]" : "text-[var(--text-main)]"
          )}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {isAssistant && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-black/5 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
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
