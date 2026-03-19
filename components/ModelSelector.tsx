import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Cpu, Check, Loader2 } from 'lucide-react';
import { getAvailableModels } from '../services/geminiService';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelectModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoading(true);
      try {
        const available = await getAvailableModels();
        setModels(available);
      } catch (error) {
        console.error("Could not load models", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-border-primary bg-bg-primary hover:bg-bg-secondary text-text-primary transition-all duration-200 group"
        title="Change Gemini Model"
      >
        {isLoading ? (
            <Loader2 size={16} className="animate-spin text-btn-border-glow" />
        ) : (
            <div className={`w-2 h-2 rounded-full ${selectedModel.includes('gemini-3') ? 'bg-btn-border-glow animate-pulse' : 'bg-text-secondary'}`} />
        )}
        <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block max-w-[150px] truncate">
          {selectedModel.replace('models/', '')}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider sm:hidden">
            Model
        </span>
        <ChevronDown size={14} className={`text-text-secondary group-hover:text-text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-bg-secondary border-3 border-border-primary rounded-xl shadow-brutal-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="p-3 border-b-2 border-border-primary bg-accent-beige/30">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">Select Model</p>
          </div>
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {models.length === 0 && !isLoading ? (
               <div className="p-4 text-xs text-center text-text-secondary">Failed to load models</div>
            ) : (
                models.map((model) => (
                <button
                    key={model}
                    onClick={() => {
                        onSelectModel(model);
                        setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-xs font-bold border-2 border-transparent hover:border-border-primary transition-colors mb-1 ${
                    selectedModel === model 
                        ? 'bg-text-primary text-bg-secondary' 
                        : 'text-text-primary hover:bg-bg-primary'
                    }`}
                >
                    <span className="truncate pr-2">{model}</span>
                    {selectedModel === model && <Check size={14} />}
                </button>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;