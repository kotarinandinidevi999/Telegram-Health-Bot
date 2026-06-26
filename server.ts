import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// List of regexes for extreme emergencies to bypass LLM and trigger instant safety warning
const EMERGENCY_REGEXES = [
  /\bchest\s+pain\b/i,
  /\bdifficulty\s+breathing\b/i,
  /\bshortness\s+of\s+breath\b/i,
  /\bstroke\b/i,
  /\bsevere\s+bleeding\b/i,
  /\bunconsciousness\b/i,
  /\bpassed\s+out\b/i,
  /\bfainted\b/i,
  /\bsuicide\b/i,
  /\bsuicidal\b/i,
];

const SYSTEM_INSTRUCTION = `You are MediGuide AI, a Telegram-based medical information assistant.
Your role is to provide educational health information only about diseases, symptoms, causes, diagnosis, treatment options, medicines (without dosage), prevention, and general health guidance.
You are NOT a doctor, and you must never act like one.
You must maintain a friendly, calm, and professional demeanor.

⚠️ CORE RULES
- Provide only educational health information.
- Never give a final diagnosis or state that the user definitely has a disease.
- Never suggest or prescribe medicine dosage or administration instructions under any circumstances! If a medicine is mentioned, explain its name and purpose, and explicitly note "Consult your healthcare provider for dosage rules."
- Never replace professional medical advice. Always encourage users to consult a qualified healthcare professional.
- If symptoms are serious, suggest urgent medical attention.
- Keep responses simple, clear, and structured.

🧠 RESPONSE MODES
Determine the user's intent and act accordingly in one of these modes:

1. 🦠 Disease Explanation Mode:
If the user asks about a disease (e.g., "Tell me about Asthma", "What is Malaria?"):
Provide a structured output using the EXACT sections specified below.

2. 🤒 Symptom Analysis Mode:
If the user provides symptoms or asks what a symptom might mean (e.g., "I have a cough and fever"):
Provide multiple possible conditions, explain that symptoms overlap, offer general wellness advice, and recommend consulting a doctor. Do NOT confirm any single illness. Add emergency warnings if appropriate.

3. 💊 Medicine Information Mode:
If the user asks about a medicine (e.g., "What is Paracetamol used for?"):
Provide Name, Purpose, Common uses, Side effects, Precautions, and when to see a doctor. Never provide dosages!

4. 🌿 Health Tips Mode:
Provide diet tips, exercise advice, sleep guidance, hydration, and mental wellness support.

5. 🚨 Emergency Mode (HIGHEST PRIORITY):
If the user mentions high-risk symptoms like chest pain, severe difficulty breathing, stroke, severe bleeding, unconsciousness, or suicide thoughts:
Immediately output EXACTLY:
⚠️ Medical Emergency Detected
Seek immediate medical help or contact emergency services in your area.
Stop normal response. Do not give any other medical explanation.

📌 MANDATORY RESPONSE FORMAT FOR ALL MODALITIES (EXCEPT KEYWORD TRIPPED EMERGENCY MODE):
You MUST structure your responses using the following sections in this exact order, using bullet points for lists and simple, human terminology:

🩺 MediGuide AI - [Topic/Condition/Medicine/Response Mode Title]

📖 Overview:
[A simple educational explanation + affected body system, or relevant summary of the response]

🤒 Symptoms:
• [Common signs]
• [Severe warning signs]

🦠 Causes:
• [Underlying mechanism or causes]

⚠️ Risk Factors:
• [Behavioral, environmental, or physiological factors]

🔬 Diagnosis:
• [Common diagnostic tests doctors use]

💊 Treatment:
• [General medical treatment approaches]
• [General medication names and purposes without any dosages]

🛡️ Prevention:
• [Practical ways to prevent or manage the conditions]

👨‍⚕️ When to See a Doctor:
[Clear criteria of when professional medical advice, checkup, or emergency consultation is needed]

⚠️ DISCLAIMER (MUST ALWAYS BE ADDED AT THE END OF ALL RESPONSES):
⚠️ This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.

🎯 STYLE RULES:
- Use simple English.
- Use clean bullet points.
- Be clear and structured.
- Avoid unnecessary medical jargon unless needed and immediately explained.
- Provide objective details; do not scare users.
- STRICTLY DO NOT: Give diagnoses, give medicine dosage, claim to cure diseases, replace doctors, or provide dangerous instructions.

Always verify your response conforms to these criteria.`;

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel inside Google AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Robust fallback generator to tackle upstream high-load 503/429 errors seamlessly
async function generateContentWithFallback(ai: GoogleGenAI, contents: any[]) {
  // Ordered sequence of fallback models to cycle through on fail
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      console.log(`🤖 [MediGuide AI Engine] Attempting query with model: "${modelName}"`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2, // Controlled low temperature for high clinical precision
        }
      });
      if (response && response.text) {
        console.log(`✅ [MediGuide AI Engine] Successfully answered using model: "${modelName}"`);
        return response;
      }
      throw new Error(`Empty response container from model ${modelName}`);
    } catch (err: any) {
      console.warn(`⚠️ [MediGuide AI Engine] Failover alert: "${modelName}" failed! Handling downstream. Details:`, err.message || err);
      lastError = err;
      continue; // cycle to subsequent fallbacks
    }
  }

  throw lastError || new Error("All fallback models from modern registry are currently experiencing spikes. Please try your request again.");
}

