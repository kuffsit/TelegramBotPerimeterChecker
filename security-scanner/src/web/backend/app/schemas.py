#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pydantic схемы для валидации данных
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ==================== DOMAIN SCHEMAS ====================

class DomainBase(BaseModel):
    """Базовая схема домена"""
    name: str = Field(..., description="Имя домена (например, example.com)")
    description: Optional[str] = Field(None, description="Описание домена")
    is_active: bool = Field(True, description="Активен ли домен для сканирования")


class DomainCreate(DomainBase):
    """Схема для создания домена"""
    pass


class DomainUpdate(BaseModel):
    """Схема для обновления домена"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class Domain(DomainBase):
    """Схема домена с ID и датами"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== SCAN SCHEMAS ====================

class ScanBase(BaseModel):
    """Базовая схема сканирования"""
    domain_id: int
    status: str


class ScanRequest(BaseModel):
    """Схема запроса на сканирование"""
    domain_ids: List[int] = Field(..., description="Список ID доменов для сканирования")


class Scan(BaseModel):
    """Схема сканирования"""
    id: int
    domain_id: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_subdomains: int = 0
    active_subdomains: int = 0
    new_active_subdomains: int = 0
    lost_active_subdomains: int = 0
    total_vulnerabilities: int = 0
    critical_vulns: int = 0
    high_vulns: int = 0
    medium_vulns: int = 0
    low_vulns: int = 0
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class ScanDetail(Scan):
    """Детальная схема сканирования с доменом"""
    domain: Domain
    scan_details: Optional[dict] = None
    report_path: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== STATISTICS SCHEMAS ====================

class DashboardStats(BaseModel):
    """Статистика для дашборда"""
    total_domains: int
    active_domains: int
    total_scans: int
    active_scans: int
    recent_vulnerabilities: int
    last_scan: Optional[dict] = None


class VulnerabilityStats(BaseModel):
    """Статистика уязвимостей"""
    total: int
    critical: int
    high: int
    medium: int
    low: int
    by_domain: dict


# ==================== AUTH SCHEMAS ====================

class UserBase(BaseModel):
    """Базовая схема пользователя"""
    username: str = Field(..., description="Имя пользователя")
    email: Optional[str] = Field(None, description="Email пользователя")

class UserCreate(UserBase):
    """Схема для создания пользователя"""
    password: str = Field(..., description="Пароль")
    role: str = Field(default="auditor", description="Роль пользователя")

class UserLogin(BaseModel):
    """Схема для входа"""
    username: str = Field(..., description="Имя пользователя")
    password: str = Field(..., description="Пароль")

class User(UserBase):
    """Схема пользователя с ID"""
    id: int
    is_active: bool
    role: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    # Для обратной совместимости
    @property
    def is_admin(self):
        return self.role == "admin"
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    """Схема токена"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Данные токена"""
    username: Optional[str] = None

# ==================== SETTINGS SCHEMAS ====================

class SettingsUpdate(BaseModel):
    """Схема обновления настроек"""
    ports: Optional[str] = None
    severity_levels: Optional[str] = None
    telegram_token: Optional[str] = None
    chat_id: Optional[str] = None


# ==================== SCAN PROGRESS SCHEMAS ====================

class ScanProgress(BaseModel):
    """Схема прогресса сканирования"""
    scan_id: int
    status: str
    progress_percentage: int
    current_step: str
    total_subdomains: int
    checked_subdomains: int
    current_subdomain: Optional[str] = None
    started_at: datetime
    estimated_completion: Optional[datetime] = None


# ==================== SCHEDULER SCHEMAS ====================

class ScanScheduleBase(BaseModel):
    """Базовая схема расписания сканирований"""
    name: str = Field(..., description="Название расписания")
    description: Optional[str] = Field(None, description="Описание")
    domain_ids: List[int] = Field(..., description="Список ID доменов для сканирования")
    cron_expression: str = Field(..., description="Cron выражение для расписания")
    is_active: bool = Field(default=True, description="Активно ли расписание")


class ScanScheduleCreate(ScanScheduleBase):
    """Схема для создания расписания"""
    pass


class ScanScheduleUpdate(BaseModel):
    """Схема для обновления расписания"""
    name: Optional[str] = None
    description: Optional[str] = None
    domain_ids: Optional[List[int]] = None
    cron_expression: Optional[str] = None
    is_active: Optional[bool] = None


class ScanSchedule(ScanScheduleBase):
    """Схема расписания с ID"""
    id: int
    created_at: datetime
    updated_at: datetime
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_by: int
    
    class Config:
        from_attributes = True

