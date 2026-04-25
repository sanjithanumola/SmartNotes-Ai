import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const summarizeText = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following text. Provide a short 5-10 line summary, a detailed summary, and key bullet points. Format the output as Markdown.\n\nText: ${text.substring(0, 30000)}`
  });
  return response.text;
};

export const generateFlashcards = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a list of flashcards (Question and Answer) based on the following text. Return the result as a JSON array of objects with "question" and "answer" properties.\n\nText: ${text.substring(0, 20000)}`,
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
    }
  });
  return JSON.parse(response.text || "[]");
};

export const generateQuiz = async (text: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a quiz based on the following text. Include 5 MCQs, 3 True/False, and 2 short answers. Difficulty: ${difficulty}. Return the result as a JSON object.\n\nText: ${text.substring(0, 20000)}`,
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
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateMindMap = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a hierarchical mind map structure of the key concepts in the following text. Return a JSON object representing a tree structure. Each node should have a "name" and an optional "children" array. Limit to 3 levels deep. \n\nText: ${text.substring(0, 20000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          children: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                children: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                    },
                    required: ["name"],
                  },
                },
              },
              required: ["name"],
            },
          },
        },
        required: ["name"],
      },
    }
  });
  return JSON.parse(response.text || "[]");
};

export const chatWithNotes = async (text: string, history: any[], message: string) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `You are an AI assistant helping a student understand their notes. Use the provided text as context for your answers. Context Notes: ${text.substring(0, 30000)}`,
    },
    history: history,
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};
