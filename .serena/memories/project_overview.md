# V6 Assistant Pro Project

## Purpose
The project is a professional assistant platform (V6 Assistant Pro) with a FastAPI backend and a React/Vite/TailwindCSS frontend. It features logic for assistant interaction, goal tracking, and session management, including confidence scoring and phase detection (Exploration, Narrowing, Implementation, Debugging).

## Tech Stack
- **Backend:** Python 3.12+, FastAPI, OpenAI SDK (for local/custom LLMs), Pydantic.
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS (v4), Framer Motion, Lucide-React.
- **Styling:** Vanilla CSS + TailwindCSS v4.
- **Data Persistence:** JSON files (`v6_goal.json`, `v6_settings.json`, `v6_memory.txt`).

## Codebase Structure
- `/backend/`: FastAPI application.
  - `main.py`: API entry point and routes.
  - `logic.py`: Core assistant logic, confidence scoring, and phase management.
  - `venv/`: Python virtual environment.
- `/frontend/`: React frontend.
  - `src/App.tsx`: Main application component.
  - `src/main.tsx`: React entry point.
  - `tailwind.config.ts`: Tailwind configuration.
- `start.sh`: Shell script to start both backend and frontend.

## Style and Conventions
- **Python:** PEP 8, type hints, FastAPI dependency injection pattern.
- **TypeScript:** Strict typing, functional React components, hooks.
- **CSS:** TailwindCSS classes for styling, Vanilla CSS for custom overrides.
