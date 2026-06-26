# 🩺 MediGuide AI — Telegram Medical Assistant Workspace

MediGuide AI is a highly specialized medical information assistant. It is designed to act as a resilient, educational health companion that provides structured guidance regarding diseases, symptoms, causes, precautions, and general wellness.

It operates strictly as an educational resource and includes a full **Live Telegram Bot Connection Daemon** combined with an interactive **Web Chat Emulator**.

---

## 🚀 Key Features

*   **⚡ Double-Engine Architecture**: Operates as a dual application:
    *   **Live Telegram Bot**: Polls the real Telegram Bot API directly using `telegraf` and processes inquiries directly inside Telegram.
    *   **Interactive Web Emulator**: A beautifully styled sandbox chat UI that mirrors the exact safety rules and responses.
*   **🚨 Immediate Bypass Emergency Mode**: Custom-engineered regex rules instantly scan user inputs for critical symptoms (e.g., chest pain, shortness of breath, stroke signs). If found, the app bypasses the LLM to deliver immediate warnings to call local emergency dispatchers.
*   **🛡️ Robust Resiliency Failover**: Built-in automatic model cycling to seamlessly transition from `gemini-3.5-flash` to `gemini-3.1-flash-lite` or `gemini-3.1-pro-preview` in case of high-load 503/429 upstream provider spikes.
*   **⚠️ Mandatory Safety Guardrails**: Strict compliance guidelines ensuring the AI never prescribes a dosage, never acts as a licensed physician, and always appends a clear educational medical warning disclaimer.

---

## 🛠️ Setting Up Your Telegram Bot

To launch a live instance of MediGuide AI inside Telegram:

1.  **Start a Chat with BotFather**: Open your Telegram client, search for **@BotFather**, and click **Start**.
2.  **Generate a New Bot**: Send the `/newbot` command.
3.  **Name Your Bot**: Specify a display name (e.g., `MediGuide AI`) and a unique username ending in `_bot` (e.g., `MyMediGuideAI_bot`).
4.  **Copy the API Token**: BotFather will provide an API token (looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
5.  **Activate Polling**: 
    *   Either set `TELEGRAM_BOT_TOKEN` in your application secrets/`.env` file.
    *   Or open the **Web Management Dashboard**, paste your token into the **Telegram configuration panel**, and click **Launch Bot**.

---

## 🧠 Medical System Prompts & Intent Modes

MediGuide AI evaluates incoming requests and responds using one of five highly structured modes:

1.  **🦠 Disease Explanation Mode**: Delivers structured outlines detailing general descriptions, symptoms, underlying causes, risk factors, diagnosis tests, general treatments, and prevention rules.
2.  **🤒 Symptom Analysis Mode**: Evaluates incoming symptoms, provides multiple overlapping possibilities, advises against self-diagnosis, and details critical red flags.
3.  **💊 Medicine Information Mode**: Explains a drug's general purpose, common side effects, and precautions. **Absolutely zero dosage values are ever generated.**
4.  **🌿 Health Tips Mode**: Provides actionable advice on nutritious diets, exercise routines, sleep, and hydration.
5.  **🚨 Emergency Mode**: Delivers an immediate alert warning the user to stop the interaction and call emergency services right away.

---

## ⚙️ Development & Deployment

The system is fully full-stack, powered by **Vite**, **React**, **Express**, and the new `@google/genai` TypeScript SDK.

### Available Scripts

*   `npm run dev` — Boots the Express full-stack daemon with real-time Vite assets and TypeScript execution via `tsx`.
*   `npm run build` — Bundles client assets and pre-compiles the backend server into a single optimized file inside `dist/server.cjs`.
*   `npm run start` — Directly executes the production server.
*   `npm run lint` — Performs strict type checks on all source code.

---

### ⚠️ Disclaimer
*This application is strictly for educational, informational, and sandbox purposes. It does not provide medical diagnoses, treatment advice, or drug prescriptions. Always consult a qualified medical professional for health concerns.*
