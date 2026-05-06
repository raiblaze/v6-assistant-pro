# V6 Assistant Pro

**V6 Assistant Pro** is a high-performance, transparent AI assistant platform. It combines a **FastAPI** backend with a modern **React/Vite/TailwindCSS v4** frontend, designed to provide users with deep insight into the assistant's decision-making process, confidence levels, and conversational context.

---

## 🚀 Key Features

### 🧠 Dynamic Behavioral Logic
- **Phase Detection:** Automatically shifts behavior between **EXPLORATION**, **NARROWING**, **IMPLEMENTATION**, and **DEBUGGING** based on your queries.
- **Confidence Scoring:** Real-time analysis of response reliability (0-100) using custom decay rules for time-sensitivity, statistical claims, and domain expertise.
- **Dependency Tracking:** Tracks "uncertain" turns and warns you (⚠️) if a later answer relies on an unverified premise.

### 🎯 Goal & Constraint Management
- **Autonomous Extraction:** Persists your **Current Objective** and **System Constraints** across sessions.
- **Shift Signals:** Automatically updates goals when you say "actually", "instead", or "forget that".

### 🎨 Visual & UX Excellence
- **Glassmorphism Interface:** A high-contrast, professional UI with blue glow effects and animated panels via **Framer Motion**.
- **Real-time Metadata:** Phase badges, confidence alerts, and low-reliability warnings streamed directly to the UI.
- **Context Sidebar:** Live view of the goal state, constraints, and raw context memory.

---

## 🛠️ Tech Stack

### **Backend**
- **Python 3.12+** & **FastAPI**
- **OpenAI SDK** (configured for local LLMs via Ollama or custom providers)
- **Pydantic** (data validation)
- **Uvicorn** (ASGI server)

### **Frontend**
- **React 18** & **TypeScript**
- **Vite** (build tool)
- **TailwindCSS v4** & **Vanilla CSS**
- **Framer Motion** & **Lucide-React**
- **React-Markdown** & **Syntax-Highlighter** (Prism)

---

## 📂 Project Structure

```text
/
├── backend/            # FastAPI application
│   ├── main.py         # API entry point & routes
│   ├── logic.py        # Core AssistantLogic (scoring, phases, memory)
│   └── venv/           # Python virtual environment
├── frontend/           # React application
│   ├── src/App.tsx     # Main application & streaming logic
│   ├── src/main.tsx    # React entry point
│   └── tailwind.config.ts
├── start.sh            # Universal launcher script
├── v6_goal.json        # Persistent goal/constraint state
├── v6_settings.json    # LLM configuration (model, base_url, system prompt)
└── test_api.py         # API testing utility
```

---

## 🚦 Getting Started

### **Prerequisites**
- **Python 3.12+**
- **Node.js & npm**
- An OpenAI-compatible LLM provider (e.g., **Ollama** running locally on port 11434).

### **Installation**

1.  **Clone the repository.**
2.  **Setup Backend:**
    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt  # Ensure requirements.txt exists or install manually:
    # pip install fastapi uvicorn pydantic openai requests
    ```
3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

### **Running the Application**

Simply run the provided launcher script from the root directory:
```bash
chmod +x start.sh
./start.sh
```
This will start:
- **Backend:** `http://localhost:8000`
- **Frontend:** `http://localhost:5173` (typically)

---

## ⚙️ Configuration

### **Settings (`v6_settings.json`)**
Modify this file to point the assistant to your preferred model:
- `model`: Target model name (e.g., `gpt-4`, `glm-5:cloud`).
- `base_url`: API endpoint (default: `http://localhost:11434/v1` for Ollama).
- `custom_system_prompt`: High-level directives (e.g., "You are a helpful assistant name Katy.").

### **Goal Persistence (`v6_goal.json`)**
This file tracks your progress and constraints. It can be manually edited or will be updated automatically by the assistant's logic.

---

## 🧪 Testing

Use the `test_api.py` script to verify that your backend and LLM provider are communicating correctly:
```bash
python3 test_api.py
```

---

## 📄 License
This project is licensed for professional use under the **V6 Pro Edition** standards.
