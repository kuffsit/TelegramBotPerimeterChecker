#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Настройка подключения к базе данных
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Путь к базе данных SQLite
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'data', 'scanner.db')}"

# Создание директории для БД
os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)

# SQLAlchemy движок
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Нужно для SQLite
)

# Фабрика сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

