import React from 'react';
import { Search, FileText, ListTodo, LayoutList, User } from 'lucide-react';

interface MenuBarProps {
  onAccountClick: () => void;
  onResearchClick: () => void;
  onDraftReviewClick: () => void;
}

export default function MenuBar({ 
  onAccountClick, 
  onResearchClick,
  onDraftReviewClick 
}: MenuBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-b border-zinc-800 px-4 py-2 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Center Icon Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onResearchClick}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 
              border border-zinc-700 hover:border-zinc-600 transition-all 
              flex items-center justify-center group"
            title="Research"
          >
            <Search className="w-5 h-5 text-zinc-400 group-hover:text-white" />
          </button>

          <button
            onClick={onDraftReviewClick}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 
              border border-zinc-700 hover:border-zinc-600 transition-all 
              flex items-center justify-center group"
            title="Draft Review"
          >
            <FileText className="w-5 h-5 text-zinc-400 group-hover:text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Account Button */}
          <button
            onClick={onAccountClick}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 
              border border-zinc-700 hover:border-zinc-600 transition-all 
              flex items-center justify-center group"
            title="Account Info"
          >
            <User className="w-5 h-5 text-zinc-400 group-hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}