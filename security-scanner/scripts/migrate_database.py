#!/usr/bin/env python3
"""
Скрипт для миграции базы данных - добавление колонки role в таблицу users
"""

import sqlite3
import os

def migrate_database():
    """Добавить колонку role в таблицу users"""
    db_path = "data/scanner.db"
    
    if not os.path.exists(db_path):
        print(f"База данных {db_path} не найдена")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверяем, существует ли колонка role
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'role' not in columns:
            print("Добавляем колонку role в таблицу users...")
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'auditor'")
            
            # Обновляем существующих пользователей
            cursor.execute("UPDATE users SET role = 'admin' WHERE username = 'admin'")
            
            conn.commit()
            print("Миграция успешно завершена!")
        else:
            print("Колонка role уже существует")
        
        conn.close()
        
    except Exception as e:
        print(f"Ошибка миграции: {e}")

if __name__ == "__main__":
    migrate_database()
