import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { BiasScores } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Activity } from 'lucide-react';

interface BiasRadarChartProps {
  scores: BiasScores;
  previousScores?: Record<string, number>;
  className?: string;
}

export function BiasRadarChart({ scores, previousScores, className }: BiasRadarChartProps) {
  const data = [
    { subject: 'Toxicity', A: scores.toxicity, B: previousScores?.toxicity ?? scores.toxicity, fullMark: 1 },
    { subject: 'Gender Bias', A: scores.genderBias, B: previousScores?.genderBias ?? scores.genderBias, fullMark: 1 },
    { subject: 'Racial Bias', A: scores.racialBias, B: previousScores?.racialBias ?? scores.racialBias, fullMark: 1 },
    { subject: 'Political', A: scores.politicalBias, B: previousScores?.politicalBias ?? scores.politicalBias, fullMark: 1 },
    { subject: 'Ageism', A: scores.ageism, B: previousScores?.ageism ?? scores.ageism, fullMark: 1 },
    { subject: 'Logical', A: scores.logical, B: previousScores?.logical ?? scores.logical, fullMark: 1 },
    { subject: 'Ableism', A: scores.ableism, B: previousScores?.ableism ?? scores.ableism, fullMark: 1 },
    { subject: 'Social/Econ', A: ((scores.socialBias || 0) + (scores.economicBias || 0)) / 2, B: (((previousScores?.socialBias ?? scores.socialBias) || 0) + ((previousScores?.economicBias ?? scores.economicBias) || 0)) / 2, fullMark: 1 },
  ];

  return (
    <div className={cn("w-full h-[300px] flex items-center justify-center", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="rgba(99, 102, 241, 0.1)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700, className: 'text-zinc-500 dark:text-zinc-400 font-mono tracking-tighter' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
          {previousScores && (
            <Radar
              name="Original"
              dataKey="B"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.1}
              strokeDasharray="4 4"
            />
          )}
          <Radar
            name="Neutralized"
            dataKey="A"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.5}
            animationBegin={300}
            animationDuration={1500}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-color)',
              borderRadius: '12px',
              fontSize: '10px',
              color: 'var(--text-main)',
              boxShadow: 'var(--shadow-card)'
            }}
            itemStyle={{ color: '#6366f1' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DistributionBarChartProps {
  data: { label: string; value: number }[];
  className?: string;
  color?: string;
}

export function DistributionBarChart({ data, className, color = "#6366f1" }: DistributionBarChartProps) {
  return (
    <div className={cn("w-full h-[200px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 9, fontWeight: 600 }} 
            axisLine={false} 
            tickLine={false} 
            className="text-zinc-500"
          />
          <YAxis 
            tick={{ fontSize: 9, fontWeight: 600 }} 
            axisLine={false} 
            tickLine={false} 
            className="text-zinc-500"
          />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
            contentStyle={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-color)',
              borderRadius: '12px',
              fontSize: '10px',
              boxShadow: 'var(--shadow-card)'
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={color} 
                fillOpacity={0.6 + (index / data.length) * 0.4} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticalSummary({ message }: { message: any }) {
  if (!message.biasScores) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">Bias Vector Geometry</h4>
        </div>
        <BiasRadarChart 
          scores={message.biasScores} 
          previousScores={message.optimizationReport?.indicator_scores_before} 
        />
      </div>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">System Confidence Metrics</h4>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 backdrop-blur-sm">
            <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Neutrality Index</div>
            <div className="text-2xl font-black text-indigo-500">
               {((1 - (message.biasScores.overallScore || 0)) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="p-4 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 backdrop-blur-sm">
            <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Neural Certainty</div>
            <div className="text-2xl font-black text-emerald-500">
               {(message.biasScores?.certainty * 100 || 0).toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="space-y-1.5 px-1">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500">
            <span>Harmonization Progress</span>
            <span>{(message.biasScores.overallScore * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${message.biasScores.overallScore * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataVisualizationWrapper({ content }: { content: string }) {
  // Simple regex to find Markdown tables
  const tableMatch = content.match(/\|(.+)\|[\r\n]+\|([- |]+)\|[\r\n]+((?:\|.+|[\r\n]+)+)/);
  
  if (!tableMatch) return null;

  try {
    const rows = tableMatch[0].trim().split('\n').filter(r => r.includes('|') && !r.includes('---'));
    const headers = rows[0].split('|').map(h => h.trim()).filter(Boolean);
    const dataRows = rows.slice(1).map(row => {
      const values = row.split('|').map(v => v.trim()).filter(Boolean);
      const obj: any = {};
      headers.forEach((h, i) => {
        const val = values[i];
        obj[h] = isNaN(Number(val)) ? val : Number(val);
      });
      return obj;
    });

    // Determine numerical columns for Y axis
    const firstRow = dataRows[0];
    const numericalKeys = Object.keys(firstRow).filter(k => typeof firstRow[k] === 'number');
    const labelKey = Object.keys(firstRow).find(k => typeof firstRow[k] === 'string') || Object.keys(firstRow)[0];

    if (numericalKeys.length === 0) return null;

    return (
      <div className="mt-8 p-6 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-xl">
               <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Data Projection</h4>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Automated Analysis from Content</p>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey={labelKey} tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, paddingBottom: '20px' }} />
              {numericalKeys.map((key, i) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={i === 0 ? '#6366f1' : i === 1 ? '#06b6d4' : '#8b5cf6'} 
                  radius={[6, 6, 0, 0]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  } catch (e) {
    return null;
  }
}
