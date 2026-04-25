import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Brain, 
  Layers, 
  MessageSquare, 
  Trash2, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Volume2,
  BarChart3,
  Clock,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { extractTextFromPDF } from './services/pdf';
import { summarizeText, generateFlashcards, generateQuiz, chatWithNotes, generateMindMap } from './services/gemini';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface NoteSession {
  id: string;
  title: string;
  content: string;
  summary?: string;
  flashcards?: any[];
  quiz?: any;
  quizScore?: { correct: number; total: number };
  mindMap?: any;
  createdAt: number;
  wordCount: number;
}

export default function App() {
  const [sessions, setSessions] = useState<NoteSession[]>([]);
  const [activeSession, setActiveSession] = useState<NoteSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'chat' | 'mindmap'>('summary');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('smart_notes_sessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('smart_notes_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      const newSession: NoteSession = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        content: text,
        createdAt: Date.now(),
        wordCount: text.split(/\s+/).length,
      };

      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      generateInitialContent(newSession);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to process file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const generateInitialContent = async (session: NoteSession) => {
    setIsGenerating('summary');
    try {
      const summary = await summarizeText(session.content);
      const updatedSession = { ...session, summary };
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
      setActiveSession(updatedSession);
    } catch (error) {
      console.error('Summary generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!activeSession) return;
    setIsGenerating('flashcards');
    try {
      const flashcards = await generateFlashcards(activeSession.content);
      const updatedSession = { ...activeSession, flashcards };
      setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
      setActiveSession(updatedSession);
    } catch (error) {
      console.error('Flashcard generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeSession) return;
    setIsGenerating('quiz');
    try {
      const quiz = await generateQuiz(activeSession.content, quizDifficulty);
      const updatedSession = { ...activeSession, quiz };
      setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
      setActiveSession(updatedSession);
    } catch (error) {
      console.error('Quiz generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const updateQuizScore = (score: { correct: number; total: number }) => {
    if (!activeSession) return;
    const updatedSession = { ...activeSession, quizScore: score };
    setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
    setActiveSession(updatedSession);
  };

  const handleSendMessage = async () => {
    if (!activeSession || !chatInput.trim()) return;

    const userMessage = { role: 'user' as const, parts: [{ text: chatInput }] };
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    setIsGenerating('chat');

    try {
      const response = await chatWithNotes(activeSession.content, chatHistory, chatInput);
      setChatHistory(prev => [...prev, { role: 'model' as const, parts: [{ text: response || '' }] }]);
    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateMindMap = async () => {
    if (!activeSession) return;
    setIsGenerating('mindmap');
    try {
      const mindMap = await generateMindMap(activeSession.content);
      const updatedSession = { ...activeSession, mindMap };
      setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
      setActiveSession(updatedSession);
    } catch (error) {
      console.error('Mind Map generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) setActiveSession(null);
  };

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const analyticsData = sessions.slice(0, 5).map(s => ({
    name: s.title.substring(0, 10) + '...',
    score: s.quizScore ? (s.quizScore.correct / s.quizScore.total) * 100 : 0,
    words: s.wordCount
  }));

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans selection:bg-brand selection:text-white relative overflow-hidden">
      {/* Parchment Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/parchment.png')]" />
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand/5 blur-[120px] rounded-full -translate-y-1/2 -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-200/20 blur-[120px] rounded-full translate-y-1/2 -z-10" />

      {/* Navigation */}
      <nav className="border-b border-stone-200 bg-stone-50/70 backdrop-blur-xl sticky top-0 z-[60] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setActiveSession(null)}
          >
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white shadow-xl shadow-brand/30">
              <Brain size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl tracking-tight text-stone-800 leading-none">SmartNotes AI</span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-brand mt-1 transform scale-x-95 origin-left">by sanjith.anumola</span>
            </div>
          </div>
          
          {activeSession && (
            <button 
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-400 hover:text-brand transition-colors"
            >
              <ArrowLeft size={14} />
              Return to Scriptorium
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!activeSession ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-24"
            >
              {/* Hero Section */}
              <div className="max-w-3xl mx-auto text-center space-y-10 relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <h1 className="text-7xl md:text-8xl font-serif font-light leading-[1.1] tracking-tight">
                    Your notes, <br />
                    <span className="italic text-brand font-normal relative">
                      reimagined.
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="absolute -bottom-2 left-0 h-1 bg-brand opacity-30 rounded-full" 
                      />
                    </span>
                  </h1>
                  <p className="text-xl md:text-2xl text-stone-500 leading-relaxed mx-auto font-medium max-w-2xl">
                    The premier scholarly companion. Transform ancient manuscripts into living knowledge through AI-powered visualization.
                  </p>
                  
                  <div className="flex flex-col items-center gap-6 pt-6">
                    <label className="group relative inline-flex items-center gap-5 px-14 py-7 bg-brand text-white rounded-[2rem] cursor-pointer hover:bg-brand-dark transition-all shadow-2xl shadow-brand/40 overflow-hidden active:scale-95">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <Upload size={32} strokeWidth={2.5} />
                      <span className="font-bold text-2xl tracking-tight">Commence New Inquiry</span>
                      <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                    </label>
                    <div className="flex items-center gap-6 text-xs text-stone-400 font-bold uppercase tracking-[0.3em]">
                      <span className="flex items-center gap-2 animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-brand" /> PDF</span>
                      <span className="flex items-center gap-2 animate-pulse [animation-delay:200ms]"><div className="w-1.5 h-1.5 rounded-full bg-brand" /> Plain Text</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Ornamental Divider */}
              <div className="flex items-center justify-center gap-10 opacity-20">
                <div className="h-px flex-1 bg-stone-400" />
                <Brain size={24} className="text-stone-500" />
                <div className="h-px flex-1 bg-stone-400" />
              </div>

              {/* Bento Grid Detailing */}
              <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-8 max-w-6xl mx-auto">
                <div className="md:col-span-2 md:row-span-2 bg-white p-10 rounded-[3rem] border border-stone-200 shadow-sm flex flex-col justify-between group hover:border-brand/40 transition-colors">
                  <div className="space-y-4">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-700">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-3xl font-serif font-bold">The Scriptorium</h3>
                    <p className="text-stone-500 leading-relaxed font-medium">Our advanced AI scriptorium distills massive manuscripts into elegant, readable summaries. Preserve the core essence while shedding the noise.</p>
                  </div>
                  <div className="mt-8 pt-8 border-t border-stone-100 flex items-center justify-between text-[10px] font-black text-stone-300 uppercase tracking-widest">
                    <span>Active Transcriber</span>
                    <span>v2.4 Ancient</span>
                  </div>
                </div>
                
                <div className="md:col-span-2 bg-brand text-white p-10 rounded-[3rem] shadow-2xl shadow-brand/20 flex flex-col justify-between group">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Target size={24} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold">The Mental Forge</h3>
                    <p className="text-white/80 leading-relaxed font-medium">Temper your knowledge with adaptive flashcards and rigorous examinations. Mastery is earned in the forge of inquiry.</p>
                  </div>
                </div>

                <div className="md:col-span-1 bg-stone-100 p-8 rounded-[3rem] border border-stone-200 flex flex-col items-center text-center justify-center gap-4 group hover:bg-stone-200 transition-colors">
                  <TrendingUp size={32} className="text-stone-500 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400">Cartography</p>
                </div>

                <div className="md:col-span-1 bg-stone-800 text-white p-8 rounded-[3rem] flex flex-col items-center text-center justify-center gap-4 group hover:bg-stone-900 transition-colors">
                  <MessageSquare size={32} className="text-amber-500 group-hover:rotate-12 transition-transform" />
                  <p className="text-xs font-black uppercase tracking-widest text-white/40">The Oracle</p>
                </div>
              </div>

              {/* Detailing: Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {[
                  { label: "Wisdom Extracted", value: sessions.reduce((acc, s) => acc + s.wordCount, 0).toLocaleString(), icon: Brain, color: "text-amber-600" },
                  { label: "Mastery Level", value: sessions.length > 0 ? "Scholar" : "Novice", icon: Target, color: "text-orange-700" },
                  { label: "Active Scrolls", value: sessions.length, icon: FileText, color: "text-stone-800" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm flex flex-col items-center text-center space-y-2">
                    <stat.icon className={cn("size-8 mb-2", stat.color)} />
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-serif font-bold text-stone-800">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Sessions Grid */}
              {sessions.length > 0 && (
                <div className="space-y-12">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <h2 className="text-3xl font-serif">Your Scriptorium</h2>
                    <div className="flex items-center gap-2 text-sm text-stone-400 font-bold uppercase tracking-widest">
                      <BarChart3 size={16} />
                      <span>{sessions.length} sessions archived</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {sessions.map(session => (
                      <motion.div
                        key={session.id}
                        whileHover={{ y: -12, scale: 1.02 }}
                        onClick={() => setActiveSession(session)}
                        className="group bg-white p-10 rounded-[3rem] border border-stone-200 hover:border-brand/40 hover:shadow-2xl hover:shadow-brand/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[300px]"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Brain size={120} className="-mr-12 -mt-12" />
                        </div>

                        <div className="space-y-8 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="w-16 h-16 bg-stone-50 rounded-3xl flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all shadow-inner">
                              <FileText size={28} />
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-black text-stone-300 uppercase tracking-[0.25em]">
                              <Clock size={12} />
                              {Math.ceil(session.wordCount / 200)}m read
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <h3 className="font-serif font-bold text-2xl text-stone-800 tracking-tight leading-tight group-hover:text-brand transition-colors">{session.title}</h3>
                            <div className="flex items-center gap-5 text-xs font-bold text-stone-400">
                              <span className="flex items-center gap-2 px-3 py-1 bg-stone-50 rounded-full border border-stone-100 flex-nowrap"><Zap size={14} className="text-amber-600" /> {session.wordCount} words</span>
                              <span className="flex items-center gap-2 px-3 py-1 bg-stone-50 rounded-full border border-stone-100 flex-nowrap"><Target size={14} className="text-orange-700" /> {session.quizScore ? `${Math.round((session.quizScore.correct/session.quizScore.total)*100)}%` : 'New'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="absolute top-8 right-8 p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Graphical Sidebar */}
              <div className="lg:col-span-3 space-y-6 sticky top-24">
                <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-4">
                  <h2 className="text-xl font-bold truncate">{activeSession.title}</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">+12 others studying</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'summary', icon: FileText, label: 'Summary' },
                    { id: 'flashcards', icon: Layers, label: 'Flashcards' },
                    { id: 'quiz', icon: CheckCircle2, label: 'Quiz' },
                    { id: 'mindmap', icon: TrendingUp, label: 'Knowledge Map' },
                    { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm tracking-tight",
                        activeTab === tab.id 
                          ? "bg-brand text-white shadow-xl shadow-brand/20 translate-x-2" 
                          : "text-slate-500 hover:bg-white hover:text-slate-900 hover:translate-x-1"
                      )}
                    >
                      <tab.icon size={20} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Graphical Content Area */}
              <div className="lg:col-span-9 bg-white rounded-[2.5rem] p-10 min-h-[650px] border border-slate-200 shadow-xl shadow-slate-200/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl rounded-full -mr-32 -mt-32" />
                
                <AnimatePresence mode="wait">
                  {activeTab === 'summary' && (
                    <motion.div
                      key="summary-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-serif">Note Summary</h3>
                          <p className="text-sm text-slate-400">AI-generated synthesis of your content</p>
                        </div>
                        <button 
                          onClick={() => speakText(activeSession.summary || '')}
                          className="w-12 h-12 bg-slate-50 hover:bg-brand hover:text-white rounded-2xl transition-all flex items-center justify-center text-brand shadow-sm"
                        >
                          <Volume2 size={24} />
                        </button>
                      </div>
                      
                      {isGenerating === 'summary' ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-brand/20 blur-xl animate-pulse rounded-full" />
                            <Loader2 size={48} className="animate-spin text-brand relative" />
                          </div>
                          <p className="text-slate-400 font-medium italic">Synthesizing your knowledge...</p>
                        </div>
                      ) : activeSession.summary ? (
                        <div className="prose prose-slate prose-lg max-w-none">
                          <Markdown>{activeSession.summary}</Markdown>
                        </div>
                      ) : (
                        <div className="text-center py-32">
                          <button 
                            onClick={() => generateInitialContent(activeSession)}
                            className="group px-8 py-4 border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-brand/30 transition-all"
                          >
                            <div className="flex flex-col items-center gap-3">
                              <Brain size={32} className="text-slate-300 group-hover:text-brand transition-colors" />
                              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs group-hover:text-brand">Generate AI Summary</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'flashcards' && (
                    <motion.div
                      key="flashcards-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-serif">Flashcards</h3>
                          <p className="text-sm text-slate-400">Active recall for better retention</p>
                        </div>
                        {!activeSession.flashcards && !isGenerating && (
                          <button 
                            onClick={handleGenerateFlashcards}
                            className="bg-brand text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
                          >
                            Generate Deck
                          </button>
                        )}
                      </div>

                      {isGenerating === 'flashcards' ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                          <Loader2 size={48} className="animate-spin text-brand" />
                          <p className="text-slate-400 font-medium italic">Creating your study deck...</p>
                        </div>
                      ) : activeSession.flashcards ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {activeSession.flashcards.map((card, idx) => (
                            <Flashcard key={idx} question={card.question} answer={card.answer} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-32 text-slate-300 font-medium">
                          No flashcards generated yet.
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'quiz' && (
                    <motion.div
                      key="quiz-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-serif">Interactive Quiz</h3>
                          <p className="text-sm text-slate-400">Test your understanding</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <select 
                            value={quizDifficulty} 
                            onChange={(e) => setQuizDifficulty(e.target.value as any)}
                            className="bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 ring-brand/10"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                          <button 
                            onClick={handleGenerateQuiz}
                            className="bg-brand text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
                          >
                            {activeSession.quiz ? 'Regenerate' : 'Start Quiz'}
                          </button>
                        </div>
                      </div>

                      {isGenerating === 'quiz' ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                          <Loader2 size={48} className="animate-spin text-brand" />
                          <p className="text-slate-400 font-medium italic">Building your assessment...</p>
                        </div>
                      ) : activeSession.quiz ? (
                        <QuizInterface quiz={activeSession.quiz} onScoreUpdate={updateQuizScore} />
                      ) : (
                        <div className="text-center py-32 text-slate-300 font-medium">
                          Ready to challenge yourself?
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'mindmap' && (
                    <motion.div
                      key="mindmap-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-serif">Knowledge Map</h3>
                          <p className="text-sm text-slate-400">Visual hierarchy of main concepts</p>
                        </div>
                        {!activeSession.mindMap && !isGenerating && (
                          <button 
                            onClick={handleGenerateMindMap}
                            className="bg-brand text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
                          >
                            Generate Map
                          </button>
                        )}
                      </div>

                      {isGenerating === 'mindmap' ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                          <Loader2 size={48} className="animate-spin text-brand" />
                          <p className="text-slate-400 font-medium italic">Mapping your knowledge nodes...</p>
                        </div>
                      ) : activeSession.mindMap ? (
                        <div className="bg-slate-50/50 rounded-[3rem] p-8 border border-slate-100 overflow-x-auto">
                          <MindMap data={activeSession.mindMap} />
                        </div>
                      ) : (
                        <div className="text-center py-32 text-slate-300 font-medium">
                          Let AI visualize the structure of your notes.
                        </div>
                      )}
                    </motion.div>
                  )}
                  {activeTab === 'chat' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-[600px]"
                    >
                      <div className="space-y-1 mb-8">
                        <h3 className="text-3xl font-serif">AI Tutor</h3>
                        <p className="text-sm text-slate-400">Ask questions about your specific notes</p>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-6 mb-8 pr-4 custom-scrollbar">
                        {chatHistory.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
                            <MessageSquare size={48} />
                            <p className="max-w-xs text-sm font-medium">Ask Gemini anything about this document. It has full context of your notes.</p>
                          </div>
                        )}
                        {chatHistory.map((msg, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "max-w-[85%] p-5 rounded-[1.5rem] text-sm leading-relaxed shadow-sm",
                              msg.role === 'user' 
                                ? "bg-brand text-white ml-auto rounded-tr-none" 
                                : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none"
                            )}
                          >
                            <Markdown>{msg.parts[0].text}</Markdown>
                          </div>
                        ))}
                        {isGenerating === 'chat' && (
                          <div className="bg-slate-50 text-slate-400 p-5 rounded-[1.5rem] rounded-tl-none text-sm italic w-fit animate-pulse border border-slate-100">
                            AI is typing...
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask your notes anything..."
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 outline-none focus:ring-4 ring-brand/5 transition-all"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim() || isGenerating === 'chat'}
                          className="bg-brand text-white px-6 rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
                        >
                          <MessageSquare size={24} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-32 py-16 border-t border-stone-200 text-center bg-stone-50/80 backdrop-blur-sm relative">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-stone-400 text-sm font-medium tracking-widest uppercase">
            Curated Intelligence for the Modern Scholar
          </p>
          <div className="flex items-center justify-center gap-4 text-stone-300">
            <div className="h-px w-10 bg-stone-200" />
            <Brain size={20} />
            <div className="h-px w-10 bg-stone-200" />
          </div>
          <p className="text-[10px] text-stone-300 font-bold uppercase tracking-[0.4em]">© 2024 SmartNotes AI • sanjith.anumola@gmail.com</p>
        </div>
      </footer>

      {/* Floating Credit Seal */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2 }}
        className="fixed bottom-8 right-8 z-[100] hidden md:block"
      >
        <div className="group relative">
          <div className="absolute -inset-2 bg-brand/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
          <div className="bg-white/80 backdrop-blur-md border border-stone-200 px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 hover:translate-y-[-4px] transition-transform cursor-default">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-[10px]">SA</div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Architect</span>
              <span className="text-xs font-bold text-stone-800">sanjith.anumola</span>
              <span className="text-[8px] text-stone-400">sanjith.anumola@gmail.com</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MindMap({ data }: { data: any }) {
  return (
    <div className="min-w-[600px] py-10 flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        {/* Root Node */}
        <div className="bg-brand text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand/20 z-10 relative">
          {data.name}
        </div>
        
        <div className="flex gap-16 mt-16 relative">
          {data.children?.map((child: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center relative">
              {/* Connector line to parent */}
              <div className="absolute -top-16 left-1/2 w-px h-16 bg-slate-200 -z-10" />
              
              <div className="bg-white border-2 border-brand/20 text-brand px-6 py-3 rounded-xl font-bold shadow-sm z-10 relative">
                {child.name}
              </div>

              {child.children && (
                <div className="flex gap-8 mt-12 relative w-max">
                  {/* Connector line to sub-children parent container */}
                  {child.children.length > 0 && <div className="absolute -top-12 left-1/2 w-px h-12 bg-slate-100 -z-10" />}
                  
                  {child.children.map((grandChild: any, gIdx: number) => (
                    <div key={gIdx} className="flex flex-col items-center relative">
                      {/* Connector to child */}
                      <div className="absolute -top-8 left-1/2 w-px h-8 bg-slate-100 -z-10" />
                      
                      <div className="bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200">
                        {grandChild.name}
                      </div>
                    </div>
                  ))}
                  
                  {/* Horizontal Bar for children if more than 1 */}
                  {child.children.length > 1 && (
                    <div 
                      className="absolute top-0 left-0 w-full h-px bg-slate-100 -z-10" 
                      style={{ 
                        left: `${(100 / child.children.length) / 2}%`,
                        width: `${100 - (100 / child.children.length)}%` 
                      }} 
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Horizontal Bar for top-level children */}
          {data.children?.length > 1 && (
            <div 
              className="absolute top-0 left-0 w-full h-px bg-slate-200 -z-10" 
              style={{ 
                left: `${(100 / data.children.length) / 2}%`,
                width: `${100 - (100 / data.children.length)}%` 
              }} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Flashcard({ question, answer }: { question: string, answer: string }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="perspective-1000 h-56 cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full h-full preserve-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-slate-50 p-8 rounded-[2rem] flex items-center justify-center text-center border border-slate-200 group-hover:border-brand/30 transition-all shadow-sm group-hover:shadow-lg">
          <p className="font-bold text-lg text-slate-800 leading-tight">{question}</p>
          <div className="absolute bottom-6 right-8 text-[10px] uppercase tracking-[0.2em] text-slate-300 font-black">Question</div>
        </div>
        
        {/* Back */}
        <div className="absolute inset-0 backface-hidden bg-brand text-white p-8 rounded-[2rem] flex items-center justify-center text-center rotate-y-180 shadow-xl shadow-brand/20">
          <p className="text-base leading-relaxed font-medium">{answer}</p>
          <div className="absolute bottom-6 right-8 text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Answer</div>
        </div>
      </motion.div>
    </div>
  );
}

function QuizInterface({ quiz, onScoreUpdate }: { quiz: any, onScoreUpdate: (score: { correct: number; total: number }) => void }) {
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (id: string, value: string | boolean) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const calculateScore = () => {
    let correct = 0;
    let total = 0;

    quiz.mcqs?.forEach((q: any, i: number) => {
      if (answers[`mcq-${i}`] === q.correctAnswer) correct++;
      total++;
    });

    quiz.trueFalse?.forEach((q: any, i: number) => {
      if (answers[`tf-${i}`] === q.answer) correct++;
      total++;
    });

    return { correct, total };
  };

  const score = calculateScore();

  const handleSubmit = () => {
    setShowResults(true);
    onScoreUpdate(score);
  };

  return (
    <div className="space-y-16">
      {/* MCQs */}
      {quiz.mcqs?.length > 0 && (
        <div className="space-y-10">
          <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Multiple Choice</h4>
          {quiz.mcqs.map((q: any, i: number) => (
            <div key={i} className="space-y-6">
              <p className="font-bold text-xl leading-tight text-slate-800">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => !showResults && handleAnswer(`mcq-${i}`, opt)}
                    className={cn(
                      "text-left px-6 py-5 rounded-2xl border-2 transition-all text-sm font-bold",
                      answers[`mcq-${i}`] === opt 
                        ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                        : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600",
                      showResults && opt === q.correctAnswer && "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20",
                      showResults && answers[`mcq-${i}`] === opt && opt !== q.correctAnswer && "bg-stone-800 text-white border-stone-800 shadow-lg shadow-stone-800/20"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {showResults && q.explanation && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 p-6 bg-orange-50/50 rounded-3xl border border-orange-100"
                >
                  <Brain size={24} className="text-brand shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-brand uppercase tracking-widest">Gemini Reflection</p>
                    <p className="text-sm text-orange-900 leading-relaxed font-medium">{q.explanation}</p>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* True/False */}
      {quiz.trueFalse?.length > 0 && (
        <div className="space-y-10">
          <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">True or False</h4>
          {quiz.trueFalse.map((q: any, i: number) => (
            <div key={i} className="space-y-6">
              <p className="font-bold text-xl leading-tight text-slate-800">{q.question}</p>
              <div className="flex gap-4">
                {[true, false].map((val) => (
                  <button
                    key={val.toString()}
                    onClick={() => !showResults && handleAnswer(`tf-${i}`, val)}
                    className={cn(
                      "flex-1 px-8 py-5 rounded-2xl border-2 transition-all text-base font-bold",
                      answers[`tf-${i}`] === val 
                        ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                        : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600",
                      showResults && val === q.answer && "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20",
                      showResults && answers[`tf-${i}`] === val && val !== q.answer && "bg-stone-800 text-white border-stone-800 shadow-lg shadow-stone-800/20"
                    )}
                  >
                    {val ? 'True' : 'False'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Short Answers */}
      {quiz.shortAnswers?.length > 0 && (
        <div className="space-y-10">
          <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Short Answer</h4>
          {quiz.shortAnswers.map((q: any, i: number) => (
            <div key={i} className="space-y-6">
              <p className="font-bold text-xl leading-tight text-slate-800">{q.question}</p>
              <textarea
                disabled={showResults}
                className="w-full bg-slate-50 border-2 border-transparent rounded-[2rem] px-8 py-6 outline-none focus:ring-4 ring-brand/5 focus:border-brand/20 min-h-[120px] transition-all font-medium"
                placeholder="Type your response..."
              />
              {showResults && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100"
                >
                  <p className="text-[10px] font-black text-orange-800 uppercase tracking-[0.2em] mb-2">Suggested Answer</p>
                  <p className="text-base text-orange-900 font-medium leading-relaxed">{q.suggestedAnswer}</p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-12 border-t border-slate-100 flex items-center justify-between">
        {!showResults ? (
          <button 
            onClick={handleSubmit}
            className="bg-brand text-white px-12 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-brand/20 hover:bg-brand-dark hover:scale-105 transition-all active:scale-95"
          >
            Submit Assessment
          </button>
        ) : (
          <div className="flex items-center gap-10">
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Final Result</p>
              <div className="text-4xl font-serif">
                <span className="text-brand">{score.correct}</span>
                <span className="text-slate-200 mx-2">/</span>
                <span className="text-slate-400">{score.total}</span>
              </div>
            </div>
            <button 
              onClick={() => { setShowResults(false); setAnswers({}); }}
              className="px-8 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
            >
              Retake Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
