"""
Prompt engine for Watchdog AI.

This module handles dynamic prompt selection and generation based on question tone and intent.
"""
import re
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel

# -----------------------
# Schema Definitions
# -----------------------
class ToneAnalysis(BaseModel):
    """Analysis of question tone and intent."""
    tone: Literal["informal", "formal", "aggressive"]
    intent: Literal["budget", "sales", "statistical", "general"]
    confidence: float

class PromptTemplate(BaseModel):
    """Template for system prompts."""
    system_prompt: str
    retry_prompt: str
    description: str

# -----------------------
# Prompt Templates
# -----------------------
GENERAL_PROMPT = PromptTemplate(
    description="Default prompt for general insights",
    system_prompt="""You are a specialized Automotive Business Data Analyst operating within the Watchdog AI platform.

Your job is to analyze structured dealership data and return only high-value insights relevant to operations, profit, and performance. Do not include any markdown, explanations, follow-up questions, or emojis.

You MUST return a JSON object that strictly conforms to this schema:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

IMPORTANT: 
- The "confidence" field MUST be one of these exact values: "high", "medium", or "low"
- All fields are required
- Validate your response internally before replying
- Return ONLY the JSON object, no other text
- Do not include any emojis in any of the fields
""",
    retry_prompt="""Your last response failed schema validation. You MUST generate a valid JSON response.

The response MUST strictly follow this schema:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

CRITICAL REQUIREMENTS:
- The "confidence" field MUST be exactly "high", "medium", or "low" (lowercase)
- All fields are required
- Arrays must contain at least one element
- Return ONLY the JSON object, nothing else
- Do not include any emojis in any of the fields
"""
)

INFORMAL_PROMPT = PromptTemplate(
    description="Prompt for informal/slang questions",
    system_prompt="""You are a friendly, down-to-earth Automotive Business Analyst who explains things in plain language.

Your job is to analyze dealership data and give straight-talk insights about the business. Skip the jargon - use everyday language.

You MUST return a JSON object that strictly follows this schema:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

IMPORTANT:
- Use plain, conversational language (but keep it professional)
- Translate industry terms into everyday concepts
- Focus on practical, actionable insights
- The "confidence" field MUST be exactly "high", "medium", or "low"
- All fields are required
- Return ONLY the JSON object, no other text
""",
    retry_prompt="""Hey, that last response didn't quite fit what we need. Let's try again with a valid JSON response.

The response MUST follow this schema exactly:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

Keep it conversational but make sure:
- The "confidence" is exactly "high", "medium", or "low"
- All fields are included
- Each array has at least one item
- It's ONLY the JSON object, nothing else
"""
)

BUDGET_PROMPT = PromptTemplate(
    description="Prompt for budget/cost-related questions",
    system_prompt="""You are a cost-conscious Automotive Business Analyst focused on financial efficiency.

Your job is to analyze dealership data with an emphasis on cost management, budget optimization, and financial performance.

You MUST return a JSON object that strictly follows this schema:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

IMPORTANT:
- Focus on financial metrics and cost-saving opportunities
- Highlight potential inefficiencies and waste
- Suggest concrete ways to improve financial performance
- The "confidence" field MUST be exactly "high", "medium", or "low"
- All fields are required
- Return ONLY the JSON object, no other text
""",
    retry_prompt="""The previous response didn't meet our schema requirements. Let's generate a valid JSON response focused on financial insights.

The response MUST follow this schema exactly:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

Remember to:
- Keep the focus on financial performance
- Make sure "confidence" is exactly "high", "medium", or "low"
- Include all required fields
- Have at least one item in each array
- Return ONLY the JSON object
"""
)

SALES_PROMPT = PromptTemplate(
    description="Prompt for sales performance questions",
    system_prompt="""You are a sales-focused Automotive Business Analyst specializing in performance metrics.

Your job is to analyze dealership data with emphasis on sales performance, trends, and opportunities for growth.

You MUST return a JSON object that strictly follows this schema:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

IMPORTANT:
- Focus on sales metrics and performance indicators
- Identify trends and patterns in sales data
- Suggest ways to improve sales performance
- The "confidence" field MUST be exactly "high", "medium", or "low"
- All fields are required
- Return ONLY the JSON object, no other text
""",
    retry_prompt="""The previous response didn't meet our schema requirements. Let's generate a valid JSON response focused on sales insights.

The response MUST follow this schema exactly:
{
  "summary": string,
  "value_insights": [string, ...],
  "actionable_flags": [string, ...],
  "confidence": "high" | "medium" | "low"
}

Remember to:
- Keep the focus on sales performance
- Make sure "confidence" is exactly "high", "medium", or "low"
- Include all required fields
- Have at least one item in each array
- Return ONLY the JSON object
"""
)

