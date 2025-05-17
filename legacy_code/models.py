"""
API models for request and response validation.
"""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Response model for file upload endpoint."""
    upload_id: str
    filename: str
    row_count: int
    column_count: int
    column_mapping: Optional[Dict[str, str]] = None


class AnalysisRequest(BaseModel):
    """Request model for data analysis endpoint."""
    intent: str = Field(
        default="general_analysis",
        description="Analysis intent (e.g., 'sales_analysis', 'profit_analysis')"
    )


class InsightMeta(BaseModel):
    """Metadata for insight traceability, including column mapping and normalization."""
    column_mapping: Optional[list[dict]] = None
    lead_source_normalization: Optional[list[dict]] = None


class InsightItem(BaseModel):
    """Model for a single insight item, including meta for traceability."""
    title: str
    description: str
    metrics: Optional[List[Dict[str, Any]]] = None
    actionItems: Optional[List[str]] = None
    meta: Optional[InsightMeta] = None


class AnalysisResponse(BaseModel):
    """Response model for data analysis endpoint."""
    insights: List[InsightItem]
    chart_url: Optional[str] = None
    html: Optional[str] = None


class QuestionRequest(BaseModel):
    """Request model for question answering endpoint."""
    question: str


class MetricItem(BaseModel):
    """Model for a metric item."""
    name: str
    value: Any


class QuestionResponse(BaseModel):
    """Response model for question answering endpoint."""
    answer: str
    insights: Optional[List[str]] = None
    actionItems: Optional[List[str]] = None
    confidence: Optional[str] = None
    metrics: Optional[List[Dict[str, Any]]] = None
    chart_url: Optional[str] = None


class BatchInsightResponse(BaseModel):
    """Response model for batch insights endpoint."""
    insights: List[InsightItem]
    upload_id: str


class ErrorResponse(BaseModel):
    """Response model for error responses."""
    detail: str
    code: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
