from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from logic import AssistantLogic
import uvicorn
import json
from fastapi.responses import StreamingResponse

app = FastAPI()

# Enable CORS for the local React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

assistant = AssistantLogic()

# In-memory session store for dependency tracking (uncertain turn numbers per session).
# Keyed by session_id. Cleared automatically when session_id changes or server restarts.
uncertain_sessions: Dict[str, set] = {}

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]]
    model: Optional[str] = None
    base_url: Optional[str] = None
    session_id: Optional[str] = "default"

class GoalUpdate(BaseModel):
    goal: str
    constraints: List[str]

class SettingsUpdate(BaseModel):
    model: str
    base_url: str
    custom_system_prompt: str

@app.get("/status")
def get_status():
    goal = assistant.load_goal()
    return {
        "goal": goal,
        "memory": assistant.load_memory()[-1000:] # Last 1000 chars
    }

@app.get("/settings")
def get_settings():
    return assistant.load_settings()

@app.post("/settings")
def update_settings(settings: SettingsUpdate):
    assistant.save_settings(settings.dict())
    return {"status": "success"}

@app.post("/chat")
async def chat(req: ChatRequest):
    # Update assistant settings if provided in request, otherwise use defaults/persisted
    model = req.model or assistant.model
    # We don't override assistant.base_url here unless we want it to be transient. 
    # For now, let's just use the current assistant state.
    
    turn = len(req.history) // 2 + 1
    goal_state = assistant.load_goal()
    memory = assistant.load_memory()
    
    phase, phase_instr = assistant.detect_phase(req.message, turn)
    conf = assistant.get_confidence_score(req.message)

    sid = req.session_id or "default"
    if sid not in uncertain_sessions:
        uncertain_sessions[sid] = set()
    session_uncertain = uncertain_sessions[sid]

    dep_warning = assistant.get_dependency_warning(turn, session_uncertain)
    system_prompt = assistant.build_system_prompt(goal_state, phase, phase_instr, turn, memory)

    def generate():
        try:
            full_response = ""
            # Yield metadata first (includes dependency warning for frontend to display)
            yield f"METADATA:{json.dumps({'phase': phase, 'confidence': conf, 'dep_warning': dep_warning})}\n"

            # Prepend dependency warning into stream if present
            if dep_warning:
                yield dep_warning

            stream = assistant.client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system_prompt}] + req.history + [{"role": "user", "content": req.message}],
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta:
                    content = getattr(chunk.choices[0].delta, "content", "") or ""
                    full_response += content
                    yield content

            # Post-processing after stream finish
            assistant.update_goal(goal_state, req.message, full_response)
            assistant.save_goal(goal_state)
            assistant.detect_memory_signals(req.message, full_response)

            if assistant.is_response_uncertain(full_response):
                session_uncertain.add(turn)

        except Exception as e:
            yield f"ERROR:{str(e)}"

    return StreamingResponse(generate(), media_type="text/plain")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)