"""
Сервис экспорта отчетов в различные форматы
"""
import os
import sys
import io
import csv
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import pandas as pd
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Добавляем путь к корневой директории проекта
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app import models

class ExportService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Настройка пользовательских стилей для PDF"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6
        ))

    def export_scans_to_pdf(self, scans: List[models.Scan], domains: List[models.Domain], output_path: str = None) -> str:
        """Экспорт сканирований в PDF"""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"/tmp/scans_report_{timestamp}.pdf"
        
        # Создаем PDF документ
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # Заголовок
        title = Paragraph("Отчет по сканированиям безопасности", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Информация о генерации
        gen_info = Paragraph(f"Сгенерировано: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}", self.styles['CustomBody'])
        story.append(gen_info)
        story.append(Spacer(1, 20))
        
        # Общая статистика
        total_scans = len(scans)
        completed_scans = len([s for s in scans if s.status == 'completed'])
        failed_scans = len([s for s in scans if s.status == 'failed'])
        total_vulnerabilities = sum(s.total_vulnerabilities for s in scans)
        
        stats_data = [
            ['Всего сканирований', str(total_scans)],
            ['Завершенных', str(completed_scans)],
            ['Неудачных', str(failed_scans)],
            ['Всего уязвимостей', str(total_vulnerabilities)]
        ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(Paragraph("Общая статистика", self.styles['CustomHeading']))
        story.append(stats_table)
        story.append(Spacer(1, 20))
        
        # Детальная таблица сканирований
        if scans:
            story.append(Paragraph("Детальная информация по сканированиям", self.styles['CustomHeading']))
            
            # Создаем таблицу данных
            table_data = [['Домен', 'Статус', 'Дата начала', 'Поддомены', 'Уязвимости', 'Критические']]
            
            for scan in scans:
                domain = next((d for d in domains if d.id == scan.domain_id), None)
                domain_name = domain.name if domain else f"ID: {scan.domain_id}"
                
                table_data.append([
                    domain_name,
                    scan.status,
                    scan.started_at.strftime('%d.%m.%Y %H:%M'),
                    str(scan.total_subdomains),
                    str(scan.total_vulnerabilities),
                    str(scan.critical_vulns)
                ])
            
            # Создаем таблицу
            table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1.5*inch, 0.8*inch, 0.8*inch, 0.8*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
            ]))
            
            story.append(table)
        
        # Строим PDF
        doc.build(story)
        return output_path

    def export_scans_to_excel(self, scans: List[models.Scan], domains: List[models.Domain], output_path: str = None) -> str:
        """Экспорт сканирований в Excel"""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"/tmp/scans_report_{timestamp}.xlsx"
        
        # Подготавливаем данные
        data = []
        for scan in scans:
            domain = next((d for d in domains if d.id == scan.domain_id), None)
            domain_name = domain.name if domain else f"ID: {scan.domain_id}"
            
            data.append({
                'Домен': domain_name,
                'Статус': scan.status,
                'Дата начала': scan.started_at.strftime('%d.%m.%Y %H:%M:%S'),
                'Дата завершения': scan.completed_at.strftime('%d.%m.%Y %H:%M:%S') if scan.completed_at else 'Не завершено',
                'Всего поддоменов': scan.total_subdomains,
                'Активных поддоменов': scan.active_subdomains,
                'Всего уязвимостей': scan.total_vulnerabilities,
                'Критические': scan.critical_vulns,
                'Высокие': scan.high_vulns,
                'Средние': scan.medium_vulns,
                'Низкие': scan.low_vulns,
                'Ошибка': scan.error_message if scan.error_message else ''
            })
        
        # Создаем DataFrame
        df = pd.DataFrame(data)
        
        # Создаем Excel файл с несколькими листами
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Основной лист с данными
            df.to_excel(writer, sheet_name='Сканирования', index=False)
            
            # Лист со статистикой
            stats_data = {
                'Метрика': [
                    'Всего сканирований',
                    'Завершенных',
                    'Неудачных',
                    'Всего уязвимостей',
                    'Критических уязвимостей',
                    'Высоких уязвимостей',
                    'Средних уязвимостей',
                    'Низких уязвимостей'
                ],
                'Значение': [
                    len(scans),
                    len([s for s in scans if s.status == 'completed']),
                    len([s for s in scans if s.status == 'failed']),
                    sum(s.total_vulnerabilities for s in scans),
                    sum(s.critical_vulns for s in scans),
                    sum(s.high_vulns for s in scans),
                    sum(s.medium_vulns for s in scans),
                    sum(s.low_vulns for s in scans)
                ]
            }
            
            stats_df = pd.DataFrame(stats_data)
            stats_df.to_excel(writer, sheet_name='Статистика', index=False)
            
            # Лист с доменами
            domains_data = []
            for domain in domains:
                domain_scans = [s for s in scans if s.domain_id == domain.id]
                domains_data.append({
                    'Домен': domain.name,
                    'Описание': domain.description or '',
                    'Активен': 'Да' if domain.is_active else 'Нет',
                    'Количество сканирований': len(domain_scans),
                    'Последнее сканирование': max([s.started_at for s in domain_scans]).strftime('%d.%m.%Y %H:%M:%S') if domain_scans else 'Нет'
                })
            
            domains_df = pd.DataFrame(domains_data)
            domains_df.to_excel(writer, sheet_name='Домены', index=False)
        
        return output_path

    def export_scans_to_csv(self, scans: List[models.Scan], domains: List[models.Domain], output_path: str = None) -> str:
        """Экспорт сканирований в CSV"""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"/tmp/scans_report_{timestamp}.csv"
        
        # Подготавливаем данные
        data = []
        for scan in scans:
            domain = next((d for d in domains if d.id == scan.domain_id), None)
            domain_name = domain.name if domain else f"ID: {scan.domain_id}"
            
            data.append({
                'domain': domain_name,
                'status': scan.status,
                'started_at': scan.started_at.strftime('%d.%m.%Y %H:%M:%S'),
                'completed_at': scan.completed_at.strftime('%d.%m.%Y %H:%M:%S') if scan.completed_at else '',
                'total_subdomains': scan.total_subdomains,
                'active_subdomains': scan.active_subdomains,
                'total_vulnerabilities': scan.total_vulnerabilities,
                'critical_vulns': scan.critical_vulns,
                'high_vulns': scan.high_vulns,
                'medium_vulns': scan.medium_vulns,
                'low_vulns': scan.low_vulns,
                'error_message': scan.error_message if scan.error_message else ''
            })
        
        # Записываем в CSV
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            if data:
                fieldnames = data[0].keys()
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(data)
        
        return output_path

    def export_vulnerabilities_to_pdf(self, vulnerabilities_data: Dict[str, Any], output_path: str = None) -> str:
        """Экспорт уязвимостей в PDF"""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"/tmp/vulnerabilities_report_{timestamp}.pdf"
        
        # Создаем PDF документ
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # Заголовок
        title = Paragraph("Отчет по уязвимостям", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Информация о генерации
        gen_info = Paragraph(f"Сгенерировано: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}", self.styles['CustomBody'])
        story.append(gen_info)
        story.append(Spacer(1, 20))
        
        # Статистика уязвимостей
        stats_data = [
            ['Всего уязвимостей', str(vulnerabilities_data.get('total', 0))],
            ['Критические', str(vulnerabilities_data.get('critical', 0))],
            ['Высокие', str(vulnerabilities_data.get('high', 0))],
            ['Средние', str(vulnerabilities_data.get('medium', 0))],
            ['Низкие', str(vulnerabilities_data.get('low', 0))]
        ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(Paragraph("Статистика уязвимостей", self.styles['CustomHeading']))
        story.append(stats_table)
        story.append(Spacer(1, 20))
        
        # Уязвимости по доменам
        if 'by_domain' in vulnerabilities_data:
            story.append(Paragraph("Уязвимости по доменам", self.styles['CustomHeading']))
            
            domain_data = [['Домен', 'Количество уязвимостей']]
            for domain, count in vulnerabilities_data['by_domain'].items():
                domain_data.append([domain, str(count)])
            
            domain_table = Table(domain_data, colWidths=[4*inch, 2*inch])
            domain_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(domain_table)
        
        # Строим PDF
        doc.build(story)
        return output_path

# Глобальный экземпляр сервиса экспорта
export_service = ExportService()
