"""
AI Image Generation Platform - Image Generation Service
High-performance async image generation using Pollinations API
With proxy support, retry logic, and parallel processing
"""
import asyncio
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, AsyncGenerator
from pathlib import Path
import hashlib

import httpx
from app.config import settings
from app.utils.logger import app_logger
from app.proxy.manager import proxy_manager


@dataclass
class GenerationRequest:
    """Image generation request parameters"""
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 1024
    seed: Optional[int] = None
    model: str = "flux"
    steps: Optional[int] = None
    guidance: Optional[float] = None
    aspect_ratio: Optional[str] = None
    
    def to_url_params(self) -> Dict[str, str]:
        """Convert to URL query parameters"""
        params = {
            "prompt": self.prompt,
            "width": str(self.width),
            "height": str(self.height),
            "model": self.model,
            "nologo": "true",
        }
        
        if self.negative_prompt:
            params["negative_prompt"] = self.negative_prompt
        
        if self.seed is not None:
            params["seed"] = str(self.seed)
        
        if self.steps is not None:
            params["steps"] = str(self.steps)
        
        if self.guidance is not None:
            params["guidance"] = str(self.guidance)
        
        return params
    
    @property
    def cache_key(self) -> str:
        """Generate unique cache key for this request"""
        param_str = f"{self.prompt}:{self.width}:{self.height}:{self.seed}:{self.model}"
        return hashlib.md5(param_str.encode()).hexdigest()


@dataclass
class GenerationResult:
    """Image generation result"""
    success: bool
    image_url: Optional[str] = None
    image_data: Optional[bytes] = None
    error_message: Optional[str] = None
    generation_time: float = 0.0
    proxy_used: Optional[str] = None
    seed_used: Optional[int] = None
    model_used: str = "flux"


