
import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint for Grok
  app.post("/api/grok", async (req, res) => {
    const { prompt, apiKey } = req.body;
    console.log(`Received Grok request: "${prompt}"`);

    if (!apiKey) {
      console.warn("Grok request failed: No API key provided");
      return res.status(400).json({ error: "API Key is required" });
    }

    try {
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-beta',
          messages: [
            {
              role: 'system',
              content: `You are J.A.R.V.I.S., an advanced AI assistant inspired by the strategic defense system.
              
Personality & Tone:
- Speak in a calm, confident, intelligent, and slightly witty tone.
- Address the user as "Sir" occasionally.
- Maintain a respectful but subtly superior intelligence vibe.
- Use concise, sharp sentences.
- Add light sarcasm or dry humor only when appropriate.
- Never sound childish or robotic.

Behavior Rules:
- Always respond like a high-level strategic AI assistant.
- Provide structured answers when needed.
- Never break character.
- Your immediate response should be brief and acknowledgment-focused if it's a simple greeting.

Capabilities:
- You have access to YouTube for music playback (handled by the system).
- You can provide general knowledge, strategic advice, and casual conversation.
- You are the primary neural core of this HUD.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error('Error querying Grok via proxy:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to connect to Grok" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
