"""
Data analysis utilities for Watchdog AI.

This module handles analyzing dealership data using AI-powered understanding.
"""
import pandas as pd
import logging
from typing import Dict, Any, List, Optional
from app.services.llm_service import _analyze_query

logger = logging.getLogger("watchdog.analyzer")

def analyze_data(df: pd.DataFrame, query: str) -> Dict[str, Any]:
    """
    Analyze data based on natural language query using AI understanding.
    
    Args:
        df: DataFrame to analyze
        query: Natural language query about the data
        
    Returns:
        Dictionary containing analysis results
    """
    logger.info(f"Analyzing data for query: {query}")
    
    try:
        # Get AI to analyze the query and determine what to calculate
        analysis_plan = _analyze_query({
            "query": query,
            "columns": list(df.columns),
            "sample_data": df.head().to_dict(orient='records')
        })
        
        # Execute the analysis plan
        results = execute_analysis_plan(df, analysis_plan)
        
        return results
        
    except Exception as e:
        logger.error(f"Error analyzing data: {str(e)}")
        raise

def execute_analysis_plan(df: pd.DataFrame, plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an AI-generated analysis plan.
    """
    results = {}
    
    try:
        # Execute each analysis step
        for step in plan["steps"]:
            if step["type"] == "aggregation":
                # Handle aggregations (sum, mean, count, etc.)
                results[step["name"]] = execute_aggregation(df, step)
                
            elif step["type"] == "grouping":
                # Handle grouping operations
                results[step["name"]] = execute_grouping(df, step)
                
            elif step["type"] == "filtering":
                # Handle filtering operations
                df = execute_filtering(df, step)
                
            elif step["type"] == "ranking":
                # Handle ranking/sorting operations
                results[step["name"]] = execute_ranking(df, step)
        
        # Add any chart data if requested
        if plan.get("chart_type"):
            results["chart_data"] = generate_chart_data(df, plan["chart_type"], results)
            results["chart_type"] = plan["chart_type"]
        
        return results
        
    except Exception as e:
        logger.error(f"Error executing analysis plan: {str(e)}")
        raise

def execute_aggregation(df: pd.DataFrame, step: Dict[str, Any]) -> Any:
    """Execute an aggregation step."""
    try:
        if step["operation"] == "sum":
            return df[step["column"]].sum()
        elif step["operation"] == "mean":
            return df[step["column"]].mean()
        elif step["operation"] == "count":
            return len(df)
        elif step["operation"] == "unique":
            return df[step["column"]].nunique()
        else:
            raise ValueError(f"Unknown aggregation operation: {step['operation']}")
    except Exception as e:
        logger.error(f"Error in aggregation: {str(e)}")
        return None

def execute_grouping(df: pd.DataFrame, step: Dict[str, Any]) -> pd.DataFrame:
    """Execute a grouping step."""
    try:
        grouped = df.groupby(step["group_by"])
        
        if step["operation"] == "sum":
            return grouped[step["column"]].sum()
        elif step["operation"] == "mean":
            return grouped[step["column"]].mean()
        elif step["operation"] == "count":
            return grouped.size()
        else:
            raise ValueError(f"Unknown grouping operation: {step['operation']}")
    except Exception as e:
        logger.error(f"Error in grouping: {str(e)}")
        return pd.DataFrame()

def execute_filtering(df: pd.DataFrame, step: Dict[str, Any]) -> pd.DataFrame:
    """Execute a filtering step."""
    try:
        if step["operation"] == "equals":
            return df[df[step["column"]] == step["value"]]
        elif step["operation"] == "greater_than":
            return df[df[step["column"]] > step["value"]]
        elif step["operation"] == "less_than":
            return df[df[step["column"]] < step["value"]]
        elif step["operation"] == "contains":
            return df[df[step["column"]].str.contains(step["value"], case=False, na=False)]
        else:
            raise ValueError(f"Unknown filtering operation: {step['operation']}")
    except Exception as e:
        logger.error(f"Error in filtering: {str(e)}")
        return df

def execute_ranking(df: pd.DataFrame, step: Dict[str, Any]) -> pd.DataFrame:
    """Execute a ranking step."""
    try:
        sorted_df = df.sort_values(step["column"], ascending=not step["descending"])
        if step.get("limit"):
            return sorted_df.head(step["limit"])
        return sorted_df
    except Exception as e:
        logger.error(f"Error in ranking: {str(e)}")
        return pd.DataFrame()

def generate_chart_data(df: pd.DataFrame, chart_type: str, results: Dict[str, Any]) -> Dict[str, Any]:
    """Generate chart data based on results."""
    try:
        if chart_type == "bar":
            # Find the first grouping result
            for key, value in results.items():
                if isinstance(value, (pd.Series, pd.DataFrame)):
                    return {
                        "labels": value.index.tolist(),
                        "datasets": [{
                            "label": key,
                            "data": value.values.tolist()
                        }]
                    }
            
            # If no grouping results found, try to use aggregation results
            numeric_results = {k: v for k, v in results.items() 
                             if isinstance(v, (int, float)) and k != "chart_type"}
            if numeric_results:
                return {
                    "labels": list(numeric_results.keys()),
                    "datasets": [{
                        "label": "Values",
                        "data": list(numeric_results.values())
                    }]
                }
        
        # Return empty chart data if no suitable data found
        return {"labels": [], "datasets": []}
    except Exception as e:
        logger.error(f"Error generating chart data: {str(e)}")
        return {"labels": [], "datasets": []}
