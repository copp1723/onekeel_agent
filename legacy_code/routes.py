"""
API routes for the Watchdog AI application.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
import uuid
import os
import json
from typing import Optional, Dict, List, Any

from app.api.models import (
    UploadResponse, 
    AnalysisRequest, 
    AnalysisResponse, 
    QuestionRequest, 
    QuestionResponse,
    BatchInsightResponse,
    InsightItem
)
from app.services.data_loader import load_csv_file
from app.services.data_cleaner import clean_data
from app.services.analyzer import analyze_data
from app.services.insight_engine import generate_insight, format_response, generate_batch_insights
from app.services.chart_generator import generate_chart
from app.core.config import settings

router = APIRouter()

def get_metadata_path(upload_id: str) -> str:
    """Get the path to the metadata file for an upload."""
    return os.path.join(settings.UPLOAD_DIR, f"{upload_id}_metadata.json")

def save_metadata(upload_id: str, metadata: Dict) -> None:
    """Save metadata to a file."""
    metadata_path = get_metadata_path(upload_id)
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f)

def load_metadata(upload_id: str) -> Optional[Dict]:
    """Load metadata from a file."""
    metadata_path = get_metadata_path(upload_id)
    try:
        with open(metadata_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

@router.post("/upload", response_model=UploadResponse)
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile):
    """
    Upload a CSV file for analysis.
    
    The file will be saved and processed immediately, and an upload ID will be returned
    for use in subsequent analysis requests.
    """
    # Validate file type
    if not file.filename.endswith(('.csv', '.CSV')):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    # Generate unique ID for this upload
    upload_id = str(uuid.uuid4())
    
    # Create file path and ensure directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"{upload_id}.csv")
    
    try:
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Load and validate CSV
        df, mapping = load_csv_file(file_path)
        
        # Clean data immediately (simplified version)
        cleaned_df = clean_data(df)
        
        # Save processed data
        processed_path = os.path.join(settings.UPLOAD_DIR, f"{upload_id}_processed.csv")
        cleaned_df.to_csv(processed_path, index=False)
        
        # Store metadata
        metadata = {
            "file_path": file_path,
            "processed_path": processed_path,
            "original_filename": file.filename,
            "row_count": len(cleaned_df),
            "column_count": len(cleaned_df.columns),
            "processed": True,  # Mark as processed immediately
            "column_mapping": mapping
        }
        save_metadata(upload_id, metadata)
        
        # Schedule batch insights generation
        background_tasks.add_task(process_batch_insights, upload_id)
        
        return UploadResponse(
            upload_id=upload_id,
            filename=file.filename,
            row_count=len(cleaned_df),
            column_count=len(cleaned_df.columns),
            column_mapping=mapping
        )
    
    except Exception as e:
        # Clean up files if there was an error
        if os.path.exists(file_path):
            os.remove(file_path)
        if os.path.exists(get_metadata_path(upload_id)):
            os.remove(get_metadata_path(upload_id))
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

async def process_batch_insights(upload_id: str):
    """
    Generate batch insights for an uploaded file.
    """
    try:
        # Get metadata
        metadata = load_metadata(upload_id)
        if not metadata:
            logger.error(f"No metadata found for upload {upload_id}")
            return
        
        # Load processed data
        df = load_csv_file(metadata["processed_path"])
        # No need to convert to string, generate_batch_insights loads the file itself

        # Generate batch insights (await the coroutine)
        try:
            insights_dict = await generate_batch_insights(upload_id)
        except ValueError as ve:
            logger.error(f"Validation error in batch insights for upload {upload_id}: {ve}")
            raise HTTPException(status_code=422, detail=f"Validation error: {ve}")
        except Exception as e:
            logger.error(f"Error generating batch insights for upload {upload_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error generating batch insights: {e}")

        # Save insights to metadata (convert dict to list of items for frontend)
        metadata["batch_insights"] = [
            {
                "title": insight.get("summary", "No summary available"),
                "description": insight.get("summary", "No summary available"),
                "metrics": [
                    {"name": "Confidence", "value": insight.get("confidence", "low")},
                    {"name": "Action Items", "value": len(insight.get("actionItems", []))}
                ],
                "actionItems": insight.get("actionItems", [])
            }
            for insight in insights_dict.values()
        ]
        save_metadata(upload_id, metadata)

    except HTTPException:
        # Already logged and raised above, just propagate
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating batch insights for upload {upload_id}: {e}")
        # Do not raise HTTPException here, just log (background task)
        # Optionally, could store error in metadata for later retrieval

@router.get("/batch_insights/{upload_id}", response_model=BatchInsightResponse)
async def get_batch_insights(upload_id: str):
    """
    Get batch insights for an uploaded file.
    """
    # Get metadata
    metadata = load_metadata(upload_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Check if batch insights exist
    if "batch_insights" not in metadata:
        raise HTTPException(status_code=404, detail="Batch insights not yet generated")
    
    return BatchInsightResponse(
        upload_id=upload_id,
        insights=metadata["batch_insights"]
    )

def process_uploaded_file(upload_id: str):
    """
    Process an uploaded file in the background.
    
    This includes cleaning the data and preparing it for analysis.
    """
    try:
        # Get metadata
        metadata = load_metadata(upload_id)
        if not metadata:
            return
        
        # Load data
        df = load_csv_file(metadata["file_path"])
        
        # Clean data
        cleaned_df = clean_data(df)
        
        # Save processed data
        processed_path = os.path.join(settings.UPLOAD_DIR, f"{upload_id}_processed.csv")
        cleaned_df.to_csv(processed_path, index=False)
        
        # Update metadata
        metadata["processed"] = True
        metadata["processed_path"] = processed_path
        save_metadata(upload_id, metadata)
    
    except Exception as e:
        # Log error but don't raise exception (background task)
        print(f"Error processing file {upload_id}: {str(e)}")


@router.post("/analyze/{upload_id}", response_model=AnalysisResponse)
async def analyze(
    upload_id: str,
    request: AnalysisRequest,
):
    """
    Analyze uploaded data based on the specified intent.
    
    Returns insights and optionally a chart URL.
    """
    # Get metadata
    metadata = load_metadata(upload_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Check if file has been processed
    if not metadata.get("processed", False):
        raise HTTPException(status_code=400, detail="File is still being processed")
    
    try:
        # Load processed data
        df = load_csv_file(metadata["processed_path"])
        
        # Convert DataFrame to string for LLM processing
        data_str = df.to_string()
        
        # Generate insights using new format
        insight = generate_insight(request.intent, data_str)
        if not insight:
            raise HTTPException(status_code=500, detail="Failed to generate insights")
            
        # Format response for frontend
        response_data = format_response(insight)
        
        # Generate chart if needed
        if response_data.get("chart_data"):
            chart_filename = f"{upload_id}_{request.intent}.png"
            response_data["chart_url"] = generate_chart(
                response_data["chart_data"],
                chart_filename,
                chart_type=response_data.get("chart_type", "bar")
            )
        
        return AnalysisResponse(
            insights=[{
                "title": "Analysis Results",
                "description": response_data["answer"],
                "actionItems": response_data["actionItems"]
            }],
            chart_url=response_data.get("chart_url")
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing data: {str(e)}")


@router.post("/question/{upload_id}", response_model=QuestionResponse)
async def ask_question(
    upload_id: str,
    request: QuestionRequest,
):
    """
    Answer a specific question about the uploaded data.
    
    Returns an answer, insights, and optionally a chart URL.
    """
    # Get metadata
    metadata = load_metadata(upload_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Check if file has been processed
    if not metadata.get("processed", False):
        raise HTTPException(status_code=400, detail="File is still being processed")
    
    try:
        # Load processed data
        df = load_csv_file(metadata["processed_path"])
        
        # Convert DataFrame to string for LLM processing
        data_str = df.to_string()
        
        # Generate insights using new format
        insight = generate_insight(request.question, data_str)
        if not insight:
            raise HTTPException(status_code=500, detail="Failed to generate insights")
            
        # Format response for frontend
        response_data = format_response(insight)
        
        return QuestionResponse(
            answer=response_data["answer"],
            insights=response_data["insights"],
            actionItems=response_data["actionItems"],
            confidence=response_data["confidence"],
            metrics=response_data["metrics"],
            chart_url=response_data["chart_url"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "ok"}

@router.get("/v1/batch_insights/{upload_id}")
async def get_batch_insights(upload_id: str) -> Dict:
    """
    Get batch insights for a specific upload
    """
    try:
        insights = await generate_batch_insights(upload_id)
        return {"insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/v1/batch_insights/{upload_id}/{question_id}")
async def get_single_insight(upload_id: str, question_id: str) -> Dict:
    """
    Get a single insight for a specific question
    """
    try:
        insight = await generate_batch_insights(upload_id, single_question_id=question_id)
        return insight.get(question_id, {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
