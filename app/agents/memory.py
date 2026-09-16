from collections import defaultdict, deque

MAX_MEMORY_MESSAGES = 10
_memory: dict[str, deque[tuple[str, str]]] = defaultdict(lambda: deque(maxlen=MAX_MEMORY_MESSAGES))


def add_to_memory(session_id: str, role: str, content: str) -> None:
    _memory[session_id].append((role, content))


def get_memory(session_id: str) -> str:
    return "\n".join(f"{role.upper()}: {content}" for role, content in _memory.get(session_id, ()))


def clear_memory(session_id: str) -> None:
    _memory.pop(session_id, None)
