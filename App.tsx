import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Bot, 
  Image as ImageIcon, 
  X, 
  Upload, 
  Copy, 
  Check,
  Loader2, 
  Sparkles,
  Menu,
  FileText,
  Music,
  FileIcon,
  Wand2,
  Moon,
  Sun
} from 'lucide-react';
import LanguageSelector from './components/LanguageSelector';
import HistorySidebar from './components/HistorySidebar';
import LiveSession from './components/LiveSession';
import ModelSelector from './components/ModelSelector';
import { SUPPORTED_LANGUAGES, DEFAULT_TARGET_LANGUAGE } from './constants';
import { Language, TranslationResult, TranslationHistoryItem, InputMode } from './types';
import { translateContent, translateTextStream } from './services/geminiService';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; base64: string; mimeType: string; name: string } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>(DEFAULT_TARGET_LANGUAGE);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // Temperature State
  const [temperature, setTemperature] = useState(0.3);

  // Model Selection State with Persistence
  const [selectedModel, setSelectedModel] = useState<string>(() => {
      return localStorage.getItem('polyglot_model') || 'gemini-3-flash-preview';
  });

  const handleModelChange = (model: string) => {
      setSelectedModel(model);
      localStorage.setItem('polyglot_model', model);
  };
  
  const [history, setHistory] = useState<TranslationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('polyglot_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('polyglot_history', JSON.stringify(history));
  }, [history]);

  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [isLiveSessionOpen, setIsLiveSessionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setSelectedMedia({
          url: URL.createObjectURL(file),
          base64: base64Data,
          mimeType: file.type,
          name: file.name
        });
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearMedia = () => {
    setSelectedMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setResult(null);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleTranslate = async () => {
    if (inputMode === 'text' && !inputText.trim()) return;
    if (inputMode !== 'text' && !selectedMedia) return;

    setIsTranslating(true);
    setResult(null);

    try {
      // Stream path for Text
      if (inputMode === 'text') {
        let streamedText = "";
        // Initialize result immediately
        setResult({
          detectedSourceLanguage: "Auto",
          transcribedText: inputText,
          translatedText: ""
        });

        const stream = translateTextStream(inputText, targetLanguage.name, selectedModel, temperature);
        
        for await (const chunk of stream) {
          streamedText += chunk;
          setResult(prev => ({
            ...prev!,
            translatedText: streamedText
          }));
        }

        // Save to history after stream completes
        const newHistoryItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          detectedSourceLanguage: "Auto",
          transcribedText: inputText,
          translatedText: streamedText,
          targetLanguage: targetLanguage.name,
          type: 'text',
          preview: inputText
        };
        setHistory(prev => [newHistoryItem, ...prev]);

      } else {
        // Standard path for Media (needs JSON analysis)
        const input = { data: selectedMedia!.base64, mimeType: selectedMedia!.mimeType };
        const translation = await translateContent(input, targetLanguage.name, selectedModel, temperature);
        
        setResult(translation);
        
        const newHistoryItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          detectedSourceLanguage: translation.detectedSourceLanguage,
          transcribedText: translation.transcribedText,
          translatedText: translation.translatedText,
          targetLanguage: targetLanguage.name,
          type: inputMode,
          preview: selectedMedia?.name || 'Media File'
        };
        setHistory(prev => [newHistoryItem, ...prev]);
      }

    } catch (error) {
      console.error(error);
      alert("Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const loadHistoryItem = (item: TranslationHistoryItem) => {
    if (item.type === 'live_session') return;
    setResult({
      detectedSourceLanguage: item.detectedSourceLanguage,
      transcribedText: item.transcribedText,
      translatedText: item.translatedText
    });
    const foundLang = SUPPORTED_LANGUAGES.find(l => l.name === item.targetLanguage);
    if (foundLang) setTargetLanguage(foundLang);
    setInputMode(item.type as InputMode);
    
    if (item.type === 'text' && item.transcribedText) {
      setInputText(item.transcribedText);
      setSelectedMedia(null);
    } else {
      setInputMode('text');
      setInputText(item.transcribedText || "[Content]");
      setSelectedMedia(null); 
    }
    setShowMobileHistory(false);
  };

  const getAcceptType = () => {
    switch (inputMode) {
      case 'image': return 'image/*';
      case 'document': return '.pdf,.txt';
      case 'audio_file': return 'audio/*';
      default: return '*/*';
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-bg-primary text-text-primary overflow-hidden font-sans transition-colors duration-300">
      
      {isLiveSessionOpen && (
        <LiveSession 
          targetLanguage={targetLanguage} 
          onClose={() => setIsLiveSessionOpen(false)} 
        />
      )}

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 transform transition-transform duration-300 md:hidden ${showMobileHistory ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-bg-primary/90 backdrop-blur-sm" onClick={() => setShowMobileHistory(false)} />
        <div className="relative w-80 h-full bg-bg-secondary border-r-3 border-border-primary shadow-brutal-lg">
          <HistorySidebar 
             history={history} 
             onClearHistory={() => setHistory([])} 
             onSelectHistoryItem={loadHistoryItem}
             onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-80 shrink-0 flex-col border-r-3 border-border-primary bg-bg-secondary h-screen">
        <div className="h-24 flex items-center justify-between px-6 border-b-3 border-border-primary shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-btn-bg text-btn-text flex items-center justify-center border-2 border-btn-glow shadow-[2px_2px_0px_0px_var(--btn-border-glow)]">
              <Sparkles size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-text-primary">Polyglot</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <HistorySidebar 
            history={history} 
            onClearHistory={() => setHistory([])} 
            onSelectHistoryItem={loadHistoryItem}
            onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Header */}
        <header className="h-20 md:h-24 flex items-center justify-between px-6 md:px-10 border-b-3 border-border-primary bg-bg-secondary shrink-0">
           <div className="flex items-center gap-4">
             <button onClick={() => setShowMobileHistory(true)} className="md:hidden text-text-primary hover:scale-110 transition-transform">
               <Menu size={28} />
             </button>
             <h1 className="text-xl md:text-2xl font-extrabold md:hidden">Polyglot</h1>
             
             {/* Model Selector Component replaces static badge */}
             <div className="hidden md:block">
                 <ModelSelector selectedModel={selectedModel} onSelectModel={handleModelChange} />
             </div>
           </div>

           <div className="flex items-center gap-3">
               {/* Mobile Model Selector */}
               <div className="md:hidden">
                   <ModelSelector selectedModel={selectedModel} onSelectModel={handleModelChange} />
               </div>

               <button 
                onClick={toggleTheme}
                className="w-12 h-12 rounded-full border-3 border-border-primary flex items-center justify-center hover:bg-text-primary hover:text-bg-secondary transition-all hover:-translate-y-1 hover:shadow-brutal"
               >
                  {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
               </button>
               
               {/* GTranslate Wrapper */}
               <div className="gtranslate_wrapper"></div>
           </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
          
          {/* Top Control Bar */}
          <div className="bg-bg-secondary border-3 border-border-primary rounded-3xl p-4 md:p-6 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-brutal shrink-0">
             
             {/* Mode Selector */}
             <div className="flex w-full xl:w-auto gap-2 overflow-x-auto no-scrollbar pb-2 xl:pb-0">
                {[
                  { id: 'text', icon: FileText, label: 'Text' },
                  { id: 'image', icon: ImageIcon, label: 'Image' },
                  { id: 'document', icon: FileIcon, label: 'Doc' },
                  { id: 'audio_file', icon: Music, label: 'Audio' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => { setInputMode(mode.id as InputMode); clearMedia(); setInputText(''); }}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border-2 transition-all whitespace-nowrap ${
                      inputMode === mode.id 
                        ? 'bg-text-primary text-bg-secondary border-text-primary shadow-[4px_4px_0px_0px_var(--btn-border-glow)] -translate-y-1' 
                        : 'bg-transparent border-transparent text-text-secondary hover:bg-bg-primary hover:border-border-primary'
                    }`}
                  >
                    <mode.icon size={18} />
                    {mode.label}
                  </button>
                ))}
             </div>

             {/* Temperature Slider */}
             <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full xl:w-auto px-2 sm:px-4 border-t-2 sm:border-t-0 sm:border-l-2 border-border-primary/10 pt-4 sm:pt-0 sm:pl-6 xl:border-l-0 xl:pl-0 xl:border-t-0 xl:pt-0">
                <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                  <span className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">Creativity</span>
                  <span className="text-xs font-mono font-bold text-text-primary bg-bg-primary px-2 py-1 rounded border border-border-primary/20">{temperature}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={temperature} 
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full sm:w-32 xl:w-40 h-2 bg-border-primary/10 rounded-lg appearance-none cursor-pointer accent-text-primary hover:accent-btn-border-glow transition-all"
                  title={`Temperature: ${temperature}`}
                />
             </div>

             {/* Live Button */}
             <button
                onClick={() => setIsLiveSessionOpen(true)}
                className="w-full xl:w-auto group flex items-center justify-center gap-3 px-8 py-3 bg-bg-secondary text-btn-border-glow border-3 border-btn-glow rounded-xl hover:shadow-glow transition-all hover:-translate-y-1 font-bold tracking-wide"
              >
                <div className="w-3 h-3 bg-btn-border-glow rounded-full animate-pulse" />
                LIVE SESSION
              </button>
          </div>

          {/* Main Card Area - Layout Fixed with Max Height for Scroll */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 min-h-[500px] lg:min-h-0 lg:h-[calc(100vh-16rem)]">
            
            {/* Input Side - Accent Sky */}
            <div className="flex flex-col bg-accent-sky border-3 border-border-primary rounded-4xl p-6 md:p-8 relative transition-transform hover:-translate-y-1 hover:shadow-brutal-lg duration-300 h-full overflow-hidden">
               <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="px-4 py-1 bg-text-primary text-bg-secondary text-xs font-bold uppercase rounded-full tracking-wider">
                    Input Source
                  </div>
                  {selectedMedia && (
                    <button onClick={clearMedia} className="p-2 rounded-full hover:bg-black/10 transition-colors">
                      <X size={20} className="text-text-primary" />
                    </button>
                  )}
               </div>

               <div className="flex-1 flex flex-col min-h-40">
                  {inputMode === 'text' ? (
                     <textarea
                       value={inputText}
                       onChange={(e) => setInputText(e.target.value)}
                       placeholder="Type your text here..."
                       className="w-full h-full bg-transparent border-none outline-none resize-none text-2xl md:text-3xl text-text-primary placeholder-text-secondary/50 font-medium leading-relaxed custom-scrollbar"
                       spellCheck={false}
                     />
                  ) : (
                     <div className="flex-1 flex flex-col items-center justify-center border-3 border-dashed border-text-primary/20 rounded-3xl hover:bg-black/5 hover:border-text-primary/40 transition-all cursor-pointer relative overflow-hidden group min-h-[300px]"
                          onClick={() => !selectedMedia && fileInputRef.current?.click()}>
                        
                        <input type="file" accept={getAcceptType()} className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        
                        {selectedMedia ? (
                          <div className="flex flex-col items-center z-10 p-8 w-full">
                            {inputMode === 'image' && <img src={selectedMedia.url} className="max-h-64 rounded-xl border-3 border-border-primary shadow-brutal mb-6 object-contain bg-bg-secondary" />}
                            <div className="flex items-center gap-3 bg-bg-secondary px-6 py-3 rounded-xl border-3 border-border-primary shadow-brutal">
                               <FileIcon size={24} className="text-text-primary" />
                               <span className="font-bold text-text-primary">{selectedMedia.name}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-8 transform group-hover:scale-105 transition-transform">
                             <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-bg-secondary border-3 border-border-primary flex items-center justify-center shadow-brutal">
                                <Upload size={32} className="text-text-primary" />
                             </div>
                             <p className="text-xl font-bold text-text-primary">Upload {inputMode.replace('_', ' ')}</p>
                             <p className="text-text-secondary mt-2">Click to browse files</p>
                          </div>
                        )}
                     </div>
                  )}
               </div>
            </div>

            {/* Middle Action / Output Container */}
            <div className="flex flex-col gap-6 h-full min-h-0">
                {/* Action Bar */}
                <div className="bg-bg-secondary border-3 border-border-primary rounded-3xl p-4 flex flex-col sm:flex-row items-end gap-4 shadow-brutal shrink-0">
                   <div className="flex-1 w-full">
                     <LanguageSelector 
                       selectedLanguage={targetLanguage}
                       onSelectLanguage={setTargetLanguage}
                       label="Translate To"
                     />
                   </div>
                   <button
                     onClick={handleTranslate}
                     disabled={isTranslating || (inputMode === 'text' ? !inputText : !selectedMedia)}
                     className="w-full sm:w-auto h-14 px-8 bg-btn-bg text-btn-text border-3 border-btn-glow rounded-xl font-bold text-lg shadow-[4px_4px_0px_0px_var(--btn-border-glow)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--btn-border-glow)] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_var(--btn-border-glow)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                   >
                     {isTranslating ? <Loader2 className="animate-spin" /> : <Wand2 size={24} />}
                     <span>Translate</span>
                   </button>
                </div>

                {/* Output Side - Background */}
                <div className="flex-1 flex flex-col bg-background border-3 border-border-primary rounded-4xl p-6 md:p-8 relative transition-transform hover:-translate-y-1 hover:shadow-brutal-lg duration-300 min-h-40 overflow-hidden">
                   <div className="flex items-center justify-between mb-4 shrink-0">
                      <div className="px-4 py-1 bg-text-primary text-bg-secondary text-xs font-bold uppercase rounded-full tracking-wider">
                        Result
                      </div>
                      <div className="flex gap-2">
                         {result && (
                            <span className="hidden sm:inline-block px-3 py-1 rounded-lg bg-bg-secondary border-2 border-border-primary text-xs font-bold text-text-secondary">
                               Detected: <span className="text-text-primary">{result.detectedSourceLanguage}</span>
                            </span>
                         )}
                         <button 
                           onClick={() => result && handleCopy(result.translatedText)} 
                           className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                             isCopied 
                               ? 'bg-accent-mint text-text-primary border-2 border-border-primary shadow-brutal scale-110 rotate-6' 
                               : 'hover:bg-text-primary/10 text-text-primary border-2 border-transparent'
                           } disabled:opacity-30`}
                           disabled={!result}
                           title={isCopied ? "Copied!" : "Copy translation"}
                         >
                           {isCopied ? <Check size={20} strokeWidth={3} /> : <Copy size={20} />}
                         </button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar max-h-96">
                      {isTranslating && !result?.translatedText ? (
                         <div className="h-full flex flex-col items-center justify-center gap-6 text-text-secondary">
                            <div className="w-20 h-20 rounded-full border-4 border-text-secondary/20 border-t-text-primary animate-spin" />
                            <p className="animate-pulse font-bold text-lg">Generating translation...</p>
                         </div>
                      ) : result ? (
                         <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <p className="text-2xl md:text-3xl text-text-primary font-medium leading-relaxed whitespace-pre-wrap">
                               {result.translatedText}
                            </p>
                            {result.transcribedText && inputMode !== 'text' && (
                               <div className="mt-10 pt-8 border-t-3 border-text-primary/10">
                                  <p className="text-xs font-extrabold text-text-secondary uppercase mb-4 tracking-widest">Original Transcription</p>
                                  <p className="text-base text-text-secondary font-mono leading-relaxed bg-bg-secondary/50 p-6 rounded-2xl border-2 border-text-primary/10">
                                     {result.transcribedText}
                                  </p>
                               </div>
                            )}
                         </div>
                      ) : (
                         <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <Bot size={80} className="mb-6 text-text-primary" />
                            <p className="text-text-primary font-bold text-xl">Ready to translate</p>
                         </div>
                      )}
                   </div>
                </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
};

export default App;