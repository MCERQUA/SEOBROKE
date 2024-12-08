import React, { createContext, useContext, useState } from 'react';
import type { OpenAIState, OpenAIContextType, Message } from '../types/openai';
import type { ResearchPhase, ResearchState } from '../types/research';
import { verifyApiKey } from '../utils/openai';
import { getResearchPrompt } from '../utils/research';
import type { Assistant } from 'openai/resources/beta/assistants/assistants';
import OpenAI from 'openai';
import { toast } from 'sonner';

const OpenAIContext = createContext<OpenAIContextType | undefined>(undefined);

const initialResearchState: ResearchState = {
  topic: null,
  intent: null,
  structure: null,
  ymyl: null,
  tone: null,
  outline: null,
  userContent: null,
  article: null,
  keywords: null
};

const initialState: OpenAIState = {
  apiKey: null,
  assistants: [],
  selectedAssistant: null,
  isConnected: false,
  showChat: false,
  messages: [],
  isLoading: false,
  threadId: null,
  researchThreads: initialResearchState,
  articleGeneration: {
    status: 'idle',
    content: null,
  },
  userContent: {
    links: [],
    media: [],
    isSubmitted: false,
    articleTitle: '',
    additionalContent: {
      companyInfo: '',
      specialNotes: '',
      teamCredentials: '',
      ctaPreferences: '',
    },
  },
  articleQueue: [],
  isProcessingQueue: false,
  generatedArticles: []
};

