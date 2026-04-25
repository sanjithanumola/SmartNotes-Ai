import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// AI Initialization
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// API Routes
app.post("/api/ai/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following text. Provide a short 5-10 line summary, a detailed summary, and key bullet points. Format the output as Markdown.\n\nText: ${text.substring(0, 30000)}`
    });
    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/flashcards", async (req, res) => {
  try {
    const { text } = req.body;
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
    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/quiz", async (req, res) => {
  try {
    const { text, difficulty } = req.body;
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
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/mindmap", async (req, res) => {
  try {
    const { text } = req.body;
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
    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { text, history, message } = req.body;
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are an AI assistant helping a student understand their notes. Use the provided text as context for your answers. Context Notes: ${text.substring(0, 30000)}`,
      },
      history: history,
    });
    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
