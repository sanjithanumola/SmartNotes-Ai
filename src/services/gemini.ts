export const summarizeText = async (text: string) => {
  const response = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await response.json();
  return data.text;
};

export const generateFlashcards = async (text: string) => {
  const response = await fetch("/api/ai/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return await response.json();
};

export const generateQuiz = async (text: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
  const response = await fetch("/api/ai/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, difficulty }),
  });
  return await response.json();
};

export const generateMindMap = async (text: string) => {
  const response = await fetch("/api/ai/mindmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return await response.json();
};

export const chatWithNotes = async (text: string, history: any[], message: string) => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, history, message }),
  });
  const data = await response.json();
  return data.text;
};
