import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const summarizeText = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following text. Provide a short 5-10 line summary, a detailed summary, and key bullet points. 
    Format the output as Markdown.
    
    Text: ${text.substring(0, 30000)}`, // Limit text size for safety
  });
  return response.text;
};

export const generateFlashcards = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a list of flashcards (Question and Answer) based on the following text. 
    Return the result as a JSON array of objects with "question" and "answer" properties.
    
    Text: ${text.substring(0, 20000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
          required: ["question", "answer"],
        },
      },
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateQuiz = async (text: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a quiz based on the following text. 
    Include 5 Multiple Choice Questions (MCQs) with 4 options and one correct answer, 3 True/False questions, and 2 short answer questions.
    Difficulty level: ${difficulty}.
    Return the result as a JSON object.
    
    Text: ${text.substring(0, 20000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mcqs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["question", "options", "correctAnswer"],
            },
          },
          trueFalse: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.BOOLEAN },
                explanation: { type: Type.STRING },
              },
              required: ["question", "answer"],
            },
          },
          shortAnswers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                suggestedAnswer: { type: Type.STRING },
              },
              required: ["question", "suggestedAnswer"],
            },
          },
        },
      },
    },
  });
  return JSON.parse(response.text || "{}");
};

export const chatWithNotes = async (text: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `You are an AI assistant helping a student understand their notes. 
      Use the provided text as context for your answers. 
      If the answer isn't in the text, use your general knowledge but mention it's not in the notes.
      
      Context Notes: ${text.substring(0, 30000)}`,
    },
    history: history,
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
