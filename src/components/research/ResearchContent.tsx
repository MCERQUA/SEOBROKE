import React, { useState } from 'react';
import { useOpenAI } from '../../context/OpenAIContext';
import type { ResearchPhase } from '../../types/research';
import { Loader2, Download, Copy, Check, ChevronDown } from 'lucide-react';
import { getPhaseLabel, formatResearchHtml } from '../../utils/research';
import { toast } from 'sonner';

interface ResearchContentProps {
  phase: ResearchPhase;
  keyword: string;
  isResearching: boolean;
  onKeywordSubmit: (keyword: string) => void;
}

export default function ResearchContent({ 
  phase, 
  keyword, 
  isResearching, 
  onKeywordSubmit 
}: ResearchContentProps) {
  const { state } = useOpenAI();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Get research data from both current research and generated articles
  const researchContainers = [
    // Current research in progress
    ...(state.researchThreads[phase]?.completed ? [{
      id: 'current',
      title: state.userContent.articleTitle || 'Current Research',
      content: state.researchThreads[phase].messages[0].content,
      timestamp: state.researchThreads[phase].timestamp
    }] : []),
    // Research from generated articles
    ...state.generatedArticles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.research[phase]?.messages[0].content,
      timestamp: article.research[phase]?.timestamp
    })).filter(item => item.content)
  ];

  if (!keyword && !researchContainers.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-zinc-400 mb-2">Enter a keyword above to begin research</p>
        <p className="text-zinc-500 text-sm">
          We'll analyze your topic across multiple dimensions
        </p>
      </div>
    );
  }

  if (isResearching && !state.researchThreads[phase]?.completed) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-zinc-400">
            Analyzing {getPhaseLabel(phase).toLowerCase()} for "{keyword}"...
          </p>
        </div>
      </div>
    );
  }

  const handleDownload = (content: string, title: string) => {
    try {
      const htmlContent = formatResearchHtml(
        getPhaseLabel(phase),
        content,
        title
      );
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${phase}-research-${title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Research downloaded successfully');
    } catch (error) {
      toast.error('Failed to download research', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(id);
      toast.success('Research copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Failed to copy research', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  };

  return (
    <div className="space-y-6">
      {researchContainers.map((container) => (
        <div key={container.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-white">
                  {container.title}
                </h2>
                <p className="text-sm font-medium text-emerald-500 mt-1">
                  {getPhaseLabel(phase)}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  {new Date(container.timestamp).toLocaleString()}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(container.id, container.content)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-700 
                      text-white rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    {copied === container.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownload(container.content, container.title)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 
                      text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
                
                <button
                  onClick={() => setExpandedId(
                    expandedId === container.id ? null : container.id
                  )}
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <ChevronDown 
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200
                      ${expandedId === container.id ? 'transform rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            <div className={`transition-all duration-300 ${
              expandedId === container.id ? 'mt-6' : 'h-0 overflow-hidden opacity-0'
            }`}>
              <div className="prose prose-invert max-w-none">
                <div 
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: container.content }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}