export function OpenAIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OpenAIState>(initialState);

  const getOpenAIClient = () => {
    if (!state.apiKey) throw new Error('API key not found');
    return new OpenAI({ 
      apiKey: state.apiKey,
      dangerouslyAllowBrowser: true
    });
  };

  const connect = async (apiKey: string) => {
    try {
      const assistants = await verifyApiKey(apiKey);
      setState(prev => ({
        ...prev,
        apiKey,
        assistants,
        isConnected: true,
      }));
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  };

  const disconnect = () => {
    setState(initialState);
  };

  const selectAssistant = (assistant: Assistant) => {
    setState(prev => ({
      ...prev,
      selectedAssistant: assistant,
    }));
  };

  const goBack = () => {
    setState(prev => ({
      ...prev,
      showChat: false,
      messages: [],
      threadId: null,
    }));
  };

  const proceedToChat = async () => {
    if (!state.selectedAssistant) {
      throw new Error('No assistant selected');
    }

    try {
      const openai = getOpenAIClient();
      const thread = await openai.beta.threads.create();
      
      setState(prev => ({
        ...prev,
        showChat: true,
        threadId: thread.id,
      }));
    } catch (error) {
      console.error('Failed to create thread:', error);
      throw error;
    }
  };

  const startResearchPhase = async (phase: ResearchPhase, keyword: string) => {
    if (!state.selectedAssistant) {
      throw new Error('No assistant selected');
    }

    if (!keyword) {
      throw new Error('No keyword provided');
    }

    try {
      const openai = getOpenAIClient();
      const thread = await openai.beta.threads.create();
      
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: getResearchPrompt(phase, keyword),
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: state.selectedAssistant.id,
      });

      let response;
      let attempts = 0;
      const maxAttempts = 60;
      
      while (attempts < maxAttempts) {
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

        if (runStatus.status === 'completed') {
          response = await openai.beta.threads.messages.list(thread.id);
          break;
        } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
          throw new Error(`Research ${runStatus.status}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!response) {
        throw new Error('Research timed out');
      }

      const lastMessage = response.data[0];
      
      setState(prev => ({
        ...prev,
        researchThreads: {
          ...prev.researchThreads,
          [phase]: {
            threadId: thread.id,
            messages: [{
              id: lastMessage.id,
              role: 'assistant',
              content: lastMessage.content[0].text.value,
              createdAt: Date.now(),
            }],
            completed: true,
            results: lastMessage.content[0].text.value,
            timestamp: Date.now()
          },
        },
      }));

      return true;
    } catch (error: any) {
      console.error('Research phase failed:', error);
      setState(prev => ({ 
        ...prev, 
        researchThreads: {
          ...prev.researchThreads,
          [phase]: null,
        },
      }));
      throw error;
    }
  };

  const generateArticle = async (title: string): Promise<string> => {
    if (!state.selectedAssistant) {
      throw new Error('No assistant selected');
    }

    setState(prev => ({
      ...prev,
      articleGeneration: {
        status: 'generating',
        content: null,
      },
    }));

    try {
      const openai = getOpenAIClient();
      const thread = await openai.beta.threads.create();
      
      const researchSummary = Object.entries(state.researchThreads)
        .filter(([_, data]) => data?.completed)
        .map(([phase, data]) => `${phase.toUpperCase()} RESEARCH:\n${data?.results}`)
        .join('\n\n');
      
      const prompt = `Generate a comprehensive, in-depth article about "${title}" based on our research:

${researchSummary}

Requirements:
- Total word count: 4000-5000 words
- Include detailed examples and case studies
- Incorporate statistics and data points
- Add expert insights and citations
- Use proper section headings and subheadings
- Maintain consistent tone and style
- Include transition paragraphs between sections
- Follow SEO best practices
- Make content engaging and informative

Generate the article now, ensuring comprehensive coverage of all research points.`;

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: prompt,
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: state.selectedAssistant.id,
      });

      let response;
      let attempts = 0;
      const maxAttempts = 180;

      while (attempts < maxAttempts) {
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

        if (runStatus.status === 'completed') {
          response = await openai.beta.threads.messages.list(thread.id);
          break;
        } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
          throw new Error(`Article generation ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!response) {
        throw new Error('Article generation timed out');
      }

      const articleContent = response.data[0].content[0].text.value;

      // Create a new generated article with its research data
      const newArticle = {
        id: Date.now().toString(),
        title,
        content: articleContent,
        timestamp: Date.now(),
        research: { ...state.researchThreads }
      };

      setState(prev => ({
        ...prev,
        articleGeneration: {
          status: 'complete',
          content: articleContent,
        },
        generatedArticles: [newArticle, ...prev.generatedArticles],
        articleQueue: prev.articleQueue.slice(1)
      }));

      return articleContent;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        articleGeneration: {
          status: 'error',
          content: null,
          error: error.message,
        },
      }));

      throw error;
    }
  };

  const updateUserContent = (content: Partial<OpenAIState['userContent']>) => {
    setState(prev => ({
      ...prev,
      userContent: {
        ...prev.userContent,
        ...content,
      },
    }));
  };

  const handleContentSubmit = () => {
    setState(prev => ({
      ...prev,
      userContent: {
        ...prev.userContent,
        isSubmitted: true
      }
    }));

    toast.success('User content submitted', {
      description: 'Add article title to begin your draft'
    });
  };

  const addArticleToQueue = (title: string) => {
    const newArticle = {
      id: Date.now().toString(),
      title,
      userContent: { ...state.userContent }
    };

    setState(prev => ({
      ...prev,
      articleQueue: [...prev.articleQueue, newArticle],
      userContent: {
        ...prev.userContent,
        articleTitle: title
      }
    }));

    toast.success('Article added to queue', {
      description: 'Research process will begin shortly'
    });
  };

  const value: OpenAIContextType = {
    state,
    connect,
    disconnect,
    selectAssistant,
    goBack,
    proceedToChat,
    startResearchPhase,
    generateArticle,
    updateUserContent,
    handleContentSubmit,
    addArticleToQueue
  };

  return (
    <OpenAIContext.Provider value={value}>
      {children}
    </OpenAIContext.Provider>
  );
}

export function useOpenAI() {
  const context = useContext(OpenAIContext);
  if (context === undefined) {
    throw new Error('useOpenAI must be used within an OpenAIProvider');
  }
  return context;
}