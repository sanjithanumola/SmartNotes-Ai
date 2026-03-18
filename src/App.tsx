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
import { summarizeText, generateFlashcards, generateQuiz, chatWithNotes } from './services/gemini';

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
  createdAt: number;
  wordCount: number;
}

export default function App() {
  const [sessions, setSessions] = useState<NoteSession[]>([]);
  const [activeSession, setActiveSession] = useState<NoteSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'chat' | 'analytics'>('summary');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveSession(null)}>
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand/20">
              <Brain size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand to-indigo-600">SmartNotes AI</span>
          </div>
          
          {activeSession && (
            <button 
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand transition-colors"
            >
              <ArrowLeft size={16} />
              Dashboard
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
              className="space-y-16"
            >
              {/* Hero Section */}
              <div className="max-w-3xl mx-auto text-center space-y-8">
                <div className="space-y-6">
                  <h1 className="text-6xl font-serif font-light leading-tight">
                    Your notes, <br />
                    <span className="italic text-brand font-normal">reimagined.</span>
                  </h1>
                  <p className="text-xl text-slate-500 leading-relaxed mx-auto">
                    The ultimate study companion. Convert PDFs into interactive flashcards, quizzes, and AI-powered summaries in seconds.
                  </p>
                  
                  <div className="flex flex-col items-center gap-4 pt-4">
                    <label className="inline-flex items-center gap-3 px-10 py-5 bg-brand text-white rounded-2xl cursor-pointer hover:bg-brand-dark transition-all shadow-xl shadow-brand/20 hover:scale-105 active:scale-95">
                      <Upload size={24} />
                      <span className="font-bold text-lg">Upload Your Notes</span>
                      <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                    </label>
                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-slate-400 animate-pulse">
                        <Loader2 size={16} className="animate-spin" />
                        Processing your document...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Sessions Grid */}
              {sessions.length > 0 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-serif">Your Study Library</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <BarChart3 size={16} />
                      <span>{sessions.length} active sessions</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sessions.map(session => (
                      <motion.div
                        key={session.id}
                        whileHover={{ y: -8 }}
                        onClick={() => setActiveSession(session)}
                        className="group bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-brand/30 hover:shadow-2xl hover:shadow-brand/5 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                              <FileText size={24} />
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                              <Clock size={12} />
                              {Math.ceil(session.wordCount / 200)}m read
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className="font-bold text-xl truncate pr-8">{session.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1"><Zap size={14} className="text-amber-500" /> {session.wordCount} words</span>
                              <span className="flex items-center gap-1"><Target size={14} className="text-emerald-500" /> {session.quizScore ? `${Math.round((session.quizScore.correct/session.quizScore.total)*100)}%` : 'No Quiz'}</span>
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

                  {activeTab === 'chat' && (
                    <motion.div
                      key="chat-view"
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
                      showResults && opt === q.correctAnswer && "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20",
                      showResults && answers[`mcq-${i}`] === opt && opt !== q.correctAnswer && "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20"
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
                  className="flex items-start gap-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100"
                >
                  <Brain size={24} className="text-brand shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-brand uppercase tracking-widest">Gemini Insight</p>
                    <p className="text-sm text-indigo-900 leading-relaxed font-medium">{q.explanation}</p>
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
                      showResults && val === q.answer && "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20",
                      showResults && answers[`tf-${i}`] === val && val !== q.answer && "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20"
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
                  className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100"
                >
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-2">Suggested Answer</p>
                  <p className="text-base text-emerald-900 font-medium leading-relaxed">{q.suggestedAnswer}</p>
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