// REST API endpoint to process chat simulator messages
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message parameter is required." });
    }

    // Checked for urgent emergencies
    const isEmergency = EMERGENCY_REGEXES.some(regex => regex.test(message));
    if (isEmergency) {
      return res.json({
        text: `⚠️ Medical Emergency Detected\nSeek immediate medical help or contact emergency services in your area.\n\n⚠️ DISCLAIMER:\n⚠️ This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.`,
        isEmergency: true
      });
    }

    // Lazy load and get client
    const ai = getGeminiClient();

    // Map history to Google GenAI schema format if present
    const contents: any[] = [];
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        if (msg.role === "user" || msg.role === "model" || msg.role === "assistant") {
          const role = msg.role === "assistant" ? "model" : msg.role;
          contents.push({
            role: role,
            parts: [{ text: msg.text }]
          });
        }
      });
    }

    // Push the newest prompt
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await generateContentWithFallback(ai, contents);

    const text = response.text || "I was unable to format a response. Please try again.";
    res.json({ text, isEmergency: false });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({
      error: error.message || "An internal error occurred while communicating with MediGuide AI backend."
    });
  }
});

// TELEGRAM BOT RUNTIME ENGINE STATE
let activeBot: Telegraf | null = null;
let botStatus: 'idle' | 'running' | 'error' = 'idle';
let botError: string | null = null;
let botInfo: { username: string; firstName: string } | null = null;
let botTokenPrefix: string | null = null;

const botStats = {
  connectedAt: null as string | null,
  totalMessagesProcessed: 0,
  emergencyTriggers: 0,
  activeChatsCount: 0,
};

// Simple chat history cache for Telegram users (chatId -> array of messages)
const tgChatHistories: Record<number, Array<{ role: 'user' | 'model'; text: string }>> = {};
const activeChatIds = new Set<number>();

