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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
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
  createdAt: number;
}

export default function App() {
  const [sessions, setSessions] = useState<NoteSession[]>([]);
  const [activeSession, setActiveSession] = useState<NoteSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'chat'>('summary');
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

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-black/5 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveSession(null)}>
            <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center text-white">
              <Brain size={20} />
            </div>
            <span className="font-semibold text-lg tracking-tight">SmartNotes AI</span>
          </div>
          
          {activeSession && (
            <button 
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
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
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="text-center space-y-6 max-w-2xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-serif font-light leading-tight">
                  Turn your notes into <span className="italic">knowledge.</span>
                </h1>
                <p className="text-lg text-black/60 leading-relaxed">
                  Upload your PDFs or paste text to generate summaries, flashcards, and interactive quizzes in seconds.
                </p>
                
                <div className="pt-4">
                  <label className="inline-flex items-center gap-3 px-8 py-4 bg-[#5A5A40] text-white rounded-full cursor-pointer hover:bg-[#4A4A35] transition-colors shadow-lg shadow-[#5A5A40]/20">
                    <Upload size={20} />
                    <span className="font-medium">Upload PDF or Notes</span>
                    <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                  </label>
                  {isUploading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-black/40">
                      <Loader2 size={16} className="animate-spin" />
                      Processing your file...
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Sessions */}
              {sessions.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-black/40">Recent Notes</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => setActiveSession(session)}
                        className="group bg-white p-6 rounded-3xl border border-black/5 hover:border-[#5A5A40]/30 hover:shadow-xl hover:shadow-black/5 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="space-y-4">
                          <div className="w-10 h-10 bg-[#F5F5F0] rounded-xl flex items-center justify-center text-[#5A5A40]">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h3 className="font-medium text-lg truncate pr-8">{session.title}</h3>
                            <p className="text-sm text-black/40">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="absolute top-6 right-6 p-2 text-black/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
              {/* Sidebar Tabs */}
              <div className="lg:col-span-3 space-y-2 sticky top-24">
                <h2 className="text-2xl font-serif mb-6 truncate">{activeSession.title}</h2>
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
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium",
                      activeTab === tab.id 
                        ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" 
                        : "text-black/60 hover:bg-white hover:text-black"
                    )}
                  >
                    <tab.icon size={20} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-9 bg-white rounded-[2rem] p-8 min-h-[600px] border border-black/5 shadow-sm">
                <AnimatePresence mode="wait">
                  {activeTab === 'summary' && (
                    <motion.div
                      key="summary-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-serif">Note Summary</h3>
                        <button 
                          onClick={() => speakText(activeSession.summary || '')}
                          className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors text-[#5A5A40]"
                        >
                          <Volume2 size={20} />
                        </button>
                      </div>
                      
                      {isGenerating === 'summary' ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                          <Loader2 size={40} className="animate-spin text-[#5A5A40]" />
                          <p className="text-black/40 italic">Synthesizing your notes...</p>
                        </div>
                      ) : activeSession.summary ? (
                        <div className="prose prose-stone max-w-none">
                          <Markdown>{activeSession.summary}</Markdown>
                        </div>
                      ) : (
                        <div className="text-center py-20">
                          <button 
                            onClick={() => generateInitialContent(activeSession)}
                            className="px-6 py-3 border-2 border-dashed border-black/10 rounded-2xl hover:border-[#5A5A40]/30 text-black/40 hover:text-[#5A5A40] transition-all"
                          >
                            Generate Summary
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'flashcards' && (
                    <motion.div
                      key="flashcards-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-serif">Flashcards</h3>
                        {!activeSession.flashcards && !isGenerating && (
                          <button 
                            onClick={handleGenerateFlashcards}
                            className="bg-[#5A5A40] text-white px-6 py-2 rounded-full text-sm font-medium"
                          >
                            Generate Cards
                          </button>
                        )}
                      </div>

                      {isGenerating === 'flashcards' ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                          <Loader2 size={40} className="animate-spin text-[#5A5A40]" />
                          <p className="text-black/40 italic">Creating flashcards...</p>
                        </div>
                      ) : activeSession.flashcards ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {activeSession.flashcards.map((card, idx) => (
                            <Flashcard key={idx} question={card.question} answer={card.answer} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-20 text-black/40">
                          No flashcards generated yet.
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'quiz' && (
                    <motion.div
                      key="quiz-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-serif">Interactive Quiz</h3>
                        <div className="flex items-center gap-4">
                          <select 
                            value={quizDifficulty} 
                            onChange={(e) => setQuizDifficulty(e.target.value as any)}
                            className="bg-[#F5F5F0] border-none rounded-xl px-4 py-2 text-sm font-medium outline-none"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                          <button 
                            onClick={handleGenerateQuiz}
                            className="bg-[#5A5A40] text-white px-6 py-2 rounded-full text-sm font-medium"
                          >
                            {activeSession.quiz ? 'Regenerate' : 'Generate Quiz'}
                          </button>
                        </div>
                      </div>

                      {isGenerating === 'quiz' ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                          <Loader2 size={40} className="animate-spin text-[#5A5A40]" />
                          <p className="text-black/40 italic">Building your quiz...</p>
                        </div>
                      ) : activeSession.quiz ? (
                        <QuizInterface quiz={activeSession.quiz} />
                      ) : (
                        <div className="text-center py-20 text-black/40">
                          Ready to test your knowledge?
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'chat' && (
                    <motion.div
                      key="chat-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col h-[550px]"
                    >
                      <h3 className="text-2xl font-serif mb-6">Chat with your Notes</h3>
                      
                      <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                        {chatHistory.length === 0 && (
                          <div className="text-center py-10 text-black/30 text-sm">
                            Ask anything about your notes. "What are the main themes?" or "Explain the concept of..."
                          </div>
                        )}
                        {chatHistory.map((msg, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                              msg.role === 'user' 
                                ? "bg-[#5A5A40] text-white ml-auto" 
                                : "bg-[#F5F5F0] text-black/80"
                            )}
                          >
                            <Markdown>{msg.parts[0].text}</Markdown>
                          </div>
                        ))}
                        {isGenerating === 'chat' && (
                          <div className="bg-[#F5F5F0] text-black/40 p-4 rounded-2xl text-sm italic w-fit animate-pulse">
                            AI is thinking...
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask a question..."
                          className="flex-1 bg-[#F5F5F0] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-[#5A5A40]/20"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim() || isGenerating === 'chat'}
                          className="bg-[#5A5A40] text-white p-4 rounded-2xl hover:bg-[#4A4A35] transition-colors disabled:opacity-50"
                        >
                          <MessageSquare size={20} />
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
      className="perspective-1000 h-48 cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full h-full preserve-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-[#F5F5F0] p-6 rounded-3xl flex items-center justify-center text-center border border-black/5 group-hover:border-[#5A5A40]/20 transition-colors">
          <p className="font-medium text-black/80">{question}</p>
          <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-widest text-black/20 font-bold">Question</div>
        </div>
        
        {/* Back */}
        <div className="absolute inset-0 backface-hidden bg-[#5A5A40] text-white p-6 rounded-3xl flex items-center justify-center text-center rotate-y-180">
          <p className="text-sm leading-relaxed">{answer}</p>
          <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Answer</div>
        </div>
      </motion.div>
    </div>
  );
}

function QuizInterface({ quiz }: { quiz: any }) {
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

  return (
    <div className="space-y-12">
      {/* MCQs */}
      {quiz.mcqs?.length > 0 && (
        <div className="space-y-8">
          <h4 className="text-sm font-bold uppercase tracking-widest text-black/30">Multiple Choice</h4>
          {quiz.mcqs.map((q: any, i: number) => (
            <div key={i} className="space-y-4">
              <p className="font-medium text-lg">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => !showResults && handleAnswer(`mcq-${i}`, opt)}
                    className={cn(
                      "text-left px-6 py-4 rounded-2xl border transition-all text-sm",
                      answers[`mcq-${i}`] === opt 
                        ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                        : "bg-[#F5F5F0] border-transparent hover:border-black/10",
                      showResults && opt === q.correctAnswer && "bg-green-500 text-white border-green-500",
                      showResults && answers[`mcq-${i}`] === opt && opt !== q.correctAnswer && "bg-red-500 text-white border-red-500"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {showResults && q.explanation && (
                <div className="flex items-start gap-3 mt-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <Brain size={18} className="text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-900 leading-relaxed">
                    <span className="font-bold">Gemini Explanation:</span> {q.explanation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* True/False */}
      {quiz.trueFalse?.length > 0 && (
        <div className="space-y-8">
          <h4 className="text-sm font-bold uppercase tracking-widest text-black/30">True or False</h4>
          {quiz.trueFalse.map((q: any, i: number) => (
            <div key={i} className="space-y-4">
              <p className="font-medium text-lg">{q.question}</p>
              <div className="flex gap-4">
                {[true, false].map((val) => (
                  <button
                    key={val.toString()}
                    onClick={() => !showResults && handleAnswer(`tf-${i}`, val)}
                    className={cn(
                      "flex-1 px-6 py-4 rounded-2xl border transition-all text-sm font-medium",
                      answers[`tf-${i}`] === val 
                        ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                        : "bg-[#F5F5F0] border-transparent hover:border-black/10",
                      showResults && val === q.answer && "bg-green-500 text-white border-green-500",
                      showResults && answers[`tf-${i}`] === val && val !== q.answer && "bg-red-500 text-white border-red-500"
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
        <div className="space-y-8">
          <h4 className="text-sm font-bold uppercase tracking-widest text-black/30">Short Answer</h4>
          {quiz.shortAnswers.map((q: any, i: number) => (
            <div key={i} className="space-y-4">
              <p className="font-medium text-lg">{q.question}</p>
              <textarea
                disabled={showResults}
                className="w-full bg-[#F5F5F0] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-[#5A5A40]/20 min-h-[100px]"
                placeholder="Type your answer here..."
              />
              {showResults && (
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                  <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-1">Suggested Answer</p>
                  <p className="text-sm text-green-900">{q.suggestedAnswer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-8 border-t border-black/5 flex items-center justify-between">
        {!showResults ? (
          <button 
            onClick={() => setShowResults(true)}
            className="bg-[#5A5A40] text-white px-10 py-4 rounded-full font-medium shadow-lg shadow-[#5A5A40]/20 hover:bg-[#4A4A35] transition-all"
          >
            Submit Quiz
          </button>
        ) : (
          <div className="flex items-center gap-6">
            <div className="text-2xl font-serif">
              Your Score: <span className="text-[#5A5A40]">{score.correct}/{score.total}</span>
            </div>
            <button 
              onClick={() => { setShowResults(false); setAnswers({}); }}
              className="text-sm font-medium text-black/40 hover:text-black transition-colors"
            >
              Reset Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
