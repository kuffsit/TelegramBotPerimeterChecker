#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сервис для запуска сканирований
"""

import os
import sys
from datetime import datetime
from typing import List

# Добавляем родительскую директорию в путь для импорта модулей сканера
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.app.database import SessionLocal
from sqlalchemy.orm import Session
from backend.app import models
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
import scanner.core.config as config
from scanner.core.main import process_domain
from scanner.core.report import generate_html_report_v3
from backend.app.geolocation_service import geolocation_service


class ScannerService:
    """Сервис для управления сканированиями"""
    
    def __init__(self):
        self.reports_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'reports'
        )
        os.makedirs(self.reports_dir, exist_ok=True)
    
    def run_scans(self, scan_ids: List[int]):
        """Запустить сканирования для списка ID"""
        db = SessionLocal()
        
        try:
            for scan_id in scan_ids:
                self.run_single_scan(scan_id, db)
        finally:
            db.close()
    
    def run_single_scan(self, scan_id: int, db: Session):
        """Запустить одно сканирование"""
        scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
        if not scan:
            return
        
        domain = scan.domain
        
        try:
            # Обновляем статус на "running"
            scan.status = "running"
            db.commit()
            
            print(f"\n[Scanner Service] Запуск сканирования для {domain.name}")
            
            # Запуск сканирования
            result = process_domain(domain.name)
            
            # Обновляем статистику в БД
            scan.total_subdomains = result['total_subdomains']
            scan.active_subdomains = result['active_subdomains']
            scan.new_active_subdomains = len(result['new_active_subdomains'])
            scan.lost_active_subdomains = len(result['lost_active_subdomains'])
            scan.total_vulnerabilities = result['total_vulnerabilities']
            
            # Сохраняем детали сканирования с геолокацией
            scan_details = {
                'subdomains': result.get('accessible_subdomains_info', []),
                'scan_time': datetime.now().isoformat(),
                'domain': domain.name
            }
            scan.scan_details = scan_details
            
            # Парсим статистику уязвимостей
            vuln_stats = result['vulnerability_stats']
            if 'критических' in vuln_stats:
                parts = vuln_stats.split(',')
                scan.critical_vulns = int(parts[0].split()[0])
                scan.high_vulns = int(parts[1].split()[0])
                scan.medium_vulns = int(parts[2].split()[0])
            
            # Сохраняем HTML отчет
            if result['html_report']:
                report_filename = f"{domain.name}_scan_{scan_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                report_path = os.path.join(self.reports_dir, report_filename)
                
                with open(report_path, 'w', encoding='utf-8') as f:
                    f.write(result['html_report'])
                
                scan.report_path = report_path
            
            # Обновляем статус на "completed"
            scan.status = "completed"
            scan.completed_at = datetime.now()
            
            print(f"[Scanner Service] Сканирование завершено успешно: {domain.name}")
            
        except Exception as e:
            print(f"[Scanner Service] Ошибка при сканировании {domain.name}: {e}")
            scan.status = "failed"
            scan.error_message = str(e)
            scan.completed_at = datetime.now()
        
        finally:
            db.commit()