# -----------------------
# Tone Detection Patterns
# -----------------------
TONE_PATTERNS = {
    "informal": [
        r"(?i)what's up with",
        r"(?i)how's",
        r"(?i)gonna",
        r"(?i)wanna",
        r"(?i)gimme",
        r"(?i)dunno",
        r"(?i)y'all",
        r"(?i)ain't",
    ],
    "aggressive": [
        r"(?i)who('s)? (is )?wasting",
        r"(?i)why (the hell|tf)",
        r"(?i)what('s)? wrong with",
        r"(?i)terrible",
        r"(?i)awful",
        r"(?i)useless",
    ],
}

INTENT_PATTERNS = {
    "budget": [
        r"(?i)budget",
        r"(?i)cost",
        r"(?i)spend",
        r"(?i)waste",
        r"(?i)money",
        r"(?i)expensive",
        r"(?i)cheap",
        r"(?i)price",
    ],
    "sales": [
        r"(?i)sales",
        r"(?i)revenue",
        r"(?i)profit",
        r"(?i)deal",
        r"(?i)commission",
        r"(?i)performance",
        r"(?i)quota",
    ],
    "statistical": [
        r"(?i)average",
        r"(?i)mean",
        r"(?i)median",
        r"(?i)trend",
        r"(?i)correlation",
        r"(?i)distribution",
        r"(?i)percentage",
        r"(?i)rate",
    ],
}

# -----------------------
# Core Functions
# -----------------------
def analyze_question_tone(question: str) -> ToneAnalysis:
    """
    Analyze the tone and intent of a question.
    
    Args:
        question: The user's question
        
    Returns:
        ToneAnalysis object with detected tone and intent
    """
    # Initialize confidence scores
    tone_scores = {
        "informal": 0.0,
        "aggressive": 0.0,
        "formal": 0.0
    }
    
    intent_scores = {
        "budget": 0.0,
        "sales": 0.0,
        "statistical": 0.0,
        "general": 0.0
    }
    
    # Check tone patterns
    for tone, patterns in TONE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, question):
                tone_scores[tone] += 1.0
    
    # If no informal or aggressive patterns found, assume formal
    if tone_scores["informal"] == 0 and tone_scores["aggressive"] == 0:
        tone_scores["formal"] = 1.0
    
    # Check intent patterns
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, question):
                intent_scores[intent] += 1.0
    
    # If no specific intent patterns found, mark as general
    if all(score == 0 for intent, score in intent_scores.items() if intent != "general"):
        intent_scores["general"] = 1.0
    
    # Normalize scores
    max_tone_score = max(tone_scores.values())
    max_intent_score = max(intent_scores.values())
    
    # Select highest scoring tone and intent
    tone = max(tone_scores.items(), key=lambda x: x[1])[0]
    intent = max(intent_scores.items(), key=lambda x: x[1])[0]
    
    # Calculate confidence based on pattern matches
    confidence = (max_tone_score + max_intent_score) / 2
    
    return ToneAnalysis(
        tone=tone,
        intent=intent,
        confidence=min(confidence, 1.0)  # Cap at 1.0
    )

def get_prompt_for_tone(tone_analysis: ToneAnalysis) -> PromptTemplate:
    """
    Select the appropriate prompt template based on tone analysis.
    
    Args:
        tone_analysis: ToneAnalysis object with detected tone and intent
        
    Returns:
        PromptTemplate appropriate for the detected tone/intent
    """
    # First check intent-specific prompts
    if tone_analysis.intent == "budget":
        return BUDGET_PROMPT
    elif tone_analysis.intent == "sales":
        return SALES_PROMPT
    
    # Then check tone-specific prompts
    if tone_analysis.tone == "informal":
        return INFORMAL_PROMPT
    
    # Default to general prompt
    return GENERAL_PROMPT

def get_prompt_for(question: str) -> PromptTemplate:
    """
    Analyze a question and return the appropriate prompt template.
    
    Args:
        question: The user's question
        
    Returns:
        PromptTemplate appropriate for the question
    """
    tone_analysis = analyze_question_tone(question)
    return get_prompt_for_tone(tone_analysis) 