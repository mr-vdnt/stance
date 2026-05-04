
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export interface BiasScores {
  toxicity: number;
  genderBias: number;
  racialBias: number;
  politicalBias: number;
  ageism: number;
  ableism: number;
  socialBias: number;
  economicBias: number;
  logical: number;
  overallScore: number;
  biasVariance: number;
  confidenceScores: {
    toxicity: number;
    genderBias: number;
    racialBias: number;
    politicalBias: number;
    ageism: number;
    ableism: number;
    socialBias: number;
    economicBias: number;
    logical: number;
  };
  summary?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  url: string;
  size: number;
  previewUrl?: string; // For images/videos
}

export interface OptimizationReport {
  improved_response: string;
  indicator_scores_before: Record<string, number>;
  indicator_scores_after: Record<string, number>;
  changes_made: string[];
  rationale_summary: string;
}

export interface Message {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  originalContent?: string;
  attachments?: Attachment[];
  isCorrected?: boolean;
  biasScores?: BiasScores;
  optimizationReport?: OptimizationReport;
  feedback?: 'up' | 'down' | null;
  suggestions?: string[];
  searchSuggestions?: SearchSuggestion[];
  isDeleted?: boolean;
  isGloballyDeleted?: boolean;
  deletedAt?: any;
  parentId?: string | null;
  version?: number;
  createdAt: any;
}

export type EthicalMode = 'utilitarian' | 'equal-value' | 'duty-based' | 'randomized' | 'interpretive';

export interface SearchSuggestion {
  query: string;
  category: 'neutral' | 'mildly_biased' | 'strongly_biased';
  bias_type: 'neutral' | 'framing_bias' | 'ideological_bias' | 'emotional_bias';
  bias_direction: 'positive' | 'negative' | 'skeptical' | 'supportive' | 'critical' | 'none';
  confidence_score: number;
  reason: string;
}

export interface UserPersona {
  interests: string[];
  profession: string;
  behaviorPatterns: string[];
  intentClusters: string[];
}

export interface Conversation {
  id?: string;
  userId: string;
  title: string;
  preferredModel?: string;
  ethicalMode?: EthicalMode;
  createdAt: any;
  updatedAt: any;
}
