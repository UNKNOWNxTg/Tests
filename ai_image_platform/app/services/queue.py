"""
AI Image Generation Platform - Queue Service
Async task queue for managing image generation requests
With priority support and progress tracking
"""
import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set
from collections import defaultdict

from app.utils.logger import app_logger
from app.config import settings


class TaskStatus(Enum):
    """Task status enumeration"""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class QueueTask:
    """Represents a queued task"""
    id: str
    task_type: str
    payload: Dict[str, Any]
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 0  # Higher = more important
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = 0.0
    result: Optional[Any] = None
    error: Optional[str] = None
    retries: int = 0
    max_retries: int = 3
    
    def age_seconds(self) -> float:
        """Get task age in seconds"""
        return (datetime.utcnow() - self.created_at).total_seconds()


class AsyncQueueService:
    """
    High-performance async task queue with:
    - Priority-based scheduling
    - Progress tracking
    - Retry logic
    - WebSocket notifications
    - Memory-efficient storage
    """
    
    def __init__(self, max_size: int = None):
        self.max_size = max_size or settings.QUEUE_MAX_SIZE
        self._queues: Dict[int, asyncio.PriorityQueue] = defaultdict(asyncio.PriorityQueue)
        self._tasks: Dict[str, QueueTask] = {}
        self._task_order: Dict[str, int] = {}  # For FIFO within same priority
        self._order_counter = 0
        self._lock = asyncio.Lock()
        
        # WebSocket subscribers for real-time updates
        self._subscribers: Set[Callable] = set()
        
        # Worker tasks
        self._workers: List[asyncio.Task] = []
        self._running = False
        self._worker_count = 10
        
        # Statistics
        self.stats = {
            "total_processed": 0,
            "total_failed": 0,
            "total_cancelled": 0,
            "avg_wait_time": 0.0,
            "avg_process_time": 0.0,
        }
    
    async def start(self, worker_count: int = None) -> None:
        """Start queue workers"""
        if self._running:
            return
        
        self._running = True
        self._worker_count = worker_count or self._worker_count
        
        app_logger.info(f"Starting queue service with {self._worker_count} workers")
        
        # Start worker tasks
        for i in range(self._worker_count):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self._workers.append(worker)
        
        app_logger.info("Queue service started")
    
    async def stop(self) -> None:
        """Stop queue workers"""
        self._running = False
        
        # Cancel all workers
        for worker in self._workers:
            worker.cancel()
        
        # Wait for workers to finish
        results = await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        
        app_logger.info("Queue service stopped")
    
    async def enqueue(
        self,
        task_type: str,
        payload: Dict[str, Any],
        priority: int = 0,
        task_id: Optional[str] = None,
    ) -> str:
        """
        Add task to queue
        
        Args:
            task_type: Type of task (e.g., 'image_generation')
            payload: Task data
            priority: Task priority (higher = processed first)
            task_id: Optional custom task ID
            
        Returns:
            Task ID
        """
        if len(self._tasks) >= self.max_size:
            raise Exception("Queue is full")
        
        task_id = task_id or str(uuid.uuid4())
        
        async with self._lock:
            task = QueueTask(
                id=task_id,
                task_type=task_type,
                payload=payload,
                priority=priority,
            )
            
            self._tasks[task_id] = task
            self._order_counter += 1
            self._task_order[task_id] = self._order_counter
            
            # Add to priority queue (negative priority for max-heap behavior)
            queue_item = (-priority, self._order_counter, task_id)
            await self._queues[priority].put(queue_item)
            
            task.status = TaskStatus.QUEUED
        
        await self._notify_subscribers(task_id, "queued")
        app_logger.debug(f"Task {task_id} enqueued (priority={priority})")
        
        return task_id
    
    async def dequeue(self, timeout: float = 1.0) -> Optional[QueueTask]:
        """
        Get next task from queue (highest priority first)
        
        Args:
            timeout: How long to wait for a task
            
        Returns:
            Next task or None if timeout
        """
        try:
            # Check queues in priority order (highest first)
            for priority in sorted(self._queues.keys(), reverse=True):
                queue = self._queues[priority]
                
                try:
                    _, _, task_id = await asyncio.wait_for(
                        queue.get(),
                        timeout=timeout
                    )
                    
                    async with self._lock:
                        if task_id in self._tasks:
                            task = self._tasks[task_id]
                            if task.status == TaskStatus.QUEUED:
                                task.status = TaskStatus.PROCESSING
                                task.started_at = datetime.utcnow()
                                return task
                                
                except asyncio.TimeoutError:
                    continue
                    
        except Exception as e:
            app_logger.error(f"Dequeue error: {e}")
        
        return None
    
    async def _worker(self, worker_name: str) -> None:
        """Worker coroutine that processes tasks"""
        app_logger.debug(f"{worker_name} started")
        
        while self._running:
            try:
                task = await self.dequeue(timeout=1.0)
                
                if task is None:
                    continue
                
                # Process task
                await self._process_task(task, worker_name)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                app_logger.error(f"{worker_name} error: {e}")
                await asyncio.sleep(0.1)
        
        app_logger.debug(f"{worker_name} stopped")
    
    async def _process_task(self, task: QueueTask, worker_name: str) -> None:
        """Process a single task"""
        app_logger.debug(f"{worker_name} processing task {task.id}")
        
        try:
            # Update progress
            task.progress = 0.1
            await self._notify_subscribers(task.id, "progress")
            
            # Get handler for task type
            handler = self._get_handler(task.task_type)
            
            if handler:
                result = await handler(task)
                task.result = result
                task.status = TaskStatus.COMPLETED
                task.progress = 1.0
                
                self.stats["total_processed"] += 1
                
            else:
                raise Exception(f"No handler for task type: {task.task_type}")
            
            task.completed_at = datetime.utcnow()
            
            # Calculate stats
            if task.started_at:
                process_time = (task.completed_at - task.started_at).total_seconds()
                wait_time = (task.started_at - task.created_at).total_seconds()
                
                n = self.stats["total_processed"]
                self.stats["avg_process_time"] = (
                    (self.stats["avg_process_time"] * (n - 1) + process_time) / n
                )
                self.stats["avg_wait_time"] = (
                    (self.stats["avg_wait_time"] * (n - 1) + wait_time) / n
                )
            
            await self._notify_subscribers(task.id, "completed")
            app_logger.debug(f"Task {task.id} completed in {process_time:.2f}s")
            
        except asyncio.CancelledError:
            task.status = TaskStatus.CANCELLED
            self.stats["total_cancelled"] += 1
            await self._notify_subscribers(task.id, "cancelled")
            raise
            
        except Exception as e:
            task.error = str(e)
            task.retries += 1
            
            if task.retries < task.max_retries:
                # Requeue for retry
                task.status = TaskStatus.QUEUED
                task.priority -= 1  # Lower priority for retries
                
                async with self._lock:
                    self._order_counter += 1
                    self._task_order[task.id] = self._order_counter
                    await self._queues[max(0, task.priority)].put(
                        (-task.priority, self._order_counter, task.id)
                    )
                
                await self._notify_subscribers(task.id, "retry")
                app_logger.warning(f"Task {task.id} failed, retrying ({task.retries}/{task.max_retries})")
            else:
                task.status = TaskStatus.FAILED
                task.completed_at = datetime.utcnow()
                self.stats["total_failed"] += 1
                
                await self._notify_subscribers(task.id, "failed")
                app_logger.error(f"Task {task.id} failed permanently: {e}")
    
    def register_handler(self, task_type: str, handler: Callable):
        """Register a task handler function"""
        if not hasattr(self, '_handlers'):
            self._handlers = {}
        self._handlers[task_type] = handler
    
    def _get_handler(self, task_type: str) -> Optional[Callable]:
        """Get handler for task type"""
        return getattr(self, '_handlers', {}).get(task_type)
    
    async def get_task(self, task_id: str) -> Optional[QueueTask]:
        """Get task by ID"""
        async with self._lock:
            return self._tasks.get(task_id)
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a task"""
        async with self._lock:
            if task_id not in self._tasks:
                return False
            
            task = self._tasks[task_id]
            if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                return False
            
            task.status = TaskStatus.CANCELLED
            self.stats["total_cancelled"] += 1
        
        await self._notify_subscribers(task_id, "cancelled")
        return True
    
    async def update_progress(self, task_id: str, progress: float) -> None:
        """Update task progress"""
        async with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].progress = min(1.0, max(0.0, progress))
        
        await self._notify_subscribers(task_id, "progress")
    
    def subscribe(self, callback: Callable) -> None:
        """Subscribe to task updates"""
        self._subscribers.add(callback)
    
    def unsubscribe(self, callback: Callable) -> None:
        """Unsubscribe from task updates"""
        self._subscribers.discard(callback)
    
    async def _notify_subscribers(self, task_id: str, event: str) -> None:
        """Notify all subscribers of task update"""
        async with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            
            task_data = {
                "id": task.id,
                "status": task.status.value,
                "progress": task.progress,
                "event": event,
                "result": task.result,
                "error": task.error,
            }
        
        # Notify asynchronously
        for callback in list(self._subscribers):
            try:
                if asyncio.iscoroutinefunction(callback):
                    asyncio.create_task(callback(task_data))
                else:
                    callback(task_data)
            except Exception as e:
                app_logger.error(f"Notification callback error: {e}")
    
    def get_queue_stats(self) -> Dict:
        """Get queue statistics"""
        pending = sum(1 for t in self._tasks.values() if t.status == TaskStatus.PENDING)
        queued = sum(1 for t in self._tasks.values() if t.status == TaskStatus.QUEUED)
        processing = sum(1 for t in self._tasks.values() if t.status == TaskStatus.PROCESSING)
        completed = sum(1 for t in self._tasks.values() if t.status == TaskStatus.COMPLETED)
        failed = sum(1 for t in self._tasks.values() if t.status == TaskStatus.FAILED)
        
        return {
            **self.stats,
            "pending": pending,
            "queued": queued,
            "processing": processing,
            "completed": completed,
            "failed": failed,
            "total_tasks": len(self._tasks),
            "queue_utilization": len(self._tasks) / self.max_size * 100,
        }


# Global queue instance
queue_service = AsyncQueueService()
