#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Модели базы данных SQLAlchemy
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.app.database import Base


class User(Base):
    """Модель пользователя"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="auditor")  # auditor, manager, admin
    created_at = Column(DateTime, default=datetime.now)
    last_login = Column(DateTime, nullable=True)
    
    # Для обратной совместимости
    @property
    def is_admin(self):
        return self.role == "admin"


class Domain(Base):
    """Модель домена для сканирования"""
    __tablename__ = "domains"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Связь с сканированиями
    scans = relationship("Scan", back_populates="domain", cascade="all, delete-orphan")


class Scan(Base):
    """Модель сканирования"""
    __tablename__ = "scans"
    
    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    
    # Статус: pending, running, completed, failed
    status = Column(String, default="pending")
    
    # Временные метки
    started_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime, nullable=True)
    
    # Статистика
    total_subdomains = Column(Integer, default=0)
    active_subdomains = Column(Integer, default=0)
    new_active_subdomains = Column(Integer, default=0)
    lost_active_subdomains = Column(Integer, default=0)
    
    # Уязвимости
    total_vulnerabilities = Column(Integer, default=0)
    critical_vulns = Column(Integer, default=0)
    high_vulns = Column(Integer, default=0)
    medium_vulns = Column(Integer, default=0)
    low_vulns = Column(Integer, default=0)
    
    # Путь к отчету
    report_path = Column(String, nullable=True)
    
    # Ошибки
    error_message = Column(Text, nullable=True)
    
    # Детальные данные в JSON
    scan_details = Column(JSON, nullable=True)
    
    # Связь с доменом
    domain = relationship("Domain", back_populates="scans")


class ScanSchedule(Base):
    """Модель расписания сканирований"""
    __tablename__ = "scan_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Домены для сканирования
    domain_ids = Column(JSON, nullable=False)  # Список ID доменов
    
    # Расписание (cron expression)
    cron_expression = Column(String, nullable=False)
    
    # Статус
    is_active = Column(Boolean, default=True)
    
    # Временные метки
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    
    # Создатель
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User")

