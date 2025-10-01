"""
Система интернационализации для backend
"""

from typing import Dict, Any
import json
import os

class I18n:
    def __init__(self):
        self.translations = {}
        self.current_language = "ru"
        self.load_translations()
    
    def load_translations(self):
        """Загрузка переводов из файлов"""
        translations_dir = os.path.join(os.path.dirname(__file__), "translations")
        
        # Загружаем только русский язык
        ru_file_path = os.path.join(translations_dir, "ru.json")
        if os.path.exists(ru_file_path):
            with open(ru_file_path, 'r', encoding='utf-8') as f:
                self.translations["ru"] = json.load(f)
    
    def set_language(self, language: str):
        """Установка текущего языка"""
        if language in self.translations:
            self.current_language = language
    
    def get(self, key: str, **kwargs) -> str:
        """Получение перевода по ключу"""
        try:
            # Поддержка вложенных ключей через точку
            keys = key.split('.')
            value = self.translations[self.current_language]
            
            for k in keys:
                value = value[k]
            
            # Замена переменных в строке
            if kwargs:
                return value.format(**kwargs)
            return value
        except (KeyError, TypeError):
            # Возвращаем ключ, если перевод не найден
            return key
    
    def get_available_languages(self) -> list:
        """Получение списка доступных языков"""
        return list(self.translations.keys())

# Глобальный экземпляр
i18n = I18n()
