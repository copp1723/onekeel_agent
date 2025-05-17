"""
Simplified data cleaning utilities for Watchdog AI.
"""
import pandas as pd
import numpy as np
import re
import logging
from typing import Dict, Any, List, Optional
from app.utils.column_matcher import best_match_score, token_ratio
from app.utils.schema_config import LEAD_SOURCES
from app.core.config import settings

logger = logging.getLogger("watchdog.data_cleaner")

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Basic cleaning and normalization of a DataFrame.
    
    Args:
        df: DataFrame to clean
        
    Returns:
        Cleaned DataFrame
    """
    logger.info(f"Basic cleaning of DataFrame with {len(df)} rows and {len(df.columns)} columns")
    
    # Create a copy to avoid modifying the original
    cleaned_df = df.copy()
    
    # Normalize column names to snake_case
    cleaned_df.columns = [to_snake_case(col) for col in cleaned_df.columns]
    
    # Basic cleaning: remove leading/trailing whitespace from string columns
    for col in cleaned_df.select_dtypes(include=['object']).columns:
        cleaned_df[col] = cleaned_df[col].str.strip() if cleaned_df[col].dtype == 'object' else cleaned_df[col]
    
    # Handle missing values
    cleaned_df = cleaned_df.fillna('')
    
    logger.info(f"Basic cleaning complete. DataFrame has {len(cleaned_df)} rows and {len(cleaned_df.columns)} columns")
    
    return cleaned_df

def to_snake_case(name: str) -> str:
    """Convert a string to snake_case."""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', str(name))
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
    s3 = re.sub(r'[^a-zA-Z0-9]', '_', s2)
    return re.sub(r'_+', '_', s3).lower().strip('_')

def normalize_lead_sources(df: pd.DataFrame):
    """
    Normalize fuzzy lead source variants to a canonical set using fuzzy matching.
    Modifies the DataFrame in place and returns it.
    """
    # Find the lead source column (case-insensitive, snake_case, etc.)
    lead_source_col = None
    possible_names = ["LeadSource", "lead_source", "lead source", "Lead Source"]
    for col in df.columns:
        if col.lower().replace(" ", "_") in [n.lower().replace(" ", "_") for n in possible_names]:
            lead_source_col = col
            break
    if not lead_source_col:
        logger.warning("No lead source column found for normalization.")
        return df

    # Build alias-to-canonical mapping
    alias_to_canonical = {}
    for src in LEAD_SOURCES:
        for alias in src["aliases"]:
            alias_to_canonical[alias] = src["name"]
        alias_to_canonical[src["name"]] = src["name"]
    candidates = list(alias_to_canonical.keys())

    normalization_meta = []
    def normalize_value(val):
        if pd.isnull(val) or not isinstance(val, str):
            return val
        match, score = best_match_score(val, candidates, scorer=token_ratio)
        if score >= 85:
            normalization_meta.append({
                "original_value": val,
                "normalized_to": alias_to_canonical[match],
                "score": score
            })
            if settings.DEBUG_MAPPINGS:
                logger.info(f'Mapped lead source value "{val}" to "{alias_to_canonical[match]}" (score: {score:.1f})')
            return alias_to_canonical[match]
        normalization_meta.append({
            "original_value": val,
            "normalized_to": val,
            "score": score
        })
        if settings.DEBUG_MAPPINGS:
            logger.info(f'No good mapping for lead source value "{val}" (best: "{match}", score: {score:.1f})')
        return val
    df[lead_source_col] = df[lead_source_col].apply(normalize_value)
    logger.info(f"Normalized lead source values in column '{lead_source_col}'.")
    return df, normalization_meta
