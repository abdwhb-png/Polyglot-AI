import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  label?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter(lang =>
      lang.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-extrabold text-text-secondary uppercase tracking-widest mb-2 px-1">{label}</label>}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-bg-primary hover:bg-bg-secondary border-2 border-border-primary text-text-primary px-4 py-3 rounded-xl transition-all duration-200 group"
      >
        <span className="flex items-center gap-3">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-bg-secondary text-sm border border-border-primary/20">
            {selectedLanguage.flag}
          </span>
          <span className="text-base font-bold">{selectedLanguage.name}</span>
        </span>
        <ChevronDown size={18} className={`text-text-secondary group-hover:text-text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-bg-secondary border-3 border-border-primary rounded-xl shadow-brutal-lg max-h-80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
          <div className="p-3 border-b-2 border-border-primary sticky top-0 bg-bg-secondary z-10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search language..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-bg-primary text-text-primary text-sm font-medium rounded-lg pl-9 pr-3 py-2 outline-none border-2 border-transparent focus:border-border-primary placeholder-text-secondary/50"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
            {filteredLanguages.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary text-center font-medium">No results</div>
            ) : (
              filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onSelectLanguage(lang);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between hover:bg-accent-butter border-2 border-transparent hover:border-border-primary transition-colors group ${
                    selectedLanguage.code === lang.code ? 'bg-text-primary text-bg-secondary' : 'text-text-primary'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span className={`text-sm font-bold ${selectedLanguage.code === lang.code ? 'text-bg-secondary' : 'text-text-primary'}`}>
                      {lang.name}
                    </span>
                  </span>
                  {selectedLanguage.code === lang.code && (
                    <div className="w-2 h-2 rounded-full bg-bg-secondary"></div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;