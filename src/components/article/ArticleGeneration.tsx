import React, { useState, useEffect } from 'react';
import { useOpenAI } from '../../context/OpenAIContext';
import ArticlePreview from './ArticlePreview';
import GenerationProgress from './GenerationProgress';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function ArticleGeneration() {
  const { state, generateArticle } = useOpenAI();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryTimeout, setRetryTimeout] = useState<number | null>(null);

  // Single useEffect for queue processing
  useEffect(() => {
    let isProcessing = false;

    const processQueue = async () => {
      if (isProcessing || isGenerating || !state.articleQueue.length || retryTimeout) return;

      const currentArticle = state.articleQueue[0];
      if (!currentArticle) return;

      isProcessing = true;
      setIsGenerating(true);
      setProgress(0);
      setCurrentPhase('Preparing research data');

      try {
        await simulatePhase('Synthesizing research findings', 20);
        await simulatePhase('Generating content structure', 40);
        await simulatePhase('Writing main content', 60);
        await simulatePhase('Optimizing for SEO', 80);
        
        await generateArticle(currentArticle.title);
        
        setProgress(100);
        setCurrentPhase('Article completed');
        
        toast.success('Article generated successfully', {
          description: `"${currentArticle.title}" has been generated`
        });
      } catch (error: any) {
        if (error.message?.includes('rate limit')) {
          const waitTime = 25;
          toast.error('Rate limit reached', {
            description: `Waiting ${waitTime} seconds before retrying...`
          });
          
          const timeout = window.setTimeout(() => {
            setRetryTimeout(null);
            setIsGenerating(false);
            isProcessing = false;
          }, waitTime * 1000);
          
          setRetryTimeout(timeout);
        } else {
          toast.error('Failed to generate article', {
            description: error instanceof Error ? error.message : 'An unexpected error occurred'
          });
          setIsGenerating(false);
          isProcessing = false;
        }
      } finally {
        if (!retryTimeout) {
          setTimeout(() => {
            setProgress(0);
            setCurrentPhase('');
            setIsGenerating(false);
            isProcessing = false;
          }, 1500);
        }
      }
    };

    processQueue();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [state.articleQueue, isGenerating, retryTimeout]);

  const simulatePhase = async (phase: string, targetProgress: number) => {
    setCurrentPhase(phase);
    const increment = (targetProgress - progress) / 10;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(prev => Math.min(prev + increment, targetProgress));
    }
  };

  if (!state.researchThreads.outline?.completed && !state.generatedArticles.length) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400 mb-4">
          Complete all research phases to generate your article
        </p>
        <p className="text-sm text-zinc-500">
          Start by entering a keyword above and completing the research process
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Generated Articles</h2>

      {/* Current Generation Progress */}
      {isGenerating && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          <GenerationProgress
            phase={currentPhase}
            progress={progress}
          />
          {retryTimeout && (
            <p className="text-sm text-yellow-500 mt-2">
              Rate limit reached. Retrying shortly...
            </p>
          )}
        </div>
      )}

      {/* Generated Articles List */}
      <div className="space-y-6">
        {state.generatedArticles.map((article) => (
          <div key={article.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {article.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Generated {new Date(article.timestamp).toLocaleString()}
                  </p>
                </div>
                
                <button
                  onClick={() => setExpandedId(
                    expandedId === article.id ? null : article.id
                  )}
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <ChevronDown 
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200
                      ${expandedId === article.id ? 'transform rotate-180' : ''}`}
                  />
                </button>
              </div>

              {expandedId === article.id && (
                <ArticlePreview content={article.content} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}