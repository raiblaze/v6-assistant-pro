# Suggested Commands

## Running the Project
- **Start All:** `./start.sh` (runs backend on default FastAPI port and frontend on Vite dev port).
- **Start Backend Only:** `cd backend && ./venv/bin/python3 main.py`
- **Start Frontend Only:** `cd frontend && npm run dev`

## Development Commands
### Frontend
- **Install Dependencies:** `npm install`
- **Build:** `npm run build`
- **Type Check:** `npx tsc`
- **Lint:** (No explicit lint command in package.json, but `eslint` is usually expected if configured).

### Backend
- **Install Dependencies:** `./venv/bin/pip install -r requirements.txt` (if exists)
- **Run Tests:** `python3 -m pytest` (if tests exist)
- **Formatting:** `ruff format .` or `black .`

## System Commands (Darwin)
- `ls -G`: List files with color.
- `grep -r "pattern" .`: Recursive search.
- `find . -name "*.py"`: Find files.
- `git status`: Check git state.
