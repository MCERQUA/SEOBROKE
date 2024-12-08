import type { Assistant } from 'openai/resources/beta/assistants/assistants';
import type { ResearchPhase, ResearchState } from './research';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface UserContent {
  links: Array<{ id: string; url: string; type: string }>;
  media: Array<{ id: string; content: string; type: string }>;
  isSubmitted: boolean;
  articleTitle: string;
  additionalContent: {
    companyInfo: string;
    specialNotes: string;
    teamCredentials: string;
    ctaPreferences: string;
  };
}

export interface QueuedArticle {
  id: string;
  title: string;
  userContent: UserContent;
  research?: ResearchState;
}

export interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  research: ResearchState;
}

export interface OpenAIState {
  apiKey: string | null;
  assistants: Assistant[];
  selectedAssistant: Assistant | null;
  isConnected: boolean;
  showChat: boolean;
  messages: Message[];
  isLoading: boolean;
  threadId: string | null;
  researchThreads: ResearchState;
  articleGeneration: {
    status: 'idle' | 'generating' | 'complete' | 'error';
    content: string | null;
    error?: string;
  };
  userContent: UserContent;
  articleQueue: QueuedArticle[];
  isProcessingQueue: boolean;
  generatedArticles: GeneratedArticle[];
}

export type OpenAIContextType = {
  state: OpenAIState;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => void;
  selectAssistant: (assistant: Assistant) => void;
  goBack: () => void;
  proceedToChat: () => void;
  startResearchPhase: (phase: ResearchPhase, keyword: string) => Promise<boolean>;
  generateArticle: (title: string) => Promise<string>;
  handleContentSubmit: () => void;
  addArticleToQueue: (title: string) => void;
  updateUserContent: (content: Partial<UserContent>) => void;
};