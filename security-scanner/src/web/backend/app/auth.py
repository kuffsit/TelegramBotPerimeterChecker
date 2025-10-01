#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Модуль авторизации и аутентификации
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app import models, schemas

# Настройки JWT
SECRET_KEY = "your-secret-key-change-in-production"  # В продакшене используйте переменную окружения
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Настройки хеширования паролей
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Схема авторизации
security = HTTPBearer()

def get_db():
    """Получить сессию базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверить пароль"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Получить хеш пароля"""
    return pwd_context.hash(password)

def get_user(db: Session, username: str) -> Optional[models.User]:
    """Получить пользователя по имени"""
    return db.query(models.User).filter(models.User.username == username).first()

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    """Аутентифицировать пользователя"""
    user = get_user(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Создать JWT токен"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Получить текущего пользователя из токена"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Получить текущего активного пользователя"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_admin_user(current_user: models.User = Depends(get_current_active_user)) -> models.User:
    """Получить текущего администратора"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def get_current_manager_user(current_user: models.User = Depends(get_current_active_user)) -> models.User:
    """Получить текущего менеджера или администратора"""
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def get_current_auditor_user(current_user: models.User = Depends(get_current_active_user)) -> models.User:
    """Получить текущего аудитора, менеджера или администратора"""
    if current_user.role not in ["auditor", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def get_user_by_api_key(db: Session, api_key: str) -> Optional[models.User]:
    """Получить пользователя по API ключу"""
    # Ищем API ключ по хешу
    api_key_obj = db.query(models.ApiKey).filter(
        models.ApiKey.key_hash == models.ApiKey.hash_key(api_key),
        models.ApiKey.is_active == True
    ).first()
    
    if not api_key_obj:
        return None
    
    # Проверяем, не истек ли ключ
    if api_key_obj.expires_at and api_key_obj.expires_at < datetime.utcnow():
        return None
    
    # Обновляем время последнего использования
    api_key_obj.last_used = datetime.utcnow()
    db.commit()
    
    return api_key_obj.user


def get_current_user_by_token_or_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Получить текущего пользователя из токена или API ключа"""
    
    # Сначала пробуем получить API ключ из заголовка X-API-Key
    api_key = request.headers.get("X-API-Key")
    if api_key:
        user = get_user_by_api_key(db, api_key)
        if user:
            return user
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Если API ключа нет, пробуем JWT токен
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


def create_default_admin(db: Session):
    """Создать администратора по умолчанию"""
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        admin_user = models.User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print("Создан администратор: admin / admin123")
    return admin_user
