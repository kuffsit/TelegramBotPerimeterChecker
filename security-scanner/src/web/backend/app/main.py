#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastAPI приложение для управления сканером безопасности
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import os
import sys

# Добавляем родительскую директорию в путь для импорта модулей сканера
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.app.database import engine, SessionLocal
from backend.app import models, schemas
from backend.app.scanner_service import ScannerService
from backend.app.scheduler_service import scheduler_service
from backend.app.export_service import export_service
from backend.app.update_service import update_service
from backend.app.geolocation_service import geolocation_service
from backend.app.auth import (
    authenticate_user, create_access_token, get_current_active_user,
    get_current_admin_user, get_password_hash, create_default_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Создание таблиц в БД
models.Base.metadata.create_all(bind=engine)

# Создание администратора по умолчанию
db = SessionLocal()
try:
    create_default_admin(db)
finally:
    db.close()

# Загрузка активных расписаний при запуске
scheduler_service.load_all_schedules()

app = FastAPI(
    title="API сканера безопасности",
    description="API для управления сканированием безопасности",
    version="2.0.0"
)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scanner_service = ScannerService()


# Dependency для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
async def root():
    """Главная страница API"""
    return {
        "message": "API сканера безопасности",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    """Проверка состояния сервиса"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# ==================== AUTH ====================

@app.post("/api/auth/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Вход в систему"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Обновляем время последнего входа
    user.last_login = datetime.now()
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    """Получить информацию о текущем пользователе"""
    return current_user

@app.post("/api/auth/register", response_model=schemas.User)
async def register(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Регистрация нового пользователя (только для админов)"""
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_active=True,
        is_admin=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ==================== DOMAINS ====================

@app.get("/api/domains", response_model=List[schemas.Domain])
async def get_domains(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить список всех доменов"""
    domains = db.query(models.Domain).all()
    return domains


@app.post("/api/domains", response_model=schemas.Domain)
async def create_domain(
    domain: schemas.DomainCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Добавить новый домен для сканирования"""
    # Только менеджеры и админы могут добавлять домены
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для добавления доменов"
        )
    
    db_domain = models.Domain(**domain.dict())
    db.add(db_domain)
    db.commit()
    db.refresh(db_domain)
    return db_domain


@app.delete("/api/domains/{domain_id}")
async def delete_domain(
    domain_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Удалить домен"""
    # Только админы могут удалять домены
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для удаления доменов"
        )
    
    domain = db.query(models.Domain).filter(models.Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Домен не найден")
    
    db.delete(domain)
    db.commit()
    return {"message": "Домен удален"}


@app.put("/api/domains/{domain_id}", response_model=schemas.Domain)
async def update_domain(
    domain_id: int, 
    domain_update: schemas.DomainUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Обновить настройки домена"""
    # Только менеджеры и админы могут редактировать домены
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для редактирования доменов"
        )
    
    domain = db.query(models.Domain).filter(models.Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Домен не найден")
    
    for key, value in domain_update.dict(exclude_unset=True).items():
        setattr(domain, key, value)
    
    db.commit()
    db.refresh(domain)
    return domain


# ==================== SCANS ====================

@app.get("/api/scans", response_model=List[schemas.Scan])
async def get_scans(
    limit: int = 50,
    domain_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Получить список сканирований"""
    query = db.query(models.Scan)
    
    if domain_id:
        query = query.filter(models.Scan.domain_id == domain_id)
    
    scans = query.order_by(models.Scan.started_at.desc()).limit(limit).all()
    return scans


@app.get("/api/scans/{scan_id}", response_model=schemas.ScanDetail)
async def get_scan(scan_id: int, db: Session = Depends(get_db)):
    """Получить детальную информацию о сканировании"""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Сканирование не найдено")
    return scan


@app.post("/api/scans/{scan_id}/stop")
async def stop_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Остановить сканирование"""
    # Только менеджеры и админы могут останавливать сканирования
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для остановки сканирований"
        )
    
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Сканирование не найдено")
    
    if scan.status not in ["pending", "running"]:
        raise HTTPException(status_code=400, detail="Сканирование уже завершено или остановлено")
    
    # Обновляем статус
    scan.status = "stopped"
    scan.completed_at = datetime.now()
    scan.error_message = "Остановлено пользователем"
    db.commit()
    
    return {"message": "Сканирование остановлено"}


@app.delete("/api/scans/{scan_id}")
async def delete_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Удалить сканирование"""
    # Только менеджеры и админы могут удалять сканирования
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для удаления сканирований"
        )
    
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Сканирование не найдено")
    
    # Нельзя удалять активные сканирования
    if scan.status == "running":
        raise HTTPException(
            status_code=400, 
            detail="Нельзя удалить активное сканирование. Сначала остановите его."
        )
    
    # Удаляем связанный отчет, если он есть
    if scan.report_path and os.path.exists(scan.report_path):
        try:
            os.remove(scan.report_path)
        except Exception as e:
            print(f"Ошибка удаления файла отчета {scan.report_path}: {e}")
    
    db.delete(scan)
    db.commit()
    return {"message": "Сканирование удалено"}


@app.get("/api/scans/{scan_id}/progress")
async def get_scan_progress(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить прогресс сканирования"""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Сканирование не найдено")
    
    # Получаем прогресс из логов (упрощенная версия)
    progress_data = {
        "scan_id": scan_id,
        "status": scan.status,
        "progress_percentage": 0,
        "current_step": "Инициализация",
        "total_subdomains": scan.total_subdomains or 0,
        "checked_subdomains": scan.active_subdomains or 0,
        "current_subdomain": None,
        "started_at": scan.started_at,
        "estimated_completion": None
    }
    
    if scan.status == "running":
        # Примерная оценка прогресса
        if scan.total_subdomains and scan.total_subdomains > 0:
            progress_data["progress_percentage"] = min(95, (scan.active_subdomains or 0) * 100 // scan.total_subdomains)
            progress_data["current_step"] = f"Проверка субдоменов ({scan.active_subdomains or 0}/{scan.total_subdomains})"
        else:
            progress_data["progress_percentage"] = 10
            progress_data["current_step"] = "Поиск субдоменов"
    
    elif scan.status == "completed":
        progress_data["progress_percentage"] = 100
        progress_data["current_step"] = "Завершено"
    
    return progress_data


@app.post("/api/scans/start")
async def start_scan(
    scan_request: schemas.ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Запустить новое сканирование"""
    # Только менеджеры и админы могут запускать сканирования
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для запуска сканирований"
        )
    # Проверяем существование доменов
    for domain_id in scan_request.domain_ids:
        domain = db.query(models.Domain).filter(models.Domain.id == domain_id).first()
        if not domain:
            raise HTTPException(status_code=404, detail=f"Домен с ID {domain_id} не найден")
        if not domain.is_active:
            raise HTTPException(status_code=400, detail=f"Домен {domain.name} неактивен")
    
    # Записи о сканированиях
    scan_ids = []
    for domain_id in scan_request.domain_ids:
        scan = models.Scan(
            domain_id=domain_id,
            status="pending",
            started_at=datetime.now()
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        scan_ids.append(scan.id)
    
    # Запуск сканирования в фоне
    background_tasks.add_task(scanner_service.run_scans, scan_ids)
    
    return {
        "message": "Сканирование запущено",
        "scan_ids": scan_ids
    }


@app.get("/api/scans/{scan_id}/report")
async def get_scan_report(
    scan_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить HTML отчет сканирования"""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Сканирование не найдено")
    
    # Получаем домен
    domain = db.query(models.Domain).filter(models.Domain.id == scan.domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Домен не найден")
    
    # Путь к отчету
    if scan.report_path and os.path.exists(scan.report_path):
        report_path = scan.report_path
    else:
        report_path = f"reports/{domain.name}_{scan.started_at.strftime('%Y%m%d_%H%M%S')}.html"
    
    if not os.path.exists(report_path):
        return {
            "scan_id": scan_id,
            "status": scan.status,
            "report": "Отчет еще не сгенерирован",
            "html_content": None
        }
    
    # Читаем HTML отчет
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        return {
            "scan_id": scan_id,
            "status": scan.status,
            "report": "Отчет готов",
            "html_content": html_content,
            "report_path": report_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка чтения отчета: {str(e)}")


@app.get("/api/scans/{scan_id}/download")
async def download_scan_report(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Скачать отчет о сканировании"""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Сканирование не найдено")
    
    # Получаем домен
    domain = db.query(models.Domain).filter(models.Domain.id == scan.domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Домен не найден")
    
    # Путь к отчету
    if scan.report_path and os.path.exists(scan.report_path):
        report_path = scan.report_path
    else:
        report_path = f"reports/{domain.name}_{scan.started_at.strftime('%Y%m%d_%H%M%S')}.html"
    
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Отчет не найден")
    
    # Возвращаем файл для скачивания
    from fastapi.responses import FileResponse
    return FileResponse(
        path=report_path,
        filename=f"scan_report_{domain.name}_{scan.started_at.strftime('%Y%m%d_%H%M%S')}.html",
        media_type="text/html"
    )


# ==================== USER MANAGEMENT ====================

@app.get("/api/users", response_model=List[schemas.User])
async def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Получить список всех пользователей (только для админов)"""
    users = db.query(models.User).all()
    return users


@app.post("/api/users", response_model=schemas.User)
async def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Создать нового пользователя (только для админов)"""
    # Проверяем, существует ли пользователь
    existing_user = db.query(models.User).filter(
        models.User.username == user_data.username
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    
    # Новый пользователь
    hashed_password = get_password_hash(user_data.password)
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=True,
        role=user_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@app.put("/api/users/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: int,
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Обновить пользователя (только для админов)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Проверяем, не занято ли имя пользователя другим пользователем
    existing_user = db.query(models.User).filter(
        models.User.username == user_data.username,
        models.User.id != user_id
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Имя пользователя уже занято")
    
    # Обновляем данные пользователя
    user.username = user_data.username
    user.email = user_data.email
    user.role = user_data.role
    
    # Обновляем пароль только если он указан
    if user_data.password:
        user.hashed_password = get_password_hash(user_data.password)
    
    db.commit()
    db.refresh(user)
    
    return user


@app.delete("/api/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Удалить пользователя (только для админов)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Нельзя удалить самого себя
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    
    db.delete(user)
    db.commit()
    
    return {"message": "Пользователь удален"}


# ==================== STATISTICS ====================

@app.get("/api/stats/dashboard")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Получить статистику для дашборда"""
    total_domains = db.query(models.Domain).count()
    active_domains = db.query(models.Domain).filter(models.Domain.is_active == True).count()
    total_scans = db.query(models.Scan).count()
    
    # Последнее сканирование
    last_scan = db.query(models.Scan).order_by(models.Scan.started_at.desc()).first()
    
    # Активные сканирования
    active_scans = db.query(models.Scan).filter(
        models.Scan.status.in_(["pending", "running"])
    ).count()
    
    # Статистика уязвимостей за последний месяц
    from sqlalchemy import func
    from datetime import timedelta
    
    month_ago = datetime.now() - timedelta(days=30)
    recent_vulnerabilities = db.query(
        func.sum(models.Scan.total_vulnerabilities)
    ).filter(
        models.Scan.started_at >= month_ago
    ).scalar() or 0
    
    return {
        "total_domains": total_domains,
        "active_domains": active_domains,
        "total_scans": total_scans,
        "active_scans": active_scans,
        "recent_vulnerabilities": int(recent_vulnerabilities),
        "last_scan": {
            "id": last_scan.id,
            "domain": last_scan.domain.name,
            "started_at": last_scan.started_at.isoformat(),
            "status": last_scan.status
        } if last_scan else None
    }


@app.get("/api/stats/vulnerabilities")
async def get_vulnerability_stats(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Получить статистику уязвимостей"""
    from datetime import timedelta
    
    start_date = datetime.now() - timedelta(days=days)
    
    scans = db.query(models.Scan).filter(
        models.Scan.started_at >= start_date,
        models.Scan.status == "completed"
    ).all()
    
    stats = {
        "total": 0,
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "by_domain": {}
    }
    
    for scan in scans:
        stats["total"] += scan.total_vulnerabilities or 0
        stats["critical"] += scan.critical_vulns or 0
        stats["high"] += scan.high_vulns or 0
        stats["medium"] += scan.medium_vulns or 0
        stats["low"] += scan.low_vulns or 0
        
        domain_name = scan.domain.name
        if domain_name not in stats["by_domain"]:
            stats["by_domain"][domain_name] = 0
        stats["by_domain"][domain_name] += scan.total_vulnerabilities or 0
    
    return stats


# ==================== SETTINGS ====================

@app.get("/api/settings")
async def get_settings(
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить настройки сканера"""
    import config
    
    return {
        "telegram_enabled": bool(config.TELEGRAM_TOKEN and config.CHAT_ID),
        "ports": config.PORTS,
        "severity_levels": config.SEVERITY_LEVELS,
        "subfinder_path": config.SUBFINDER_PATH,
        "nmap_path": config.NMAP_PATH,
        "nuclei_path": config.NUCLEI_PATH,
        "telegram_token": "***",  # Скрываем токен
        "chat_id": "***"  # Скрываем chat_id
    }


@app.put("/api/settings")
async def update_settings(
    settings: schemas.SettingsUpdate,
    current_user: models.User = Depends(get_current_active_user)
):
    """Обновить настройки сканера"""
    import config
    
    # В реальном приложении нужно сохранять настройки в БД или файл
    # Сейчас просто возвращаем обновленные настройки
    
    return {
        "message": "Настройки обновлены",
        "settings": settings.dict()
    }

@app.post("/api/settings/test-telegram")
async def test_telegram_connection(
    settings: schemas.SettingsUpdate,
    current_user: models.User = Depends(get_current_active_user)
):
    """Тестировать подключение к Telegram"""
    import requests
    
    if not settings.telegram_token or not settings.chat_id:
        raise HTTPException(status_code=400, detail="Токен и Chat ID обязательны")
    
    try:
        # Отправляем тестовое сообщение
        url = f"https://api.telegram.org/bot{settings.telegram_token}/sendMessage"
        data = {
            "chat_id": settings.chat_id,
            "text": "🔔 Тест подключения к Telegram успешен!\n\nВеб-панель Security Scanner готова к работе."
        }
        
        response = requests.post(url, data=data, timeout=10)
        response.raise_for_status()
        
        return {"message": "Тест успешен! Сообщение отправлено в Telegram."}
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Ошибка отправки в Telegram: {str(e)}")


# ==================== SCHEDULER ENDPOINTS ====================

@app.get("/api/schedules", response_model=List[schemas.ScanSchedule])
async def get_schedules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить список расписаний сканирований"""
    # Только менеджеры и админы могут просматривать расписания
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра расписаний"
        )
    
    schedules = db.query(models.ScanSchedule).all()
    return schedules


@app.post("/api/schedules", response_model=schemas.ScanSchedule)
async def create_schedule(
    schedule: schemas.ScanScheduleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Создать новое расписание сканирований"""
    # Только менеджеры и админы могут создавать расписания
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для создания расписаний"
        )
    
    # Проверяем существование доменов
    for domain_id in schedule.domain_ids:
        domain = db.query(models.Domain).filter(models.Domain.id == domain_id).first()
        if not domain:
            raise HTTPException(status_code=404, detail=f"Домен с ID {domain_id} не найден")
    
    # Расписание
    db_schedule = models.ScanSchedule(
        **schedule.dict(),
        created_by=current_user.id
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    # Добавляем в планировщик если активно
    if db_schedule.is_active:
        scheduler_service.add_schedule(db_schedule, db)
    
    return db_schedule


@app.put("/api/schedules/{schedule_id}", response_model=schemas.ScanSchedule)
async def update_schedule(
    schedule_id: int,
    schedule_update: schemas.ScanScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Обновить расписание сканирований"""
    # Только менеджеры и админы могут редактировать расписания
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для редактирования расписаний"
        )
    
    schedule = db.query(models.ScanSchedule).filter(models.ScanSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Расписание не найдено")
    
    # Проверяем домены если они обновляются
    if schedule_update.domain_ids:
        for domain_id in schedule_update.domain_ids:
            domain = db.query(models.Domain).filter(models.Domain.id == domain_id).first()
            if not domain:
                raise HTTPException(status_code=404, detail=f"Домен с ID {domain_id} не найден")
    
    # Обновляем расписание
    for key, value in schedule_update.dict(exclude_unset=True).items():
        setattr(schedule, key, value)
    
    schedule.updated_at = datetime.now()
    db.commit()
    db.refresh(schedule)
    
    # Обновляем в планировщике
    scheduler_service.update_schedule(schedule, db)
    
    return schedule


@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Удалить расписание сканирований"""
    # Только админы могут удалять расписания
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для удаления расписаний"
        )
    
    schedule = db.query(models.ScanSchedule).filter(models.ScanSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Расписание не найдено")
    
    # Удаляем из планировщика
    scheduler_service.remove_schedule(schedule_id)
    
    db.delete(schedule)
    db.commit()
    return {"message": "Расписание удалено"}


# ==================== EXPORT ENDPOINTS ====================

@app.get("/api/export/scans/pdf")
async def export_scans_pdf(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Экспорт сканирований в PDF"""
    try:
        # Получаем все сканирования и домены
        scans = db.query(models.Scan).all()
        domains = db.query(models.Domain).all()
        
        # Экспортируем в PDF
        output_path = export_service.export_scans_to_pdf(scans, domains)
        
        # Читаем файл и возвращаем как ответ
        with open(output_path, 'rb') as f:
            content = f.read()
        
        # Удаляем временный файл
        os.unlink(output_path)
        
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=scans_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта в PDF: {str(e)}")


@app.get("/api/export/scans/excel")
async def export_scans_excel(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Экспорт сканирований в Excel"""
    try:
        # Получаем все сканирования и домены
        scans = db.query(models.Scan).all()
        domains = db.query(models.Domain).all()
        
        # Экспортируем в Excel
        output_path = export_service.export_scans_to_excel(scans, domains)
        
        # Читаем файл и возвращаем как ответ
        with open(output_path, 'rb') as f:
            content = f.read()
        
        # Удаляем временный файл
        os.unlink(output_path)
        
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=scans_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта в Excel: {str(e)}")


@app.get("/api/export/scans/csv")
async def export_scans_csv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Экспорт сканирований в CSV"""
    try:
        # Получаем все сканирования и домены
        scans = db.query(models.Scan).all()
        domains = db.query(models.Domain).all()
        
        # Экспортируем в CSV
        output_path = export_service.export_scans_to_csv(scans, domains)
        
        # Читаем файл и возвращаем как ответ
        with open(output_path, 'rb') as f:
            content = f.read()
        
        # Удаляем временный файл
        os.unlink(output_path)
        
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=scans_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта в CSV: {str(e)}")


@app.get("/api/export/vulnerabilities/pdf")
async def export_vulnerabilities_pdf(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Экспорт уязвимостей в PDF"""
    try:
        # Получаем статистику уязвимостей
        scans = db.query(models.Scan).all()
        
        # Подсчитываем статистику
        total_vulns = sum(scan.total_vulnerabilities for scan in scans)
        critical_vulns = sum(scan.critical_vulns for scan in scans)
        high_vulns = sum(scan.high_vulns for scan in scans)
        medium_vulns = sum(scan.medium_vulns for scan in scans)
        low_vulns = sum(scan.low_vulns for scan in scans)
        
        # Группируем по доменам
        domains = db.query(models.Domain).all()
        by_domain = {}
        for domain in domains:
            domain_scans = [s for s in scans if s.domain_id == domain.id]
            domain_vulns = sum(s.total_vulnerabilities for s in domain_scans)
            if domain_vulns > 0:
                by_domain[domain.name] = domain_vulns
        
        vulnerabilities_data = {
            'total': total_vulns,
            'critical': critical_vulns,
            'high': high_vulns,
            'medium': medium_vulns,
            'low': low_vulns,
            'by_domain': by_domain
        }
        
        # Экспортируем в PDF
        output_path = export_service.export_vulnerabilities_to_pdf(vulnerabilities_data)
        
        # Читаем файл и возвращаем как ответ
        with open(output_path, 'rb') as f:
            content = f.read()
        
        # Удаляем временный файл
        os.unlink(output_path)
        
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=vulnerabilities_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта уязвимостей в PDF: {str(e)}")


# ==================== UPDATE ENDPOINTS ====================

@app.get("/api/updates/status")
async def get_update_status(
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить статус обновлений сканеров"""
    # Только админы могут просматривать статус обновлений
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра статуса обновлений"
        )
    
    try:
        status = update_service.get_update_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения статуса обновлений: {str(e)}")


@app.post("/api/updates/check")
async def check_updates(
    current_user: models.User = Depends(get_current_active_user)
):
    """Проверить доступные обновления"""
    # Только админы могут проверять обновления
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для проверки обновлений"
        )
    
    try:
        versions = update_service.check_scanner_versions()
        return {"message": "Проверка обновлений завершена", "versions": versions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка проверки обновлений: {str(e)}")


@app.post("/api/updates/{scanner_name}")
async def update_scanner(
    scanner_name: str,
    current_user: models.User = Depends(get_current_active_user)
):
    """Обновить конкретный сканер"""
    # Только админы могут обновлять сканеры
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для обновления сканеров"
        )
    
    if scanner_name not in ['subfinder', 'nmap', 'nuclei']:
        raise HTTPException(status_code=400, detail="Неизвестный сканер")
    
    try:
        result = update_service.update_scanner(scanner_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обновления {scanner_name}: {str(e)}")


@app.post("/api/updates/all")
async def update_all_scanners(
    current_user: models.User = Depends(get_current_active_user)
):
    """Обновить все сканеры"""
    # Только админы могут обновлять сканеры
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для обновления сканеров"
        )
    
    try:
        results = update_service.update_all_scanners()
        return {"message": "Обновление сканеров завершено", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обновления сканеров: {str(e)}")


@app.post("/api/updates/auto-update")
async def configure_auto_update(
    enabled: bool,
    check_interval_hours: int = 24,
    current_user: models.User = Depends(get_current_active_user)
):
    """Настроить автоматическое обновление"""
    # Только админы могут настраивать автоматическое обновление
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для настройки автоматического обновления"
        )
    
    try:
        config = update_service.schedule_auto_update(enabled, check_interval_hours)
        return {"message": "Настройки автоматического обновления сохранены", "config": config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка настройки автоматического обновления: {str(e)}")


# ==================== GEOLOCATION ENDPOINTS ====================

@app.get("/api/geolocation")
async def get_geolocation_data(
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить все геолокационные данные"""
    try:
        data = geolocation_service.get_all_geolocations()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/geolocation/scan/{scan_id}")
async def get_scan_geolocation(
    scan_id: int,
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить геолокационные данные для конкретного сканирования"""
    try:
        geolocations = geolocation_service.get_scan_geolocations(scan_id)
        return {"geolocations": geolocations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/geolocation/ip/{ip_address}")
async def get_ip_geolocation(
    ip_address: str,
    current_user: models.User = Depends(get_current_active_user)
):
    """Получить геолокацию для конкретного IP адреса"""
    try:
        geo_data = geolocation_service.get_geolocation(ip_address)
        if geo_data:
            return geo_data
        else:
            raise HTTPException(status_code=404, detail="Геолокация не найдена")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    """Остановка планировщика при завершении приложения"""
    scheduler_service.shutdown()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

