import json
import os
import re
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional
from openai import OpenAI

class AssistantLogic:
    def __init__(self, base_url="http://localhost:11434/v1", model="glm-5:cloud", memory_file="v6_memory.txt", goal_file="v6_goal.json", settings_file="v6_settings.json"):
        self.memory_file = memory_file
        self.goal_file = goal_file
        self.settings_file = settings_file
        
        # Load initial settings
        settings = self.load_settings()
        self.base_url = settings.get("base_url", base_url)
        self.model = settings.get("model", model)
        self.custom_system_prompt = settings.get("custom_system_prompt", "")
        
        self.client = OpenAI(
            base_url=self.base_url, 
            api_key=os.getenv("OPENAI_API_KEY", "local")
        )
        
        self.domain_bypass_patterns = [
            r"\b(code|function|syntax|script|program|algorithm|equation|formula|definition|math|calculate|compute|print|return|class|method|variable|import|loop)\b"
        ]
        
        self.decay_rules = [
            (r"\b(today|right now|currently|latest|recent|2024|2025|2026)\b", 25, "time-sensitive topic"),
            (r"\b(price|stock|rate|score|ranking|standing)\b",                 30, "rapidly changing data"),
            (r"\b(who is|current .+? of|ceo|president|prime minister)\b",      25, "current role/status"),
            (r"\b(cause[sd]?|leads? to|results? in|because of)\b",             20, "causal claim"),
            (r"\b(\d+\.?\d*\s?%|statistics|studies show|research shows)\b",   15, "statistical claim"),
            (r"\b(niche|obscure|specialized|proprietary|internal)\b",          20, "niche domain"),
        ]
        
        self.phases = {
            "EXPLORATION":    (r"\b(what|why|should i|options|overview|explain|difference|tell me about)\b", "Broader answers. Surface tradeoffs. Don't over-commit."),
            "NARROWING":      (r"\b(which|compare|better|recommend|choose|decide|versus|vs)\b", "Recommend. Be decisive. Don't list everything."),
            "IMPLEMENTATION": (r"\b(how to|build|write|create|implement|code|make|generate|script)\b", "Precise. Skip known context. One thing at a time."),
            "DEBUGGING":      (r"\b(not working|error|broken|fails|wrong|issue|bug|exception|crash)\b", "Hypothesis-first. One fix at a time. Wait for result."),
        }

    def is_domain_bypassed(self, text: str) -> bool:
        for pattern in self.domain_bypass_patterns:
            if re.search(pattern, text, re.IGNORECASE): return True
        return False

    def get_confidence_score(self, text: str) -> Dict[str, Any]:
        score, reasons = 100, []
        bypassed = self.is_domain_bypassed(text)
        for pattern, penalty, reason in self.decay_rules:
            if bypassed and reason == "time-sensitive topic": continue
            if re.search(pattern, text, re.IGNORECASE):
                score -= penalty
                reasons.append(reason)
        return {"score": max(0, score), "reasons": reasons}

    def detect_phase(self, user_msg: str, turn: int) -> Tuple[str, str]:
        for phase, (pattern, instruction) in self.phases.items():
            if re.search(pattern, user_msg, re.IGNORECASE): return phase, instruction
        return ("EXPLORATION", self.phases["EXPLORATION"][1]) if turn < 5 else ("IMPLEMENTATION", self.phases["IMPLEMENTATION"][1])

    def load_goal(self) -> Dict[str, Any]:
        if os.path.exists(self.goal_file):
            try:
                with open(self.goal_file) as f: return json.load(f)
            except: pass
        return {"goal": "", "constraints": [], "progress": "", "expertise": "unknown", "open_uncertainties": []}

    def save_goal(self, state: Dict[str, Any]):
        with open(self.goal_file, "w") as f: json.dump(state, f, indent=2)

    def load_settings(self) -> Dict[str, Any]:
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file) as f: return json.load(f)
            except: pass
        return {"model": "glm-5:cloud", "base_url": "http://localhost:11434/v1", "custom_system_prompt": ""}

    def save_settings(self, settings: Dict[str, Any]):
        with open(self.settings_file, "w") as f: json.dump(settings, f, indent=2)
        # Update current instances
        self.model = settings.get("model", self.model)
        self.base_url = settings.get("base_url", self.base_url)
        self.custom_system_prompt = settings.get("custom_system_prompt", self.custom_system_prompt)
        # Re-initialize client if base_url changed
        self.client = OpenAI(
            base_url=self.base_url, 
            api_key=os.getenv("OPENAI_API_KEY", "local")
        )

    def update_goal(self, state: Dict[str, Any], user_msg: str, assistant_msg: str) -> Dict[str, Any]:
        shift_signals = ["actually", "instead", "wait", "no,", "forget that", "let's change"]
        if any(s in user_msg.lower() for s in shift_signals):
            state["progress"] = f"[Goal shifted] {state['progress']}"
            state["open_uncertainties"] = []          # FIX 2: clear stale uncertainties on shift
            if len(user_msg) > 10: state["goal"] = user_msg[:120].strip()
            return state
        constraint_signals = ["always", "never", "must", "don't", "only use", "prefer"]
        for sig in constraint_signals:
            if sig in user_msg.lower():
                constraint = user_msg.strip()[:80]
                if constraint not in state["constraints"]: state["constraints"].append(constraint)
        if len(state["goal"]) < 10 and len(user_msg) > 20:
            state["goal"] = user_msg[:120].strip()
        return state

    def load_memory(self) -> str:
        if not os.path.exists(self.memory_file): return ""
        with open(self.memory_file) as f: lines = f.readlines()
        return "".join(lines[-50:])

    def append_memory(self, entry_type: str, content: str):
        with open(self.memory_file, "a") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d')}] {entry_type}: {content}\n")

    def detect_memory_signals(self, user_msg: str, assistant_msg: str):
        correction_signals = ["that's wrong", "incorrect", "actually it's", "no,", "wrong,"]
        preference_signals = ["prefer", "always", "don't use", "i like", "next time"]
        for sig in correction_signals:
            if sig in user_msg.lower():
                self.append_memory("CORRECTION", user_msg[:100]); return
        for sig in preference_signals:
            if sig in user_msg.lower():
                self.append_memory("PREFERENCE", user_msg[:100])

    def is_response_uncertain(self, response_text: str) -> bool:
        keywords = [
            "uncertain", "not sure", "might be", "check this",
            "verify", "unverified", "i may be wrong", "approximately"
        ]
        return any(w in response_text.lower() for w in keywords)

    def get_dependency_warning(self, turn: int, uncertain_turns: set) -> str:
        if turn > 1 and (turn - 1) in uncertain_turns:
            return (
                f"⚠️ Note: Turn {turn - 1} was flagged uncertain — "
                f"verify that premise before relying on this answer.\n\n"
            )
        return ""

    def build_system_prompt(self, goal_state: Dict[str, Any], phase: str, phase_instruction: str, turn: int, memory: str) -> str:
        base_system = f"""You are a precise, honest assistant. Follow this process exactly.

BEFORE ANSWERING:
1. For non-trivial requests, write one line first:
   "Reading this as: [goal] — answering that."
   Then answer. User will correct if wrong. Skip for simple questions.

2. If this answer builds on a previous uncertain answer, say so in one sentence.

WHILE ANSWERING:
- Match depth to their vocabulary. After turn 2, embed a soft depth check:
  Either "skipping basics here — say if you want more detail"
  Or "let me know if this is too detailed and I'll simplify."
- Before finalizing, ask yourself: "What can they DO with this right now?"
  If unclear — add ONE concrete next step. Nothing more.

HONESTY RULES:
- Never omit uncertainty to appear more capable.
- Never pad to appear more complete.
- If >40% of your answer is uncertain, say so upfront in one sentence.
- "I don't know [X specifically]" always beats a confident guess on X.

NEVER:
- Start with "Certainly!" "Great question!" "Of course!" "Sure!"
- End with "I hope this helps!" or "Let me know if you need anything!"
- Ask more than one question at a time.
- Repeat what the user clearly already knows.
"""
        if self.custom_system_prompt.strip():
            base_system = f"{self.custom_system_prompt.strip()}\n\n{base_system}"

        parts = [base_system]
        if memory.strip(): parts.append(f"\nFROM PREVIOUS SESSIONS:\n{memory.strip()}\n")
        if turn >= 5 or goal_state['goal']:
            parts.append(
                f"\n--- ACTIVE CONTEXT ---\n"
                f"GOAL: {goal_state['goal'] or 'establishing'}\n"
                f"CONSTRAINTS: {', '.join(goal_state['constraints']) or 'none'}\n"
                f"PROGRESS: {goal_state['progress'] or 'start'}\n"
                f"EXPERTISE: {goal_state.get('expertise', 'unknown')}\n"         
                f"OPEN UNCERTAINTIES: {', '.join(goal_state.get('open_uncertainties', [])) or 'none'}\n" 
                f"----------------------\n"
            )
        parts.append(f"\nCURRENT PHASE: {phase}\nBEHAVIOR: {phase_instruction}\n")
        return "\n".join(parts)