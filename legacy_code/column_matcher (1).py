import re
from rapidfuzz import fuzz, process
from typing import List, Tuple, Optional


def token_ratio(a: str, b: str) -> float:
    """
    Compute the token sort ratio between two strings using rapidfuzz.
    Returns a float between 0 and 100.
    """
    return fuzz.token_sort_ratio(a, b)


def WRatio(a: str, b: str) -> float:
    """
    Compute the weighted ratio (WRatio) between two strings using rapidfuzz.
    Returns a float between 0 and 100.
    """
    return fuzz.WRatio(a, b)


def best_match_score(query: str, choices: List[str], scorer=fuzz.WRatio) -> Tuple[str, float]:
    """
    Find the best matching string from choices for the given query using the provided scorer.
    Returns a tuple of (best_match, score).
    """
    match, score, _ = process.extractOne(query, choices, scorer=scorer)
    return match, score 