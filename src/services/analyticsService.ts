import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Message } from '../types';
import { dbService } from './dbService';

export interface AnalyticsData {
  totalMessages: number;
  totalConversations: number;
  averageRationality: number;
  topicDistribution: { label: string; value: number }[];
  engagementOverTime: { date: string; count: number }[];
  biasTrends: { date: string; [key: string]: any }[];
  roleDistribution: { label: string; value: number }[];
}

export const analyticsService = {
  async getDashboardData(userId: string): Promise<AnalyticsData> {
    const conversations = await dbService.getConversations(userId);
    
    // Aggregate messages from all conversations
    const allMessages: Message[] = [];
    
    // Optimized approach: fetch messages for all user's conversations in parallel if possible
    // but Firestore doesn't support 'in' with more than 30 IDs easily. 
    // We'll stick to a simpler approach or just fetch messages by userId if we have it in Message.
    // For now, let's just fetch them conversation by conversation as before but with better code.
    for (const conv of conversations) {
      if (conv.id) {
        const convMessages = await this.fetchMessagesForConversation(conv.id);
        allMessages.push(...convMessages);
      }
    }

    const assistantMessages = allMessages.filter(m => m.role === 'assistant' && !m.isDeleted);
    const userMessages = allMessages.filter(m => m.role === 'user' && !m.isDeleted);

    // Role Distribution calculation
    const roleDistribution = [
      { label: 'Assistant', value: assistantMessages.length },
      { label: 'User', value: userMessages.length }
    ];
    
    // 1. Rationality Scores
    const rationalScores = assistantMessages
      .map(m => m.biasScores?.overallScore ?? m.optimizationReport?.indicator_scores_after?.certainty ?? 0)
      .filter(s => s > 0);
    const avgRationality = rationalScores.length > 0 
      ? rationalScores.reduce((a, b) => a + b, 0) / rationalScores.length 
      : 0;

    // 2. Engagement Over Time
    const engagementMap: Record<string, number> = {};
    allMessages.forEach(m => {
      if (m.createdAt) {
        // Handle Firestore timestamp or Date
        const dateObj = m.createdAt.seconds ? new Date(m.createdAt.seconds * 1000) : new Date(m.createdAt);
        const date = dateObj.toLocaleDateString();
        engagementMap[date] = (engagementMap[date] || 0) + 1;
      }
    });
    const engagementOverTime = Object.entries(engagementMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Topic Distribution
    const topicMap: Record<string, number> = {};
    conversations.forEach(c => {
      const firstWord = c.title.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
      if (firstWord.length > 3) {
        topicMap[firstWord] = (topicMap[firstWord] || 0) + 1;
      }
    });
    const topicDistribution = Object.entries(topicMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 4. Bias Trends
    const trends: Record<string, any> = {};
    assistantMessages.forEach(m => {
      if (m.createdAt && (m.biasScores || m.optimizationReport)) {
        const dateObj = m.createdAt.seconds ? new Date(m.createdAt.seconds * 1000) : new Date(m.createdAt);
        const date = dateObj.toLocaleDateString();
        const scores = m.biasScores || m.optimizationReport?.indicator_scores_after;
        
        if (scores) {
          if (!trends[date]) {
            trends[date] = { date, count: 0, toxicity: 0, gender: 0, race: 0 };
          }
          trends[date].count++;
          trends[date].toxicity += scores.toxicity || 0;
          trends[date].gender += scores.genderBias || 0;
          trends[date].race += scores.racialBias || 0;
        }
      }
    });

    const biasTrends = Object.values(trends).map(t => ({
      date: t.date,
      toxicity: Number((t.toxicity / t.count).toFixed(2)),
      gender: Number((t.gender / t.count).toFixed(2)),
      race: Number((t.race / t.count).toFixed(2)),
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalMessages: allMessages.length,
      totalConversations: conversations.length,
      averageRationality: avgRationality,
      topicDistribution,
      engagementOverTime,
      biasTrends,
      roleDistribution
    };
  },

  async fetchMessagesForConversation(conversationId: string): Promise<Message[]> {
    const q = query(collection(db, 'messages'), where('conversationId', '==', conversationId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  }
};
