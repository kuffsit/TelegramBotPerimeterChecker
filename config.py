#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конфигурационный файл для сканера безопасности
"""

import os

# Telegram настройки
TELEGRAM_TOKEN = '7184432111:123AdsaXXXXXXX
CHAT_ID = '-100XXXXXXXXX'

# Пути к утилитам
SUBFINDER_PATH = '/usr/local/bin/subfinder'
NMAP_PATH = '/usr/bin/nmap'
NUCLEI_PATH = '/usr/local/bin/nuclei'

# Домены для сканирования
DOMAINS = [ 
    'example.com',  
    'example1.com'
]

# Порты для сканирования
PORTS = "22,23,25,53,80,110,443,445,3306,3389,5900,8080,8443,9090"

# Уровни критичности для Nuclei
SEVERITY_LEVELS = "medium,high,critical"

# Настройки логирования
LOG_FILE = 'scan_log.log'
LOG_LEVEL = 'INFO'

# Директории для данных и отчетов
DATA_DIR = 'data'
REPORTS_DIR = 'reports'

# Убедимся, что директории существуют
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
