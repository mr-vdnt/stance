import { useState, useEffect, memo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { analyticsService, AnalyticsData } from '../services/analyticsService';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { LayoutDashboard, TrendingUp, Users, MessageSquare, Activity, ChevronRight, Filter, Download, Calendar, User as UserCircle } from 'lucide-react';
import { DistributionBarChart } from './Visualizations';

interface DashboardProps {
  userId: string;
  onClose: () => void;
}

export const Dashboard = memo(({ userId, onClose }: DashboardProps) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'topics'>('overview');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const result = await analyticsService.getDashboardData(userId);
        setData(result);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-[100] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 text-indigo-600 animate-pulse" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Aggregating Neural Metrics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#F8FAFC] dark:bg-[#090A0F] z-[100] flex flex-col overflow-hidden"
    >
      {/* Header - Mission Control Style */}
      <header className="h-14 md:h-16 border-b border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between px-4 md:px-8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl sticky top-0 z-10">
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <div className="p-1.5 md:p-2 bg-indigo-600 rounded-lg">
            <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Neural Dashboard</h2>
            <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-tighter italic font-serif">Mission Control / Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6 shrink">
          <div className="flex items-center gap-0.5 md:gap-1 bg-black/5 dark:bg-white/5 rounded-full p-0.5 md:p-1 overflow-x-auto no-scrollbar">
            {['overview', 'trends', 'topics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 md:p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans bg-transparent">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
          
          {/* Key Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <StatCard label="Total Messages" value={data.totalMessages} icon={<MessageSquare className="w-4 h-4" />} color="text-blue-600" />
            <StatCard label="Active Sessions" value={data.totalConversations} icon={<Users className="w-4 h-4" />} color="text-purple-600" />
            <StatCard label="Avg Rationality" value={`${(data.averageRationality * 100).toFixed(1)}%`} icon={<Activity className="w-4 h-4" />} color="text-indigo-600" />
            <StatCard label="Harmonization" value="Optimum" icon={<TrendingUp className="w-4 h-4" />} color="text-emerald-600" />
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Message Role Distribution */}
              <div className="lg:col-span-1">
                <DashboardSection title="Message Dynamics" description="Distribution of dialogue interaction" icon={<UserCircle className="w-4 h-4 text-white" />}>
                  <div className="mt-6 flex flex-col items-center">
                    <DistributionBarChart data={data.roleDistribution} className="mt-4" color="#6366f1" />
                    <div className="w-full grid grid-cols-2 gap-4 mt-6">
                      {data.roleDistribution.map((role, i) => (
                        <div key={role.label} className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{role.label}</span>
                          <span className="text-xl font-black text-indigo-500">{role.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </DashboardSection>
              </div>

              {/* Engagement Chart - Spans 2 columns on lg */}
              <div className="lg:col-span-2">
                <DashboardSection title="Engagement Trajectory" description="Message volume across temporal axis" icon={<TrendingUp className="w-4 h-4 text-white" />}>
                  <div className="h-[250px] md:h-[350px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.engagementOverTime}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#888' }} 
                          axisLine={false} 
                          tickLine={false}
                          tickFormatter={(str) => {
                            const date = new Date(str);
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(10px)'
                          }} 
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#6366f1" 
                          radius={[6, 6, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </DashboardSection>
              </div>

              {/* Topic Distribution - Spans 1 column */}
              <div className="lg:col-span-1">
                <DashboardSection title="Neural Clusters" description="Dominant themes identified" icon={<Filter className="w-4 h-4 text-white" />}>
                  <div className="h-[250px] md:h-[350px] mt-4 flex flex-col">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.topicDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                            nameKey="label"
                          >
                            {data.topicDistribution.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                                strokeWidth={0}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 20px 50px rgba(0,0,0,0.1)' 
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {data.topicDistribution.slice(0, 4).map((topic, i) => (
                        <div key={topic.label} className="flex items-center gap-2 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[10px] font-black uppercase tracking-tighter truncate">{topic.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </DashboardSection>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <DashboardSection title="Bias Attenuation Trends" description="Longitudinal analysis of neutrality benchmarks" icon={<TrendingUp className="w-4 h-4" />}>
              <div className="h-[400px] mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.biasTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 1]} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Line type="monotone" dataKey="toxicity" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="gender" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="race" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashboardSection>
          )}

          {activeTab === 'topics' && (
             <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-black/10 dark:border-white/10 overflow-hidden">
                <div className="p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Neural Topic Matrix</h4>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><Download className="w-4 h-4 text-zinc-400" /></button>
                    <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><Calendar className="w-4 h-4 text-zinc-400" /></button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/[0.02] dark:bg-white/[0.02]">
                        <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-zinc-400 font-serif italic border-r border-black/5 dark:border-white/5">00 / UUID</th>
                        <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-zinc-400 font-serif italic border-r border-black/5 dark:border-white/5">01 / Subject</th>
                        <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-zinc-400 font-serif italic border-r border-black/5 dark:border-white/5">02 / Density</th>
                        <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-zinc-400 font-serif italic border-r border-black/5 dark:border-white/5">03 / Status</th>
                        <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-zinc-400 font-serif italic text-right">04 / Meta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topicDistribution.map((topic, i) => (
                        <tr key={topic.label} className="border-t border-black/5 dark:border-white/5 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer group">
                          <td className="px-8 py-4 font-mono text-[10px] border-r border-black/5 dark:border-white/5 opacity-50 group-hover:opacity-100">0{i+1}</td>
                          <td className="px-8 py-4 text-sm font-black uppercase tracking-tighter border-r border-black/5 dark:border-white/5">{topic.label}</td>
                          <td className="px-8 py-4 text-sm font-mono border-r border-black/5 dark:border-white/5">{topic.value} units</td>
                          <td className="px-8 py-4 border-r border-black/5 dark:border-white/5">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black group-hover:bg-white/20 group-hover:text-white">OPTIMIZED</span>
                          </td>
                          <td className="px-8 py-4 text-right">
                             <ChevronRight className="w-4 h-4 ml-auto opacity-20 group-hover:opacity-100" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

        </div>
      </main>
    </motion.div>
  );
});

const StatCard = memo(({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-150 transition-transform duration-700 pointer-events-none">
        {icon}
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={cn("p-2 rounded-xl bg-opacity-10 dark:bg-opacity-20", color.replace('text-', 'bg-'))}>
          <div className={cn(color)}>{icon}</div>
        </div>
        <div className="text-[10px] font-black opacity-20 uppercase tracking-widest italic font-serif">ID://{label.split(' ')[0].toLowerCase()}</div>
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 relative z-10">{label}</div>
      <div className={cn("text-2xl md:text-3xl font-black tracking-tight relative z-10 mb-1", color)}>{value}</div>
      <div className="h-0.5 w-8 bg-current opacity-20 rounded-full" />
    </div>
  );
});

const DashboardSection = memo(({ title, description, icon, children }: { title: string, description: string, icon: React.ReactNode, children: React.ReactNode }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] md:rounded-[2.5rem] border border-black/10 dark:border-white/10 p-5 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black dark:bg-white rounded-lg">
            {/* Using active class logic would require cloning element, simplified here */}
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
});
