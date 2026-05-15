"""
AI Image Generation Platform - Database Connection
Async database session management with connection pooling
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database.models import Base
from app.utils.logger import app_logger


class Database:
    """Async database manager with connection pooling"""
    
    def __init__(self):
        self.engine = None
        self.async_session_maker = None
        self._initialized = False
    
    async def connect(self) -> None:
        """Initialize database connection and create tables"""
        if self._initialized:
            return
        
        try:
            # Create async engine with optimizations
            self.engine = create_async_engine(
                settings.DATABASE_URL,
                echo=settings.DEBUG,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=3600,
                connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
            )
            
            # Create session factory
            self.async_session_maker = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
            
            # Create tables
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            self._initialized = True
            app_logger.info("Database connected successfully")
            
        except Exception as e:
            app_logger.error(f"Database connection failed: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Close database connections"""
        if self.engine:
            await self.engine.dispose()
            self._initialized = False
            app_logger.info("Database disconnected")
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session for dependency injection"""
        if not self._initialized:
            await self.connect()
        
        async with self.async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def execute_query(self, query, params=None):
        """Execute raw SQL query"""
        async with self.engine.begin() as conn:
            if params:
                result = await conn.execute(query, params)
            else:
                result = await conn.execute(query)
            return result


# Global database instance
db = Database()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection for database sessions"""
    async for session in db.get_session():
        yield session
