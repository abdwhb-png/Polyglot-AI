import React, { useMemo, useState } from 'react';
import { Trash2, Image as ImageIcon, Type, ArrowRight, Search, FileText, Music, History, X } from 'lucide-react';
import { TranslationHistoryItem, InputMode } from '../types';

interface HistorySidebarProps {
  history: TranslationHistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryItem: (item: TranslationHistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onClearHistory, onSelectHistoryItem, onDeleteHistoryItem }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;

    const lowerTerm = searchTerm.toLowerCase();
    
    return history.filter(item => {
      const inSource = item.transcribedText?.toLowerCase().includes(lowerTerm);
      const inTranslation = item.translatedText.toLowerCase().includes(lowerTerm);
      const inLanguage = item.targetLanguage.toLowerCase().includes(lowerTerm);
      const inDetected = item.detectedSourceLanguage.toLowerCase().includes(lowerTerm);
      return inSource || inTranslation || inLanguage || inDetected;
    });
  }, [history, searchTerm]);

  const getIconForType = (type: string) => {
    switch (type as InputMode | 'live_session') {
      case 'image': return <ImageIcon size={14} />;
      case 'document': return <FileText size={14} />;
      case 'audio_file': return <Music size={14} />;
      default: return <Type size={14} />;
    }
  };

  return (
    <div className="h-full flex flex-col w-full bg-bg-secondary">
      {/* Header */}
      <div className="p-6 pb-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-text-primary">
          <History size={18} className="text-text-secondary" />
          <h2 className="text-sm font-bold tracking-widest uppercase text-text-secondary">Recent Activity</h2>
        </div>
        {history.length > 0 && (
          <button 
            onClick={onClearHistory}
            className="p-2 rounded-lg text-text-secondary hover:text-btn-border-glow hover:bg-bg-primary transition-all border-2 border-transparent hover:border-btn-border-glow"
            title="Clear All History"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="px-6 pb-6 shrink-0">
         <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-text-primary transition-colors" />
            <input 
               type="text" 
               placeholder="Search..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-bg-primary text-text-primary text-sm font-medium rounded-xl pl-10 pr-4 py-3 border-2 border-transparent focus:border-border-primary focus:bg-bg-secondary outline-none transition-all placeholder-text-secondary/50"
            />
         </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-secondary text-sm font-medium">
            {searchTerm ? <p>No matches found</p> : <p>History is empty</p>}
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectHistoryItem(item)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectHistoryItem(item)}
              className="w-full text-left bg-bg-primary hover:bg-accent-lavender border-2 border-transparent hover:border-border-primary rounded-xl p-4 transition-all group relative overflow-hidden cursor-pointer outline-none focus:border-border-primary"
            >
              {/* Individual Delete Button - Floats Top Right */}
              <button 
                 onClick={(e) => { e.stopPropagation(); onDeleteHistoryItem(item.id); }}
                 className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-bg-secondary border border-border-primary text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-btn-border-glow hover:text-white hover:scale-110 z-10"
                 title="Delete this item"
              >
                 <X size={14} />
              </button>

              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-text-secondary bg-bg-secondary border border-border-primary/20 px-2 py-1 rounded-md flex items-center gap-1.5 uppercase tracking-wider">
                  {getIconForType(item.type)}
                  <span>{item.detectedSourceLanguage}</span>
                  <ArrowRight size={10} />
                  <span>{item.targetLanguage}</span>
                </span>
                <span className="text-[10px] text-text-secondary font-mono font-bold">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-text-primary font-bold line-clamp-2 mb-2 leading-tight pr-6">
                {item.transcribedText || "Media Content"}
              </p>
              <p className="text-xs text-text-secondary line-clamp-1 italic font-medium">
                {item.translatedText}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;