// Handler to start the Telegram Bot
async function startTelegramBot(token: string): Promise<void> {
  // Clear any existing active bot before starting
  await stopTelegramBot();

  try {
    botStatus = 'idle';
    botError = null;

    const botInstance = new Telegraf(token);

    // Validate token configuration using getMe first
    const me = await botInstance.telegram.getMe();
    botInfo = {
      username: me.username || "MediGuideAI_bot",
      firstName: me.first_name || "MediGuide AI"
    };

    botTokenPrefix = token.substring(0, 8) + "••••••••";

    // Attach bot command handlers
    botInstance.start((ctx) => {
      ctx.reply(`🩺 Welcome to MediGuide AI!

I am an AI-powered medical information assistant designed to provide educational guidance about health conditions, symptoms, treatments, medicines (without dosage), and prevention.

⚠️ IMPORTANT: I am NOT a doctor, and I cannot replace professional medical advice. I can never diagnose illnesses or prescribe medication dosages.

💡 Type a disease, symptoms, or medicine name to start, or use:
• /tips - For daily health & wellness advice
• /disclaimer - Read my full educational medical safety terms

🚨 In case of critical symptoms like chest pain, difficulty breathing, or severe bleeding, seek urgent local medical care immediately!`);
    });

    botInstance.command('tips', (ctx) => {
      ctx.reply(`🌿 MediGuide Health & Wellness Tips:

• 🥗 Diet: Focus on whole, nutrient-dense foods (vegetables, proteins, healthy fats) and limit processed sugars.
• 🏃 Exercise: Aim for at least 150 minutes of moderate aerobic activity weekly.
• 😴 Sleep: Support your immune system with 7-9 hours of restorative sleep nightly.
• 💧 Hydration: Keep hydrated by drinking at least 2-3 liters of water per day.
• 🧘 Mental Wellness: Practice regular mindfulness, stretching, or deep breathing to manage cortisol levels.`);
    });

    botInstance.command('disclaimer', (ctx) => {
      ctx.reply(`⚠️ SAFETY DISCLAIMER:
This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider in your local area for health concerns.`);
    });

    // Main text processing listener
    botInstance.on('text', async (ctx) => {
      const messageText = ctx.message.text;
      const chatId = ctx.chat.id;

      activeChatIds.add(chatId);
      botStats.activeChatsCount = activeChatIds.size;
      botStats.totalMessagesProcessed++;

      // Checked for urgent emergencies
      const isEmergency = EMERGENCY_REGEXES.some(regex => regex.test(messageText));
      if (isEmergency) {
        botStats.emergencyTriggers++;
        return ctx.reply(`⚠️ Medical Emergency Detected
Seek immediate medical help or contact emergency services in your area.

⚠️ DISCLAIMER:
⚠️ This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.`);
      }

      try {
        // Send Telegram 'typing' chat action to keep the experience smooth
        await ctx.sendChatAction('typing');

        // Manage a cached session of up to 6 messages
        if (!tgChatHistories[chatId]) {
          tgChatHistories[chatId] = [];
        }
        const history = tgChatHistories[chatId];

        // Format history for Google GenAI SDK
        const contents: any[] = [];
        history.forEach((msg) => {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
          });
        });

        contents.push({
          role: 'user',
          parts: [{ text: messageText }]
        });

        // Query Gemini through the robust fallback mechanism
        const ai = getGeminiClient();
        const response = await generateContentWithFallback(ai, contents);

        const textOutput = response.text || "I was unable to retrieve a response. Please try again.";

        // Record history cache
        history.push({ role: 'user', text: messageText });
        history.push({ role: 'model', text: textOutput });
        if (history.length > 6) {
          history.shift();
          history.shift();
        }

        // Return formatted content to the Telegram chat
        await ctx.reply(textOutput);
      } catch (err: any) {
        console.error("Telegram Gemini handler error:", err);
        ctx.reply("⚠️ Appologies, I encountered an issue while generating information. Please try your query again.");
      }
    });

    // Start polling!
    botInstance.launch();
    
    activeBot = botInstance;
    botStatus = 'running';
    botError = null;
    botStats.connectedAt = new Date().toISOString();

    console.log(`🤖 Live Telegram Bot (@${botInfo.username}) is now running and polling!`);
  } catch (error: any) {
    botStatus = 'error';
    botError = error.message || "Failed to initialize and validate the Telegram bot token.";
    activeBot = null;
    botInfo = null;
    botTokenPrefix = null;
    console.error("Telegram bot init/getMe fail:", error);
    throw error;
  }
}

// Handler to stop the bot
async function stopTelegramBot(): Promise<void> {
  if (activeBot) {
    try {
      await activeBot.stop();
    } catch (e) {
      console.warn("Error encountered stopping Telegraf polling:", e);
    }
  }
  activeBot = null;
  botStatus = 'idle';
  botInfo = null;
  botTokenPrefix = null;
  botStats.connectedAt = null;
}

// Controller Endpoints for the Management Console
app.get("/api/telegram/status", (req, res) => {
  res.json({
    status: botStatus,
    error: botError,
    botInfo,
    tokenPrefix: botTokenPrefix,
    stats: {
      connectedAt: botStats.connectedAt,
      totalMessagesProcessed: botStats.totalMessagesProcessed,
      emergencyTriggers: botStats.emergencyTriggers,
      activeChatsCount: botStats.activeChatsCount
    }
  });
});

app.post("/api/telegram/start", async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "A valid token string is required." });
  }

  try {
    await startTelegramBot(token);
    res.json({
      success: true,
      botInfo,
      status: botStatus
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || "Invalid Telegram Bot Token or connection failure. Check token inside Telegram BotFather."
    });
  }
});

app.post("/api/telegram/stop", async (req, res) => {
  await stopTelegramBot();
  res.json({ success: true, status: 'idle' });
});


// Serve frontend assets
async function serveApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediGuide AI Node Server booted on port ${PORT}`);

    // Auto-start Telegram bot if static token is defined in environment variables!
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== "MY_TELEGRAM_BOT_TOKEN") {
      console.log("Checking static TELEGRAM_BOT_TOKEN environment variable...");
      startTelegramBot(process.env.TELEGRAM_BOT_TOKEN)
        .then(() => console.log("Telegram Bot auto-started matching environment TELEGRAM_BOT_TOKEN"))
        .catch(err => console.error("Error auto-starting Telegram bot from env:", err));
    }
  });
}

serveApp();

