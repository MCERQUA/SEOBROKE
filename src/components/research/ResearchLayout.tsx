import React, { useState } from 'react';
import { ArrowLeft, Menu, X, Plus } from 'lucide-react';
import type { ResearchPhase } from '../../types/research';
import ResearchNavigation from './ResearchNavigation';
import ResearchContent from './ResearchContent';
import KeywordInput from './KeywordInput';
import ArticleGeneration from '../article/ArticleGeneration';
import UserContent from './UserContent';
import { useOpenAI } from '../../context/OpenAIContext';
import { toast } from 'sonner';
import { getAutomatedPhases } from '../../utils/research';

interface ResearchLayoutProps {
  onBack: () => void;
}

export default function ResearchLayout({ onBack }: ResearchLayoutProps) {
  const [activePhase, setActivePhase] = useState<ResearchPhase>('userContent');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { startResearchPhase, state, handleContentSubmit, updateUserContent } = useOpenAI();
  const [currentKeyword, setCurrentKeyword] = useState<string>('');
  const [isResearching, setIsResearching] = useState(false);
  const [showNewContent, setShowNewContent] = useState(false);

  const runAllPhases = async (keyword: string) => {
    const phases = getAutomatedPhases();
    let completedPhases = 0;

    for (const phase of phases) {
      try {
        await startResearchPhase(phase, keyword);
        completedPhases++;
        
        toast.success(`Completed ${phase} analysis`, {
          description: `${completedPhases} of ${phases.length} phases complete`
        });
      } catch (error: any) {
        toast.error(`Error in ${phase} phase`, {
          description: error.message || 'An unexpected error occurred'
        });
        return false;
      }
    }
    
    setActivePhase('article');
    return true;
  };

  const handleKeywordSubmit = async (keyword: string) => {
    if (!state.selectedAssistant) {
      toast.error('No assistant selected', {
        description: 'Please select an OpenAI assistant first'
      });
      return;
    }

    setCurrentKeyword(keyword);
    setIsResearching(true);

    try {
      await runAllPhases(keyword);
      toast.success('Research completed', {
        description: 'All phases have been analyzed'
      });
      setShowNewContent(false);
    } catch (error: any) {
      toast.error('Research process failed', {
        description: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsResearching(false);
    }
  };

  const handleSubmitContent = () => {
    handleContentSubmit();
    setShowNewContent(false);
  };

  const handleAddContent = () => {
    if (!isResearching && state.userContent.isSubmitted) {
      setShowNewContent(true);
      updateUserContent({
        links: [],
        media: [],
        isSubmitted: false,
        articleTitle: '',
        additionalContent: {
          companyInfo: '',
          specialNotes: '',
          teamCredentials: '',
          ctaPreferences: '',
        }
      });
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="fixed inset-0 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Chat</span>
            </button>
            <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
            <h1 className="text-white font-medium capitalize hidden sm:block">
              Content Research
            </h1>
          </div>

          <div className="flex-1 max-w-xl mx-auto px-4">
            <KeywordInput 
              onSubmit={handleKeywordSubmit}
              isDisabled={isResearching || !state.userContent.isSubmitted}
            />
          </div>

          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 top-[57px] overflow-hidden">
        <div className="h-full flex">
          {/* Sidebar */}
          <div className={`
            w-20 lg:w-80 lg:relative fixed inset-y-0 left-0 z-20
            transform transition-transform duration-200 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            bg-zinc-900 lg:bg-transparent
          `}>
            <div className="h-full p-4 overflow-y-auto scrollbar-custom">
              <ResearchNavigation
                activePhase={activePhase}
                onPhaseChange={setActivePhase}
                currentKeyword={currentKeyword}
                isResearching={isResearching}
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto ml-20 lg:ml-0">
            <div className="p-4">
              <div className="lg:hidden mb-4">
                <h1 className="text-xl font-semibold text-white capitalize">
                  Research & Content Generation
                </h1>
              </div>

              <div className="space-y-6">
                {/* Submit/Add Content Button */}
                <button
                  onClick={state.userContent.isSubmitted ? handleAddContent : handleSubmitContent}
                  disabled={isResearching || (state.userContent.isSubmitted && !showNewContent)}
                  className="w-full px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium
                    hover:bg-emerald-600 transition-colors disabled:opacity-50 
                    disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {state.userContent.isSubmitted ? (
                    <>
                      <Plus className="w-4 h-4" />
                      Add User Content
                    </>
                  ) : (
                    'Submit Content'
                  )}
                </button>

                {/* Research Content */}
                {activePhase !== 'userContent' && activePhase !== 'article' && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6">
                    <ResearchContent 
                      phase={activePhase}
                      keyword={currentKeyword}
                      isResearching={isResearching}
                      onKeywordSubmit={handleKeywordSubmit}
                    />
                  </div>
                )}

                {/* User Content Queue */}
                {activePhase === 'userContent' && state.articleQueue.map((article, index) => (
                  <div key={article.id} className="rounded-lg bg-zinc-900 border border-zinc-800 p-6">
                    <UserContent queuePosition={index} />
                  </div>
                ))}

                {/* Current User Content */}
                {activePhase === 'userContent' && (!state.userContent.isSubmitted || showNewContent) && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6">
                    <UserContent 
                      onKeywordSubmit={handleKeywordSubmit} 
                      isResearching={isResearching}
                      queuePosition={state.articleQueue.length}
                    />
                  </div>
                )}

                {/* Article Generation */}
                {activePhase === 'article' && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6">
                    <ArticleGeneration />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}