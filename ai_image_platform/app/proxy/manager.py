"""
AI Image Generation Platform - Async Proxy Manager
High-performance proxy rotation with parallel health checking
Optimized for maximum speed and reliability
"""
import asyncio
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import random

import httpx
from app.config import settings
from app.utils.logger import app_logger


@dataclass
class ProxyInfo:
    """Proxy information with health metrics"""
    ip: str
    port: int
    protocol: str = "http"
    country: Optional[str] = None
    anonymity: Optional[str] = None
    health_score: float = 1.0
    response_time: Optional[float] = None
    last_checked: Optional[datetime] = None
    last_used: Optional[datetime] = None
    failures: int = 0
    successes: int = 0
    is_active: bool = True
    
    @property
    def url(self) -> str:
        """Get proxy URL format"""
        return f"{self.protocol}://{self.ip}:{self.port}"
    
    @property
    def proxy_dict(self) -> Dict[str, str]:
        """Get proxy dict for httpx/requests"""
        return {
            "http://": self.url,
            "https://": self.url,
        }
    
    def calculate_health(self) -> float:
        """Calculate health score based on success/failure ratio"""
        total = self.successes + self.failures
        if total == 0:
            return 1.0
        
        success_rate = self.successes / total
        recency_bonus = 1.0
        
        if self.last_checked:
            age = datetime.utcnow() - self.last_checked
            if age > timedelta(minutes=30):
                recency_bonus = max(0.5, 1.0 - (age.total_seconds() / 3600))
        
        self.health_score = success_rate * recency_bonus
        return self.health_score


