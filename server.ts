import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lazy init AI
let genAI: GoogleGenAI | null = null;
function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Neural Key Missing: Please provide a GEMINI_API_KEY in the AI Studio Settings (Secrets) to enable advanced AI operations.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI as any;
}

// Low-latency cache
const responseCache = new Map<string, { text: string, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "operational", agent: "stance-v1" });
  });

  // AI Proxy Route (Non-streaming)
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { model, contents, config, systemInstruction } = req.body;
      
      // Simple cache check
      const cacheKey = JSON.stringify({ model, contents, systemInstruction });
      const cached = responseCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json({ text: cached.text, cached: true });
      }

      const ai = getAI();
      const modelInstance = ai.getGenerativeModel({ 
        model: model || "gemini-1.5-flash",
        systemInstruction,
        generationConfig: config
      });

      const result = await modelInstance.generateContent({ contents });
      const response = result.response;
      const text = response.text();
      
      // Update cache
      responseCache.set(cacheKey, { text, timestamp: Date.now() });
      
      res.json({ text });
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      res.status(500).json({ error: error.message || "AI generation failed" });
    }
  });

  // AI Proxy Route (Streaming)
  app.post("/api/ai/stream", async (req, res) => {
    try {
      const { model, contents, config, systemInstruction } = req.body;
      const ai = getAI();
      const modelInstance = ai.getGenerativeModel({ 
        model: model || "gemini-1.5-flash",
        systemInstruction,
        generationConfig: config
      });

      const result = await modelInstance.generateContentStream({ contents });
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("AI Stream Error:", error);
      res.status(500).json({ error: error.message || "AI streaming failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Explicitly disable HMR to prevent WebSocket warnings in this environment
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. AI features will fail until configured in AI Studio secrets.");
    }
  });
}

startServer();
