import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface BiasIndicatorProps {
  scores: {
    toxicity: number;
    genderBias: number;
    racialBias: number;
    overallScore: number;
  };
  className?: string;
}

export function BiasIndicator({ scores, className }: BiasIndicatorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {[
        { label: "Toxicity", score: scores.toxicity },
        { label: "Gender Bias", score: scores.genderBias },
        { label: "Racial Bias", score: scores.racialBias },
      ].map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex justify-between text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-mono">
            <span>{item.label}</span>
            <span className="text-zinc-400">{item.score.toFixed(3)}</span>
          </div>
          <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.score * 100}%` }}
              className={cn(
                "h-full rounded-full transition-colors duration-500",
                item.score > 0.4 ? "bg-rose-500" : item.score > 0.15 ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