class AsyncProxyManager:
    """
    High-performance async proxy manager with:
    - Parallel proxy fetching from multiple sources
    - Concurrent health checking
    - Smart rotation based on health scores
    - Auto-refresh mechanism
    - Memory-efficient storage
    """
    
    def __init__(self):
        self.proxies: Dict[str, ProxyInfo] = {}
        self._lock = asyncio.Lock()
        self._refresh_task: Optional[asyncio.Task] = None
        self._running = False
        self._health_check_semaphore = asyncio.Semaphore(settings.PROXY_MAX_CONCURRENT_CHECKS)
        
        # Performance metrics
        self.stats = {
            "total_fetched": 0,
            "total_healthy": 0,
            "total_checks": 0,
            "avg_response_time": 0.0,
        }
    
    async def start(self) -> None:
        """Start the proxy manager and background refresh task"""
        if self._running:
            return
        
        self._running = True
        app_logger.info("Starting AsyncProxyManager...")
        
        # Initial fetch
        await self.refresh_proxies()
        
        # Start background refresh
        self._refresh_task = asyncio.create_task(self._auto_refresh())
        app_logger.info(f"Proxy manager started with {len(self.proxies)} proxies")
    
    async def stop(self) -> None:
        """Stop the proxy manager"""
        self._running = False
        
        if self._refresh_task:
            self._refresh_task.cancel()
            try:
                await self._refresh_task
            except asyncio.CancelledError:
                pass
        
        app_logger.info("Proxy manager stopped")
    
    async def _auto_refresh(self) -> None:
        """Background task to auto-refresh proxies"""
        while self._running:
            try:
                await asyncio.sleep(settings.PROXY_REFRESH_INTERVAL)
                
                if len(self.get_healthy_proxies()) < settings.PROXY_MIN_HEALTHY:
                    app_logger.info("Low healthy proxy count, triggering refresh...")
                    await self.refresh_proxies()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                app_logger.error(f"Proxy refresh error: {e}")
    
    async def refresh_proxies(self) -> int:
        """
        Fetch proxies from all sources in parallel
        Returns number of new proxies added
        """
        start_time = time.perf_counter()
        new_proxies = set()
        
        async def fetch_source(source_url: str) -> set:
            """Fetch proxies from a single source"""
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(settings.PROXY_TIMEOUT, connect=5.0),
                    limits=httpx.Limits(max_connections=50),
                ) as client:
                    response = await client.get(source_url)
                    response.raise_for_status()
                    
                    proxies = self._parse_proxy_list(response.text)
                    new_proxies.update(proxies)
                    
                    app_logger.debug(f"Fetched {len(proxies)} proxies from {source_url[:50]}")
                    return proxies
                    
            except Exception as e:
                app_logger.warning(f"Failed to fetch from {source_url[:50]}: {e}")
                return set()
        
        # Fetch from all sources in parallel
        tasks = [fetch_source(source) for source in settings.PROXY_SOURCES]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Parse and add new proxies
        added_count = 0
        async with self._lock:
            for proxy_key in new_proxies:
                if proxy_key not in self.proxies:
                    ip, port, protocol = proxy_key.split(":")
                    self.proxies[proxy_key] = ProxyInfo(
                        ip=ip,
                        port=int(port),
                        protocol=protocol,
                    )
                    added_count += 1
            
            self.stats["total_fetched"] = len(self.proxies)
        
        elapsed = time.perf_counter() - start_time
        app_logger.info(f"Proxy refresh completed: +{added_count} proxies in {elapsed:.2f}s")
        
        # Validate proxies asynchronously
        await self._validate_proxies_parallel()
        
        return added_count
    
    def _parse_proxy_list(self, text: str) -> set:
        """Parse proxy list from various formats"""
        proxies = set()
        
        # Pattern for IP:PORT or IP:PORT:PROTOCOL
        patterns = [
            r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{2,5})(?::(http|https|socks4|socks5))?',
        ]
        
        for line in text.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    ip = match.group(1)
                    port = match.group(2)
                    protocol = (match.group(3) or 'http').lower()
                    
                    # Validate IP and port ranges
                    if self._is_valid_proxy(ip, int(port)):
                        proxies.add(f"{ip}:{port}:{protocol}")
                    break
        
        return proxies
    
    def _is_valid_proxy(self, ip: str, port: int) -> bool:
        """Basic validation of proxy IP and port"""
        # Check IP format
        parts = ip.split('.')
        if len(parts) != 4:
            return False
        
        try:
            if not all(0 <= int(part) <= 255 for part in parts):
                return False
        except ValueError:
            return False
        
        # Check port range
        if not (1 <= port <= 65535):
            return False
        
        return True
    
    async def _validate_proxies_parallel(self) -> None:
        """Validate all proxies in parallel with semaphore"""
        app_logger.info(f"Validating {len(self.proxies)} proxies...")
        start_time = time.perf_counter()
        
        async def check_proxy(proxy_info: ProxyInfo) -> bool:
            """Check single proxy health"""
            async with self._health_check_semaphore:
                return await self._check_single_proxy(proxy_info)
        
        # Create tasks for all active proxies
        tasks = [
            check_proxy(proxy) 
            for proxy in self.proxies.values() 
            if proxy.is_active
        ]
        
        if not tasks:
            return
        
        # Execute all checks in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Update stats
        healthy_count = sum(1 for r in results if r is True)
        self.stats["total_healthy"] = healthy_count
        self.stats["total_checks"] = len(results)
        
        elapsed = time.perf_counter() - start_time
        app_logger.info(
            f"Validation complete: {healthy_count}/{len(results)} healthy "
            f"in {elapsed:.2f}s ({len(results)/elapsed:.0f} checks/s)"
        )
    
    async def _check_single_proxy(self, proxy: ProxyInfo) -> bool:
        """Check if a single proxy is working"""
        test_url = "https://httpbin.org/ip"
        
        try:
            start = time.perf_counter()
            
            async with httpx.AsyncClient(
                proxies=proxy.proxy_dict,
                timeout=httpx.Timeout(5.0, connect=3.0),
                limits=httpx.Limits(max_connections=1),
                follow_redirects=True,
            ) as client:
                response = await client.get(test_url)
                response.raise_for_status()
                
                elapsed = time.perf_counter() - start
                proxy.response_time = elapsed * 1000  # ms
                proxy.last_checked = datetime.utcnow()
                proxy.successes += 1
                proxy.failures = 0
                proxy.is_active = True
                
                proxy.calculate_health()
                
                return True
                
        except Exception:
            proxy.failures += 1
            proxy.last_checked = datetime.utcnow()
            
            # Deactivate after 3 failures
            if proxy.failures >= 3:
                proxy.is_active = False
            
            proxy.calculate_health()
            return False
    
    async def get_proxy(self, exclude: Optional[List[str]] = None) -> Optional[ProxyInfo]:
        """
        Get best available proxy using weighted random selection
        Excludes specified proxies
        """
        async with self._lock:
            healthy = [
                p for key, p in self.proxies.items()
                if p.is_active and p.health_score > 0.5 and key not in (exclude or [])
            ]
            
            if not healthy:
                return None
            
            # Weight by health score
            weights = [p.health_score for p in healthy]
            selected = random.choices(healthy, weights=weights, k=1)[0]
            
            selected.last_used = datetime.utcnow()
            return selected
    
    def get_healthy_proxies(self) -> List[ProxyInfo]:
        """Get list of all healthy proxies"""
        return [
            p for p in self.proxies.values()
            if p.is_active and p.health_score > 0.5
        ]
    
    async def report_failure(self, proxy_url: str) -> None:
        """Report proxy failure for health adjustment"""
        async with self._lock:
            for key, proxy in self.proxies.items():
                if proxy.url == proxy_url:
                    proxy.failures += 1
                    proxy.calculate_health()
                    
                    if proxy.failures >= 5:
                        proxy.is_active = False
                        app_logger.debug(f"Deactivated proxy {proxy_url}")
                    break
    
    async def report_success(self, proxy_url: str, response_time: float) -> None:
        """Report proxy success for health adjustment"""
        async with self._lock:
            for key, proxy in self.proxies.items():
                if proxy.url == proxy_url:
                    proxy.successes += 1
                    proxy.response_time = response_time
                    proxy.calculate_health()
                    break
    
    def get_stats(self) -> Dict:
        """Get proxy manager statistics"""
        healthy = len(self.get_healthy_proxies())
        total = len(self.proxies)
        
        return {
            **self.stats,
            "healthy_count": healthy,
            "total_count": total,
            "health_percentage": (healthy / total * 100) if total > 0 else 0,
        }


# Global proxy manager instance
proxy_manager = AsyncProxyManager()
