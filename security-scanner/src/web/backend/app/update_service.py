"""
Сервис автоматического обновления сканеров
"""
import os
import sys
import subprocess
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
import requests
import json

# Добавляем путь к корневой директории проекта
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.database import SessionLocal
from backend.app import models

logger = logging.getLogger(__name__)

class UpdateService:
    def __init__(self):
        self.scanner_versions = {
            'subfinder': {
                'current_version': None,
                'latest_version': None,
                'update_available': False,
                'last_checked': None
            },
            'nmap': {
                'current_version': None,
                'latest_version': None,
                'update_available': False,
                'last_checked': None
            },
            'nuclei': {
                'current_version': None,
                'latest_version': None,
                'update_available': False,
                'last_checked': None
            }
        }
        
    def check_scanner_versions(self) -> Dict[str, Dict]:
        """Проверить версии всех сканеров"""
        try:
            # Проверяем Subfinder
            self._check_subfinder_version()
            
            # Проверяем Nmap
            self._check_nmap_version()
            
            # Проверяем Nuclei
            self._check_nuclei_version()
            
            return self.scanner_versions
            
        except Exception as e:
            logger.error(f"Ошибка проверки версий сканеров: {e}")
            return self.scanner_versions
    
    def _check_subfinder_version(self):
        """Проверить версию Subfinder"""
        try:
            # Получаем текущую версию
            result = subprocess.run(['subfinder', '-version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                version_line = result.stdout.strip().split('\n')[0]
                current_version = version_line.split()[-1] if version_line else "unknown"
                self.scanner_versions['subfinder']['current_version'] = current_version
            else:
                self.scanner_versions['subfinder']['current_version'] = "not_installed"
            
            # Получаем последнюю версию с GitHub
            try:
                response = requests.get(
                    'https://api.github.com/repos/projectdiscovery/subfinder/releases/latest',
                    timeout=10
                )
                if response.status_code == 200:
                    latest_data = response.json()
                    latest_version = latest_data['tag_name'].lstrip('v')
                    self.scanner_versions['subfinder']['latest_version'] = latest_version
                    
                    # Сравниваем версии
                    if self.scanner_versions['subfinder']['current_version'] != latest_version:
                        self.scanner_versions['subfinder']['update_available'] = True
            except Exception as e:
                logger.warning(f"Не удалось получить последнюю версию Subfinder: {e}")
            
            self.scanner_versions['subfinder']['last_checked'] = datetime.now()
            
        except Exception as e:
            logger.error(f"Ошибка проверки версии Subfinder: {e}")
    
    def _check_nmap_version(self):
        """Проверить версию Nmap"""
        try:
            # Получаем текущую версию
            result = subprocess.run(['nmap', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                version_line = result.stdout.strip().split('\n')[0]
                current_version = version_line.split()[-1] if version_line else "unknown"
                self.scanner_versions['nmap']['current_version'] = current_version
            else:
                self.scanner_versions['nmap']['current_version'] = "not_installed"
            
            # Для Nmap получаем версию из официального сайта
            try:
                response = requests.get('https://nmap.org/dist/', timeout=10)
                if response.status_code == 200:
                    # Простая проверка - ищем последнюю версию в HTML
                    content = response.text
                    # Это упрощенная проверка, в реальности нужен более сложный парсинг
                    self.scanner_versions['nmap']['latest_version'] = "latest"
                    self.scanner_versions['nmap']['update_available'] = False
            except Exception as e:
                logger.warning(f"Не удалось получить последнюю версию Nmap: {e}")
            
            self.scanner_versions['nmap']['last_checked'] = datetime.now()
            
        except Exception as e:
            logger.error(f"Ошибка проверки версии Nmap: {e}")
    
    def _check_nuclei_version(self):
        """Проверить версию Nuclei"""
        try:
            # Получаем текущую версию
            result = subprocess.run(['nuclei', '-version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                version_line = result.stdout.strip().split('\n')[0]
                current_version = version_line.split()[-1] if version_line else "unknown"
                self.scanner_versions['nuclei']['current_version'] = current_version
            else:
                self.scanner_versions['nuclei']['current_version'] = "not_installed"
            
            # Получаем последнюю версию с GitHub
            try:
                response = requests.get(
                    'https://api.github.com/repos/projectdiscovery/nuclei/releases/latest',
                    timeout=10
                )
                if response.status_code == 200:
                    latest_data = response.json()
                    latest_version = latest_data['tag_name'].lstrip('v')
                    self.scanner_versions['nuclei']['latest_version'] = latest_version
                    
                    # Сравниваем версии
                    if self.scanner_versions['nuclei']['current_version'] != latest_version:
                        self.scanner_versions['nuclei']['update_available'] = True
            except Exception as e:
                logger.warning(f"Не удалось получить последнюю версию Nuclei: {e}")
            
            self.scanner_versions['nuclei']['last_checked'] = datetime.now()
            
        except Exception as e:
            logger.error(f"Ошибка проверки версии Nuclei: {e}")
    
    def update_scanner(self, scanner_name: str) -> Dict[str, any]:
        """Обновить конкретный сканер"""
        try:
            if scanner_name == 'subfinder':
                return self._update_subfinder()
            elif scanner_name == 'nuclei':
                return self._update_nuclei()
            elif scanner_name == 'nmap':
                return self._update_nmap()
            else:
                return {"success": False, "message": f"Неизвестный сканер: {scanner_name}"}
                
        except Exception as e:
            logger.error(f"Ошибка обновления {scanner_name}: {e}")
            return {"success": False, "message": str(e)}
    
    def _update_subfinder(self) -> Dict[str, any]:
        """Обновить Subfinder"""
        try:
            # Скачиваем и устанавливаем последнюю версию
            result = subprocess.run([
                'go', 'install', '-v', 'github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest'
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                # Обновляем информацию о версии
                self._check_subfinder_version()
                return {
                    "success": True, 
                    "message": "Subfinder успешно обновлен",
                    "new_version": self.scanner_versions['subfinder']['current_version']
                }
            else:
                return {
                    "success": False, 
                    "message": f"Ошибка обновления Subfinder: {result.stderr}"
                }
                
        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Таймаут обновления Subfinder"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def _update_nuclei(self) -> Dict[str, any]:
        """Обновить Nuclei"""
        try:
            # Скачиваем и устанавливаем последнюю версию
            result = subprocess.run([
                'go', 'install', '-v', 'github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest'
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                # Обновляем шаблоны
                subprocess.run(['nuclei', '-update-templates'], 
                             capture_output=True, text=True, timeout=120)
                
                # Обновляем информацию о версии
                self._check_nuclei_version()
                return {
                    "success": True, 
                    "message": "Nuclei успешно обновлен",
                    "new_version": self.scanner_versions['nuclei']['current_version']
                }
            else:
                return {
                    "success": False, 
                    "message": f"Ошибка обновления Nuclei: {result.stderr}"
                }
                
        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Таймаут обновления Nuclei"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def _update_nmap(self) -> Dict[str, any]:
        """Обновить Nmap"""
        try:
            # Для Nmap используем системный пакетный менеджер
            result = subprocess.run([
                'apt-get', 'update', '&&', 'apt-get', 'upgrade', '-y', 'nmap'
            ], shell=True, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                # Обновляем информацию о версии
                self._check_nmap_version()
                return {
                    "success": True, 
                    "message": "Nmap успешно обновлен",
                    "new_version": self.scanner_versions['nmap']['current_version']
                }
            else:
                return {
                    "success": False, 
                    "message": f"Ошибка обновления Nmap: {result.stderr}"
                }
                
        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Таймаут обновления Nmap"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def update_all_scanners(self) -> Dict[str, any]:
        """Обновить все сканеры"""
        results = {}
        
        for scanner_name in self.scanner_versions.keys():
            if self.scanner_versions[scanner_name]['update_available']:
                results[scanner_name] = self.update_scanner(scanner_name)
            else:
                results[scanner_name] = {
                    "success": True, 
                    "message": f"{scanner_name} уже актуален",
                    "skipped": True
                }
        
        return results
    
    def get_update_status(self) -> Dict[str, any]:
        """Получить статус обновлений"""
        return {
            "scanner_versions": self.scanner_versions,
            "last_checked": max([
                v['last_checked'] for v in self.scanner_versions.values() 
                if v['last_checked']
            ]) if any(v['last_checked'] for v in self.scanner_versions.values()) else None,
            "updates_available": any(
                v['update_available'] for v in self.scanner_versions.values()
            )
        }
    
    def schedule_auto_update(self, enabled: bool = True, check_interval_hours: int = 24):
        """Настроить автоматическое обновление"""
        # В реальном приложении здесь была бы интеграция с планировщиком задач
        # Пока что просто логируем настройки
        logger.info(f"Автоматическое обновление: {'включено' if enabled else 'отключено'}")
        logger.info(f"Интервал проверки: {check_interval_hours} часов")
        
        return {
            "enabled": enabled,
            "check_interval_hours": check_interval_hours,
            "next_check": datetime.now() + timedelta(hours=check_interval_hours)
        }

# Глобальный экземпляр сервиса обновлений
update_service = UpdateService()
