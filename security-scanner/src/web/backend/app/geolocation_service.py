#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сервис для определения геолокации по IP адресам
"""

import os
import sys
import requests
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging

# Добавляем родительскую директорию в путь
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.app.database import SessionLocal
from backend.app import models
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class GeolocationService:
    """Сервис для определения геолокации"""
    
    def __init__(self):
        self.geoip_api_url = "http://ip-api.com/json/"
        self.cache = {}  # Простой кэш для IP адресов
        self.cache_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'data', 'geoip_cache.json'
        )
        self.load_cache()
    
    def load_cache(self):
        """Загрузить кэш из файла"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    self.cache = json.load(f)
                logger.info(f"Загружен кэш геолокации: {len(self.cache)} записей")
        except Exception as e:
            logger.error(f"Ошибка загрузки кэша геолокации: {e}")
            self.cache = {}
    
    def save_cache(self):
        """Сохранить кэш в файл"""
        try:
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Ошибка сохранения кэша геолокации: {e}")
    
    def get_geolocation(self, ip_address: str) -> Optional[Dict]:
        """Получить геолокацию по IP адресу"""
        if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1']:
            return None
        
        # Проверяем кэш
        if ip_address in self.cache:
            return self.cache[ip_address]
        
        try:
            # Используем бесплатный API ip-api.com
            response = requests.get(f"{self.geoip_api_url}{ip_address}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') == 'success':
                    geo_data = {
                        'ip': ip_address,
                        'country': data.get('country', 'Unknown'),
                        'country_code': data.get('countryCode', ''),
                        'region': data.get('regionName', ''),
                        'city': data.get('city', ''),
                        'latitude': data.get('lat', 0.0),
                        'longitude': data.get('lon', 0.0),
                        'timezone': data.get('timezone', ''),
                        'isp': data.get('isp', ''),
                        'org': data.get('org', ''),
                        'as': data.get('as', ''),
                        'query_time': datetime.now().isoformat()
                    }
                    
                    # Сохраняем в кэш
                    self.cache[ip_address] = geo_data
                    self.save_cache()
                    
                    return geo_data
                else:
                    logger.warning(f"Не удалось получить геолокацию для IP {ip_address}: {data.get('message', 'Unknown error')}")
                    return None
            else:
                logger.error(f"Ошибка API геолокации для IP {ip_address}: HTTP {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Ошибка получения геолокации для IP {ip_address}: {e}")
            return None
    
    def get_subdomain_geolocation(self, subdomain: str) -> Optional[Dict]:
        """Получить геолокацию для поддомена"""
        try:
            # Получаем IP адрес поддомена
            import socket
            ip_address = socket.gethostbyname(subdomain)
            return self.get_geolocation(ip_address)
        except Exception as e:
            logger.error(f"Ошибка получения IP для поддомена {subdomain}: {e}")
            return None
    
    def get_scan_geolocations(self, scan_id: int) -> List[Dict]:
        """Получить геолокации для всех поддоменов сканирования"""
        db = SessionLocal()
        try:
            scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
            if not scan or not scan.scan_details:
                return []
            
            geolocations = []
            subdomains = scan.scan_details.get('subdomains', [])
            
            for subdomain_data in subdomains:
                subdomain_name = subdomain_data.get('name', '')
                ip_address = subdomain_data.get('ip', '')
                
                if ip_address:
                    geo_data = self.get_geolocation(ip_address)
                    if geo_data:
                        geo_data['subdomain'] = subdomain_name
                        geo_data['vulnerabilities'] = len(subdomain_data.get('vulnerabilities', []))
                        geolocations.append(geo_data)
            
            return geolocations
            
        except Exception as e:
            logger.error(f"Ошибка получения геолокаций для сканирования {scan_id}: {e}")
            return []
        finally:
            db.close()
    
    def get_all_geolocations(self) -> Dict:
        """Получить все геолокации из базы данных"""
        db = SessionLocal()
        try:
            # Получаем все завершенные сканирования
            scans = db.query(models.Scan).filter(
                models.Scan.status == 'completed',
                models.Scan.scan_details.isnot(None)
            ).all()
            
            all_geolocations = []
            countries_stats = {}
            cities_stats = {}
            
            for scan in scans:
                geolocations = self.get_scan_geolocations(scan.id)
                all_geolocations.extend(geolocations)
                
                # Собираем статистику
                for geo in geolocations:
                    country = geo.get('country', 'Unknown')
                    city = geo.get('city', 'Unknown')
                    
                    # Статистика по странам
                    if country not in countries_stats:
                        countries_stats[country] = {
                            'count': 0,
                            'vulnerabilities': 0,
                            'critical_vulns': 0,
                            'latitude': geo.get('latitude', 0),
                            'longitude': geo.get('longitude', 0)
                        }
                    countries_stats[country]['count'] += 1
                    countries_stats[country]['vulnerabilities'] += geo.get('vulnerabilities', 0)
                    
                    # Статистика по городам
                    city_key = f"{city}, {country}"
                    if city_key not in cities_stats:
                        cities_stats[city_key] = {
                            'country': country,
                            'city': city,
                            'count': 0,
                            'vulnerabilities': 0,
                            'critical_vulns': 0,
                            'latitude': geo.get('latitude', 0),
                            'longitude': geo.get('longitude', 0)
                        }
                    cities_stats[city_key]['count'] += 1
                    cities_stats[city_key]['vulnerabilities'] += geo.get('vulnerabilities', 0)
            
            return {
                'geolocations': all_geolocations,
                'countries_stats': countries_stats,
                'cities_stats': cities_stats,
                'total_subdomains': len(all_geolocations),
                'total_countries': len(countries_stats),
                'total_cities': len(cities_stats)
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения всех геолокаций: {e}")
            return {
                'geolocations': [],
                'countries_stats': {},
                'cities_stats': {},
                'total_subdomains': 0,
                'total_countries': 0,
                'total_cities': 0
            }
        finally:
            db.close()

# Глобальный экземпляр сервиса
geolocation_service = GeolocationService()
