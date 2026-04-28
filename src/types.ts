
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

export interface Message {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  originalContent?: string;
  attachments?: Attachment[];
  isCorrected?: boolean;
  biasScores?: BiasScores;
  feedback?: 'up' | 'down' | null;
  isDeleted?: boolean;
  isGloballyDeleted?: boolean;
  deletedAt?: any;
  parentId?: string | null;
  version?: number;
  createdAt: any;
}

export type EthicalMode = 'utilitarian' | 'equal-value' | 'duty-based' | 'randomized' | 'interpretive';

export interface Conversation {
  id?: string;
  userId: string;
  title: string;
  preferredModel?: string;
  ethicalMode?: EthicalMode;
  createdAt: any;
  updatedAt: any;
}
