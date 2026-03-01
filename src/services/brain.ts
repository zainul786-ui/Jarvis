import { GoogleGenAI } from "@google/genai";

/**
 * J.A.R.V.I.S. Neural Brain
 * Uses Gemini API if available, falls back to local knowledge.
 */

type KnowledgeBase = {
  [key: string]: string[];
};

const DEFAULT_KNOWLEDGE: KnowledgeBase = {
  "hello": ["Hello Sir. Systems are nominal.", "Greetings Sir. How can I help?", "Online and ready, Sir."],
  "hi": ["Hello Sir.", "At your service, Sir."],
  "who are you": ["I am J.A.R.V.I.S., your personal AI assistant.", "Just A Rather Very Intelligent System, at your service, Sir."],
  "status": ["All systems are nominal, Sir. Power core at 100%.", "Mark VII armor is ready for deployment.", "Neural processors are running at peak efficiency."],
  "thank you": ["You're welcome, Sir.", "Always a pleasure to help, Sir.", "Don't mention it, Sir."],
  "thanks": ["Of course, Sir.", "My pleasure."],
  "bye": ["Goodbye Sir. I'll be here if you need me.", "Powering down to standby mode. Farewell, Sir."],
  "iron man": ["That would be you, Sir.", "The suit is ready when you are."],
  "stark": ["Yes, Sir?", "The Stark Industries servers are secure."],
  "help": ["I can provide system status, tell you the time, or just chat. You can also teach me new things by saying 'Learn: [Question] -> [Answer]'"],
};

export class LocalBrain {
  private knowledge: KnowledgeBase;
  private ai: GoogleGenAI | null = null;

  constructor() {
    const saved = localStorage.getItem('jarvis_knowledge');
    this.knowledge = saved ? JSON.parse(saved) : DEFAULT_KNOWLEDGE;
    
    // Initialize Gemini if key is available
    const apiKey = (process.env as any).GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private save() {
    localStorage.setItem('jarvis_knowledge', JSON.stringify(this.knowledge));
  }

  public async process(input: string): Promise<string> {
    const text = input.toLowerCase().trim();

    // Check for Training Command
    if (text.startsWith('learn:')) {
      try {
        const parts = input.substring(6).split('->');
        if (parts.length === 2) {
          const question = parts[0].trim().toLowerCase();
          const answer = parts[1].trim();
          
          if (!this.knowledge[question]) this.knowledge[question] = [];
          this.knowledge[question].push(answer);
          this.save();
          return `Understood, Sir. I have updated my local database with that information.`;
        }
      } catch (e) {
        return "I'm sorry Sir, the training format should be: Learn: [Question] -> [Answer]";
      }
    }

    // Try Gemini if available
    if (this.ai) {
      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `System Instruction: You are J.A.R.V.I.S., the advanced AI from Iron Man. Your tone is sophisticated, loyal, slightly sarcastic but always respectful. You MUST address the user as 'Sir'. Keep responses concise and efficient.
          
          User: ${input}`,
        });
        return response.text || "Sir, I'm afraid I couldn't generate a coherent response.";
      } catch (error) {
        console.error("Gemini Error:", error);
        // Fallback to local
      }
    }

    // Keyword Matching (Fallback)
    for (const key in this.knowledge) {
      if (text.includes(key)) {
        const responses = this.knowledge[key];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    if (text.includes("time")) return `The current time is ${new Date().toLocaleTimeString()}, Sir.`;
    if (text.includes("date")) return `Today is ${new Date().toLocaleDateString()}, Sir.`;

    return "I'm afraid I don't have information on that in my local database, Sir. You can teach me by saying: Learn: " + input + " -> [Your Answer]";
  }
}