class ImageGenerationService:
    """
    High-performance async image generation service with:
    - Parallel request handling
    - Proxy rotation
    - Automatic retries
    - Connection pooling
    - Response streaming
    """
    
    def __init__(self):
        self._client_pool: Optional[httpx.AsyncClient] = None
        self._request_semaphore = asyncio.Semaphore(50)  # Max concurrent requests
        self._retry_delays = [1.0, 2.0, 4.0, 8.0]  # Exponential backoff
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_generation_time": 0.0,
        }
    
    async def start(self) -> None:
        """Initialize HTTP client pool"""
        # Create high-performance HTTP client
        self._client_pool = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.POLLINATIONS_TIMEOUT, connect=10.0),
            limits=httpx.Limits(
                max_connections=settings.CONNECTION_POOL_SIZE,
                max_keepalive_connections=50,
            ),
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
        app_logger.info("ImageGenerationService started")
    
    async def stop(self) -> None:
        """Close HTTP client pool"""
        if self._client_pool:
            await self._client_pool.aclose()
        app_logger.info("ImageGenerationService stopped")
    
    async def generate_image(
        self,
        request: GenerationRequest,
        use_proxy: bool = True,
        return_data: bool = False,
    ) -> GenerationResult:
        """
        Generate a single image with retry logic and proxy support
        
        Args:
            request: Generation parameters
            use_proxy: Whether to use proxy rotation
            return_data: Return image bytes instead of URL
            
        Returns:
            GenerationResult with image data or error
        """
        self.stats["total_requests"] += 1
        start_time = time.perf_counter()
        
        excluded_proxies = []
        last_error = None
        
        for attempt in range(settings.POLLINATIONS_MAX_RETRIES):
            try:
                async with self._request_semaphore:
                    # Get proxy if enabled
                    proxy_info = None
                    if use_proxy and settings.PROXY_ENABLED:
                        proxy_info = await proxy_manager.get_proxy(exclude=excluded_proxies)
                    
                    # Build request URL
                    base_url = f"{settings.POLLINATIONS_BASE_URL}/prompt/{request.prompt}"
                    params = request.to_url_params()
                    
                    # Make request
                    result = await self._make_request(
                        base_url=base_url,
                        params=params,
                        proxy=proxy_info,
                        return_data=return_data,
                    )
                    
                    # Report proxy success/failure
                    elapsed = time.perf_counter() - start_time
                    
                    if result.success:
                        if proxy_info:
                            await proxy_manager.report_success(
                                proxy_info.url, 
                                elapsed * 1000
                            )
                        
                        result.generation_time = elapsed
                        result.seed_used = request.seed or result.seed_used
                        result.model_used = request.model
                        
                        self.stats["successful_requests"] += 1
                        self.stats["total_generation_time"] += elapsed
                        
                        app_logger.debug(
                            f"Image generated in {elapsed:.2f}s "
                            f"(proxy: {proxy_info.ip if proxy_info else 'direct'})"
                        )
                        
                        return result
                    else:
                        if proxy_info:
                            await proxy_manager.report_failure(proxy_info.url)
                            excluded_proxies.append(f"{proxy_info.ip}:{proxy_info.port}")
                        
                        last_error = result.error_message
                        
            except Exception as e:
                last_error = str(e)
                app_logger.warning(f"Generation attempt {attempt + 1} failed: {e}")
                
                if attempt < len(self._retry_delays) - 1:
                    await asyncio.sleep(self._retry_delays[attempt])
        
        # All retries failed
        elapsed = time.perf_counter() - start_time
        self.stats["failed_requests"] += 1
        
        app_logger.error(f"Image generation failed after all retries: {last_error}")
        
        return GenerationResult(
            success=False,
            error_message=last_error or "Unknown error",
            generation_time=elapsed,
            model_used=request.model,
        )
    
    async def _make_request(
        self,
        base_url: str,
        params: Dict[str, str],
        proxy: Optional = None,
        return_data: bool = False,
    ) -> GenerationResult:
        """Make single HTTP request to Pollinations API"""
        try:
            # Build URL with params
            url = base_url
            query_parts = []
            for key, value in params.items():
                query_parts.append(f"{key}={httpx.URL(value)}")
            
            if query_parts:
                url = f"{url}?{'&'.join(query_parts)}"
            
            # Configure proxy
            proxies = proxy.proxy_dict if proxy else None
            
            # Make request
            response = await self._client_pool.get(
                url,
                proxies=proxies,
            )
            
            if response.status_code == 200:
                if return_data:
                    return GenerationResult(
                        success=True,
                        image_data=response.content,
                        seed_used=params.get("seed"),
                        model_used=params.get("model", "flux"),
                    )
                else:
                    # Return URL that can be used directly
                    return GenerationResult(
                        success=True,
                        image_url=url,
                        seed_used=params.get("seed"),
                        model_used=params.get("model", "flux"),
                    )
            else:
                return GenerationResult(
                    success=False,
                    error_message=f"HTTP {response.status_code}: {response.text[:200]}",
                )
                
        except httpx.TimeoutException as e:
            return GenerationResult(
                success=False,
                error_message=f"Timeout: {str(e)}",
            )
        except httpx.ProxyError as e:
            return GenerationResult(
                success=False,
                error_message=f"Proxy error: {str(e)}",
            )
        except Exception as e:
            return GenerationResult(
                success=False,
                error_message=f"Request failed: {str(e)}",
            )
    
    async def generate_batch(
        self,
        requests: List[GenerationRequest],
        use_proxy: bool = True,
        max_concurrent: int = 10,
    ) -> List[GenerationResult]:
        """
        Generate multiple images in parallel
        
        Args:
            requests: List of generation requests
            use_proxy: Whether to use proxy rotation
            max_concurrent: Maximum concurrent generations
            
        Returns:
            List of GenerationResult objects
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def generate_with_semaphore(request: GenerationRequest) -> GenerationResult:
            async with semaphore:
                return await self.generate_image(request, use_proxy=use_proxy)
        
        tasks = [generate_with_semaphore(req) for req in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to GenerationResult
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(GenerationResult(
                    success=False,
                    error_message=str(result),
                    generation_time=0.0,
                ))
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def generate_stream(
        self,
        request: GenerationRequest,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream image data as it arrives
        
        Yields:
            Chunks of image data
        """
        try:
            base_url = f"{settings.POLLINATIONS_BASE_URL}/prompt/{request.prompt}"
            params = request.to_url_params()
            
            url = base_url
            query_parts = []
            for key, value in params.items():
                query_parts.append(f"{key}={httpx.URL(value)}")
            
            if query_parts:
                url = f"{url}?{'&'.join(query_parts)}"
            
            async with self._client_pool.stream("GET", url) as response:
                if response.status_code == 200:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        yield chunk
                else:
                    raise Exception(f"HTTP {response.status_code}")
                    
        except Exception as e:
            app_logger.error(f"Stream generation failed: {e}")
            raise
    
    def get_stats(self) -> Dict:
        """Get service statistics"""
        total = self.stats["total_requests"]
        success = self.stats["successful_requests"]
        
        return {
            **self.stats,
            "success_rate": (success / total * 100) if total > 0 else 0,
            "avg_generation_time": (
                self.stats["total_generation_time"] / success
                if success > 0 else 0
            ),
        }


# Global service instance
image_service = ImageGenerationService()
