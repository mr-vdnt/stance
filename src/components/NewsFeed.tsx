import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, RefreshCw, ExternalLink, Globe, Zap, ShieldCheck } from 'lucide-react';
import { aiService } from '../services/aiService';
import { cn } from '../lib/utils';

export function NewsFeed() {
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = async () => {
    setIsLoading(true);
    const news = await aiService.getNewsFeed();
    setArticles(news);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 1000 * 60 * 60); // Auto-refresh every hour
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] backdrop-blur-xl border-l border-[var(--border-color)] overflow-hidden">
      <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <Newspaper className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-main)]">Global Signal</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Real-time Unbiased Feed</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchNews}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border border-transparent",
              isLoading 
                ? "text-indigo-500 bg-indigo-500/10 border-indigo-500/20 cursor-not-allowed" 
                : "text-zinc-500 dark:text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-500 hover:border-indigo-500/20"
            )}
          >
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isLoading ? 'Syncing Feed' : 'Refresh Feed'}
            </span>
            <RefreshCw className={cn("w-3.5 h-3.5 transition-transform duration-500", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {isLoading && articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <Zap className="w-10 h-10 text-indigo-500/20 mb-4 animate-pulse" />
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Compiling diverse perspectives...</p>
            </div>
          ) : (
            articles.map((article, idx) => (
              <motion.div
                key={article.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative flex flex-col gap-3 p-4 bg-[var(--bg-secondary)] dark:bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] hover:border-indigo-500/30 transition-all duration-500"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-indigo-500/10">
                    {article.category}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">{article.timestamp}</span>
                </div>

                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-snug group-hover:text-indigo-500 transition-colors">
                  {article.title}
                </h3>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                  {article.summary}
                </p>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                      <Globe className="w-2.5 h-2.5 text-zinc-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{article.source}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {article.is_verified && (
                      <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/5 px-1.5 py-0.5 rounded-full border border-emerald-500/10">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Verified</span>
                      </div>
                    )}
                    {article.url && (
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 px-2 rounded-lg bg-indigo-500/5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-500/20"
                        title="View Full Story"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {lastUpdated && (
        <div className="p-4 border-t border-black/5 dark:border-white/5 text-center">
          <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Last Synced: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}
