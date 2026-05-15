"""
AI Image Generation Platform - API Routes
FastAPI REST API endpoints for image generation
"""
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
import orjson

from app.services.image_generation import image_service, GenerationRequest, GenerationResult
from app.services.queue import queue_service, TaskStatus
from app.proxy.manager import proxy_manager
from app.database.connection import get_db
from app.database.models import ImageGeneration, User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

router = APIRouter(prefix="/api/v1", tags=["Image Generation"])


# Request/Response Models
class GenerateImageRequest(BaseModel):
    """Image generation request model"""
    prompt: str = Field(..., min_length=1, max_length=2000, description="Text prompt for image generation")
    negative_prompt: Optional[str] = Field(None, max_length=1000, description="What to exclude from the image")
    width: int = Field(1024, ge=256, le=2048, description="Image width in pixels")
    height: int = Field(1024, ge=256, le=2048, description="Image height in pixels")
    seed: Optional[int] = Field(None, ge=0, le=2**32 - 1, description="Random seed for reproducibility")
    model: str = Field("flux", description="AI model to use")
    steps: Optional[int] = Field(None, ge=1, le=100, description="Number of diffusion steps")
    guidance: Optional[float] = Field(None, ge=0, le=20, description="Guidance scale")
    aspect_ratio: Optional[str] = Field(None, description="Aspect ratio preset (e.g., '16:9', '4:3')")
    priority: int = Field(0, ge=0, le=10, description="Queue priority (higher = faster)")


class GenerateImageResponse(BaseModel):
    """Image generation response model"""
    success: bool
    task_id: Optional[str] = None
    image_url: Optional[str] = None
    generation_time: float = 0.0
    seed_used: Optional[int] = None
    model_used: str = "flux"
    error_message: Optional[str] = None


class BatchGenerateRequest(BaseModel):
    """Batch generation request"""
    prompts: List[str] = Field(..., min_length=1, max_length=20)
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 1024
    seed: Optional[int] = None
    model: str = "flux"


class TaskStatusResponse(BaseModel):
    """Task status response"""
    task_id: str
    status: str
    progress: float
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime = None
    completed_at: datetime = None


class ProxyStatsResponse(BaseModel):
    """Proxy statistics response"""
    healthy_count: int
    total_count: int
    health_percentage: float
    total_fetched: int
    total_checks: int


# Endpoints
@router.post("/generate", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate a single image with the given prompt
    
    Returns immediately with a task_id for tracking progress
    """
    try:
        # Create generation request
        gen_request = GenerationRequest(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            seed=request.seed,
            model=request.model,
            steps=request.steps,
            guidance=request.guidance,
            aspect_ratio=request.aspect_ratio,
        )
        
        # Enqueue task
        task_id = await queue_service.enqueue(
            task_type="image_generation",
            payload=gen_request.__dict__,
            priority=request.priority,
        )
        
        return GenerateImageResponse(
            success=True,
            task_id=task_id,
            model_used=request.model,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/sync", response_model=GenerateImageResponse)
async def generate_image_sync(request: GenerateImageRequest):
    """
    Generate a single image synchronously (waits for completion)
    
    Use this for simple use cases where you want immediate results
    """
    try:
        gen_request = GenerationRequest(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            seed=request.seed,
            model=request.model,
            steps=request.steps,
            guidance=request.guidance,
        )
        
        result = await image_service.generate_image(gen_request)
        
        if result.success:
            return GenerateImageResponse(
                success=True,
                image_url=result.image_url,
                generation_time=result.generation_time,
                seed_used=result.seed_used,
                model_used=result.model_used,
            )
        else:
            return GenerateImageResponse(
                success=False,
                error_message=result.error_message,
                model_used=result.model_used,
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/batch")
async def generate_batch(request: BatchGenerateRequest):
    """
    Generate multiple images in parallel
    
    Returns list of task IDs for tracking
    """
    try:
        gen_requests = [
            GenerationRequest(
                prompt=prompt,
                negative_prompt=request.negative_prompt,
                width=request.width,
                height=request.height,
                seed=request.seed,
                model=request.model,
            )
            for prompt in request.prompts
        ]
        
        # Generate in parallel
        results = await image_service.generate_batch(gen_requests, max_concurrent=10)
        
        successful = sum(1 for r in results if r.success)
        
        return {
            "success": True,
            "total": len(results),
            "successful": successful,
            "failed": len(results) - successful,
            "results": [
                {
                    "prompt": req.prompt,
                    "success": r.success,
                    "image_url": r.image_url,
                    "error": r.error_message,
                }
                for req, r in zip(gen_requests, results)
            ],
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Get status of a generation task"""
    task = await queue_service.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status.value,
        progress=task.progress,
        result={"image_url": task.result.image_url} if task.result and hasattr(task.result, 'image_url') else None,
        error=task.error,
        created_at=task.created_at,
        completed_at=task.completed_at,
    )


@router.post("/task/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a running task"""
    success = await queue_service.cancel_task(task_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Cannot cancel task")
    
    return {"success": True, "message": "Task cancelled"}


@router.websocket("/ws/task/{task_id}")
async def task_websocket(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time task updates"""
    await websocket.accept()
    
    async def send_update(task_data: dict):
        try:
            await websocket.send_json(task_data)
        except:
            pass
    
    try:
        # Subscribe to updates
        queue_service.subscribe(send_update)
        
        # Send current status
        task = await queue_service.get_task(task_id)
        if task:
            await websocket.send_json({
                "id": task.id,
                "status": task.status.value,
                "progress": task.progress,
            })
        
        # Keep connection alive
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
            
    except WebSocketDisconnect:
        pass
    finally:
        queue_service.unsubscribe(send_update)


@router.get("/proxy/stats", response_model=ProxyStatsResponse)
async def get_proxy_stats():
    """Get proxy rotation statistics"""
    stats = proxy_manager.get_stats()
    return ProxyStatsResponse(**stats)


@router.post("/proxy/refresh")
async def refresh_proxies():
    """Manually trigger proxy refresh"""
    count = await proxy_manager.refresh_proxies()
    return {"success": True, "added": count}


@router.get("/stats")
async def get_platform_stats():
    """Get overall platform statistics"""
    image_stats = image_service.get_stats()
    queue_stats = queue_service.get_queue_stats()
    proxy_stats = proxy_manager.get_stats()
    
    return {
        "image_generation": image_stats,
        "queue": queue_stats,
        "proxies": proxy_stats,
    }


@router.get("/models")
async def get_available_models():
    """Get list of available AI models"""
    models = [
        {
            "id": "flux",
            "name": "Flux",
            "description": "High-quality general purpose model",
            "max_resolution": 2048,
            "speed": "fast",
        },
        {
            "id": "flux-realism",
            "name": "Flux Realism",
            "description": "Photorealistic images",
            "max_resolution": 2048,
            "speed": "fast",
        },
        {
            "id": "any-dark",
            "name": "Any Dark",
            "description": "Dark/moody aesthetic",
            "max_resolution": 1536,
            "speed": "medium",
        },
        {
            "id": "midjourney",
            "name": "Midjourney Style",
            "description": "Artistic Midjourney-like style",
            "max_resolution": 2048,
            "speed": "fast",
        },
    ]
    return {"models": models}
