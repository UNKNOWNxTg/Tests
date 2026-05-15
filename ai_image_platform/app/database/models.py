"""
AI Image Generation Platform - Database Models
Async SQLite database with SQLAlchemy async
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, Index
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class User(Base):
    """User model for tracking generations and preferences"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    telegram_id = Column(String, unique=True, nullable=True, index=True)
    username = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_active = Column(DateTime, default=datetime.utcnow)
    is_premium = Column(Boolean, default=False)
    total_generations = Column(Integer, default=0)
    
    # Relationships
    generations = relationship("ImageGeneration", back_populates="user", lazy="select")
    favorites = relationship("Favorite", back_populates="user", lazy="select", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_users_telegram', 'telegram_id'),
        Index('ix_users_created', 'created_at'),
    )


class ImageGeneration(Base):
    """Image generation record"""
    __tablename__ = "image_generations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    seed = Column(Integer, nullable=True)
    width = Column(Integer, default=1024)
    height = Column(Integer, default=1024)
    model = Column(String, default="flux")
    image_url = Column(String, nullable=True)
    image_path = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    proxy_used = Column(String, nullable=True)
    generation_time = Column(Float, nullable=True)  # seconds
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="generations")
    
    __table_args__ = (
        Index('ix_generations_status', 'status'),
        Index('ix_generations_created', 'created_at'),
        Index('ix_generations_user_status', 'user_id', 'status'),
    )


class Favorite(Base):
    """User favorite images"""
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    generation_id = Column(Integer, ForeignKey("image_generations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="favorites")
    generation = relationship("ImageGeneration")
    
    __table_args__ = (
        Index('ix_favorites_user', 'user_id'),
        Index('ix_favorites_unique', 'user_id', 'generation_id', unique=True),
    )


class ProxyRecord(Base):
    """Cached proxy records"""
    __tablename__ = "proxies"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    ip = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    protocol = Column(String, default="http")  # http, socks4, socks5
    country = Column(String, nullable=True)
    anonymity = Column(String, nullable=True)  # elite, anonymous, transparent
    health_score = Column(Float, default=1.0)
    response_time = Column(Float, nullable=True)  # milliseconds
    last_checked = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_proxies_ip_port', 'ip', 'port', unique=True),
        Index('ix_proxies_active', 'is_active'),
        Index('ix_proxies_health', 'health_score'),
    )


class PromptTemplate(Base):
    """Preset prompt templates"""
    __tablename__ = "prompt_templates"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    prompt = Column(Text, nullable=False)
    category = Column(String, default="general")
    is_public = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_templates_category', 'category'),
        Index('ix_templates_public', 'is_public'),
    )
