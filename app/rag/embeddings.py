import re
from collections import Counter
from math import sqrt


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]{2,}", text.lower())


def get_embedding(text: str):
    """Return a lightweight sparse term-frequency vector for demo retrieval."""
    return Counter(_tokens(text))


def cosine_similarity(a: Counter, b: Counter) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    dot = sum(a[token] * b[token] for token in common)
    norm_a = sqrt(sum(value * value for value in a.values()))
    norm_b = sqrt(sum(value * value for value in b.values()))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0
