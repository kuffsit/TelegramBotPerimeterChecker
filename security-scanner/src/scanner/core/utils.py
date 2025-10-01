#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Вспомогательные функции для сканера
"""

import logging
import requests
import urllib3
from datetime import datetime

# Отключаем предупреждения об SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def setup_logging(log_file, log_level):
    """Настройка логирования"""
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s %(levelname)s: %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )

def send_telegram_message(message, token, chat_id):
    """Отправка сообщения в Telegram"""
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    payload = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML'
    }
    try:
        response = requests.post(url, data=payload, timeout=30)
        response_data = response.json()
        if response_data.get("ok"):
            logging.info("Сообщение успешно отправлено в Telegram")
            return True
        else:
            logging.error(f'Ошибка при отправке сообщения в Telegram: {response_data}')
            return False
    except Exception as e:
        logging.error(f'Ошибка при отправке сообщения в Telegram: {e}')
        return False

def send_telegram_file(message, file_path, token, chat_id):
    """Отправка файла в Telegram"""
    url = f'https://api.telegram.org/bot{token}/sendDocument'
    try:
        with open(file_path, 'rb') as file:
            files = {'document': file}
            data = {'chat_id': chat_id, 'caption': message}
            response = requests.post(url, files=files, data=data, timeout=60)
            response_data = response.json()
            if response_data.get("ok"):
                logging.info("Файл успешно отправлен в Telegram")
                return True
            else:
                logging.error(f'Ошибка при отправке файла в Telegram: {response_data}')
                return False
    except Exception as e:
        logging.error(f'Ошибка при отправке файла в Telegram: {e}')
        return False

def is_site_up(subdomain):
    """Проверка доступности сайта"""
    try:
        # Пробуем HTTPS
        response = requests.get(f"https://{subdomain}", timeout=5, verify=False)
        return True
    except requests.exceptions.SSLError:
        # Пробуем HTTP
        try:
            response = requests.get(f"http://{subdomain}", timeout=5)
            return True
        except requests.RequestException:
            return False
    except requests.RequestException:
        return False

def format_timestamp():
    """Форматирование текущего времени"""
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def get_emoji_for_vuln_count(count):
    """Получение эмодзи в зависимости от количества уязвимостей"""
    if count == 0:
        return "✅"
    elif count < 3:
        return "⚠️"
    else:
        return "🚨"
