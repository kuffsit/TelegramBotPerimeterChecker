#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Главный файл сканера безопасности
"""

import os
import json
import zipfile
import logging
import socket
from datetime import datetime
from collections import defaultdict

# Импорты модулей
from . import config
from .utils import (
    setup_logging, 
    send_telegram_message, 
    send_telegram_file,
    is_site_up,
    format_timestamp,
    get_emoji_for_vuln_count
)
from .scanner import (
    get_subdomains,
    scan_ports,
    scan_vulnerabilities,
    parse_open_ports,
    count_vulnerabilities_by_severity
)
from .report import generate_html_report_v3

def process_domain(domain):
    """Обработка одного домена"""
    # Убедимся, что директория для данных существует
    os.makedirs(config.DATA_DIR, exist_ok=True)
    
    # Файлы для хранения истории
    all_subdomains_file = os.path.join(config.DATA_DIR, f"{domain}_all_subdomains.json")
    active_subdomains_file = os.path.join(config.DATA_DIR, f"{domain}_active_subdomains.json")
    
    # Загрузка предыдущих данных
    if os.path.exists(all_subdomains_file):
        with open(all_subdomains_file, 'r') as f:
            previous_all_subdomains = set(json.load(f))
    else:
        previous_all_subdomains = set()
    
    if os.path.exists(active_subdomains_file):
        with open(active_subdomains_file, 'r') as f:
            previous_active_subdomains = set(json.load(f))
    else:
        previous_active_subdomains = set()

    print(f"\n🔍 Сканирование домена: {domain}")
    
    # Получаем текущие субдомены
    current_subdomains = get_subdomains(domain, config.SUBFINDER_PATH)
    current_subdomains_set = set(current_subdomains)
    
    # Сохраняем все найденные субдомены
    with open(all_subdomains_file, 'w') as f:
        json.dump(list(current_subdomains_set), f)
    
    # Вычисляем изменения для всех субдоменов (для информации)
    all_new_subdomains = current_subdomains_set - previous_all_subdomains
    all_lost_subdomains = previous_all_subdomains - current_subdomains_set
    
    print(f"\n📊 Общая статистика субдоменов:")
    print(f"   📁 Предыдущих субдоменов: {len(previous_all_subdomains)}")
    print(f"   📁 Текущих субдоменов: {len(current_subdomains_set)}")
    if all_new_subdomains:
        print(f"   🆕 Новых найденных: {len(all_new_subdomains)}")
    if all_lost_subdomains:
        print(f"   ❌ Пропавших из списка: {len(all_lost_subdomains)}")
    
    # Теперь проверяем доступность и собираем активные субдомены
    current_active_subdomains = set()
    accessible_subdomains_info = []
    total_vulns = 0
    vuln_by_severity = defaultdict(int)
    
    def get_ip_address(subdomain):
        """Получить IP адрес для поддомена"""
        try:
            return socket.gethostbyname(subdomain)
        except socket.gaierror:
            return None
    
    if not current_subdomains:
        print(f"   ⚠️  Субдомены не найдены для {domain}")
        return {
            'domain': domain,
            'total_subdomains': 0,
            'active_subdomains': 0,
            'new_active_subdomains': set(),
            'lost_active_subdomains': set(),
            'total_vulnerabilities': 0,
            'vulnerability_stats': "0 критических, 0 высоких, 0 средних",
            'html_report': None
        }
    
    # Сканируем каждый субдомен
    print(f"\n🔍 Проверка доступности субдоменов...")
    for i, subdomain in enumerate(current_subdomains, 1):
        print(f"\n   [{i}/{len(current_subdomains)}] Проверка: {subdomain}")
        
        if is_site_up(subdomain):
            print(f"      ✅ Доступен")
            current_active_subdomains.add(subdomain)
            
            # Сканирование портов
            print(f"      🔍 Сканирование портов...")
            port_scan_result = scan_ports(subdomain, config.NMAP_PATH, config.PORTS)
            open_ports = parse_open_ports(port_scan_result)
            print(f"      📡 Открытых портов: {len(open_ports)}")
            
            # Сканирование уязвимостей
            print(f"      🔍 Поиск уязвимостей...")
            vulnerabilities = scan_vulnerabilities(subdomain, config.NUCLEI_PATH, config.SEVERITY_LEVELS)
            vuln_count = len(vulnerabilities)
            
            if vuln_count > 0:
                print(f"      {'🚨' if vuln_count > 2 else '⚠️'} Найдено уязвимостей: {vuln_count}")
            else:
                print(f"      ✅ Уязвимости не найдены")
            
            total_vulns += vuln_count
            
            # Подсчет по уровням
            for vuln in vulnerabilities:
                vuln_by_severity[vuln['severity'].lower()] += 1
            
            # Получаем IP адрес для геолокации
            ip_address = get_ip_address(subdomain)
            
            accessible_subdomains_info.append({
                'name': subdomain,
                'ip': ip_address,
                'port_scan_result': port_scan_result,
                'ports': open_ports,
                'vulnerabilities': vulnerabilities
            })
        else:
            print(f"      ❌ Недоступен")
            logging.info(f'Субдомен {subdomain} недоступен')
    
    # Сохраняем текущие активные субдомены
    with open(active_subdomains_file, 'w') as f:
        json.dump(list(current_active_subdomains), f)
    
    # Вычисляем изменения в АКТИВНЫХ субдоменах (это важно!)
    new_active_subdomains = current_active_subdomains - previous_active_subdomains
    lost_active_subdomains = previous_active_subdomains - current_active_subdomains
    
    # Выводим статистику по активным субдоменам
    print(f"\n📊 Статистика АКТИВНЫХ субдоменов:")
    print(f"   ✅ Предыдущих активных: {len(previous_active_subdomains)}")
    print(f"   ✅ Текущих активных: {len(current_active_subdomains)}")
    
    if new_active_subdomains:
        print(f"   🆕 НОВЫХ АКТИВНЫХ субдоменов: {len(new_active_subdomains)}")
        for subdomain in list(new_active_subdomains)[:5]:
            print(f"      • {subdomain}")
        if len(new_active_subdomains) > 5:
            print(f"      ... и еще {len(new_active_subdomains) - 5}")
    
    if lost_active_subdomains:
        print(f"   ❌ ПРОПАВШИХ АКТИВНЫХ субдоменов: {len(lost_active_subdomains)}")
        for subdomain in list(lost_active_subdomains)[:5]:
            print(f"      • {subdomain}")
        if len(lost_active_subdomains) > 5:
            print(f"      ... и еще {len(lost_active_subdomains) - 5}")
    
    # Генерация HTML отчета с активными субдоменами
    html_report = None
    if accessible_subdomains_info or new_active_subdomains or lost_active_subdomains:
        html_report = generate_html_report_v3(
            domain, 
            accessible_subdomains_info, 
            new_active_subdomains,  # Передаем новые АКТИВНЫЕ
            lost_active_subdomains,  # Передаем пропавшие АКТИВНЫЕ
            len(current_subdomains_set),
            len(current_active_subdomains)
        )
    
    return {
        'domain': domain,
        'total_subdomains': len(current_subdomains_set),
        'active_subdomains': len(current_active_subdomains),
        'new_active_subdomains': list(new_active_subdomains),
        'lost_active_subdomains': list(lost_active_subdomains),
        'total_vulnerabilities': total_vulns,
        'vulnerability_stats': f"{vuln_by_severity.get('critical', 0)} критических, {vuln_by_severity.get('high', 0)} высоких, {vuln_by_severity.get('medium', 0)} средних",
        'html_report': html_report,
        'accessible_subdomains_info': accessible_subdomains_info
    }

def generate_and_send_reports(domains):
    """Генерация отчетов для всех доменов и отправка в Telegram"""
    print(f"\n📊 Обработка {len(domains)} доменов...")
    
    # Убедимся, что директория для отчетов существует
    os.makedirs(config.REPORTS_DIR, exist_ok=True)
    
    zip_filename = os.path.join(config.REPORTS_DIR, f"security_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip")
    summary_messages = []
    domain_reports = []
    
    # Общая статистика
    total_new_active = 0
    total_lost_active = 0
    
    # Обработка каждого домена
    for domain in domains:
        try:
            domain_info = process_domain(domain)
            domain_reports.append(domain_info)
            
            # Подсчет общей статистики
            total_new_active += len(domain_info['new_active_subdomains'])
            total_lost_active += len(domain_info['lost_active_subdomains'])
            
            # Формирование строки для сводки
            summary_message = f"• {domain}: {domain_info['total_vulnerabilities']} уязвимостей ({domain_info['vulnerability_stats']})"
            if domain_info['new_active_subdomains']:
                summary_message += f"\n  🆕 Новых активных: {len(domain_info['new_active_subdomains'])}"
            if domain_info['lost_active_subdomains']:
                summary_message += f"\n  ❌ Пропало активных: {len(domain_info['lost_active_subdomains'])}"
            
            summary_messages.append(summary_message)
            
        except Exception as e:
            logging.error(f'Ошибка при обработке домена {domain}: {e}', exc_info=True)
            print(f"\n❌ Ошибка при обработке {domain}: {e}")
            summary_messages.append(f"• {domain}: ❌ Ошибка сканирования")
    
    # Создание ZIP архива
    print(f"\n📦 Создание архива с отчетами...")
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for report_info in domain_reports:
            if report_info['html_report']:
                report_filename = f"{report_info['domain']}_report_{datetime.now().strftime('%Y%m%d')}.html"
                zipf.writestr(report_filename, report_info['html_report'])
    
    # Формирование общего сообщения
    full_summary_message = f"<b>🛡️ Общий отчет по безопасности</b>\n"
    full_summary_message += f"📅 Дата: {format_timestamp()}\n\n"
    
    # Добавляем общую статистику по изменениям активных субдоменов
    if total_new_active > 0 or total_lost_active > 0:
        full_summary_message += "<b>📊 Изменения в активных субдоменах:</b>\n"
        if total_new_active > 0:
            full_summary_message += f"🆕 Новых активных субдоменов: {total_new_active}\n"
        if total_lost_active > 0:
            full_summary_message += f"❌ Пропавших активных субдоменов: {total_lost_active}\n"
        full_summary_message += "\n"
    
    full_summary_message += "<b>📊 Сводка по доменам:</b>\n"
    full_summary_message += "\n".join(summary_messages)
    
    # Подсчет общей статистики
    total_vulns = sum(report['total_vulnerabilities'] for report in domain_reports)
    total_active = sum(report['active_subdomains'] for report in domain_reports)
    
    full_summary_message += f"\n\n<b>📈 Итого:</b>\n"
    full_summary_message += f"• Просканировано доменов: {len(domains)}\n"
    full_summary_message += f"• Активных субдоменов: {total_active}\n"
    full_summary_message += f"• Общее количество уязвимостей: {total_vulns}\n"
    
    # Отправка в Telegram
    print(f"\n📨 Отправка отчета в Telegram...")
    if len(full_summary_message) < 4096:
        send_telegram_message(full_summary_message, config.TELEGRAM_TOKEN, config.CHAT_ID)
    else:
        # Краткая версия
        short_summary = f"<b>🛡️ Общий отчет по безопасности</b>\n"
        short_summary += f"📅 {format_timestamp()}\n\n"
        short_summary += f"Просканировано доменов: {len(domains)}\n"
        short_summary += f"Активных субдоменов: {total_active}\n"
        short_summary += f"Общее количество уязвимостей: {total_vulns}\n"
        short_summary += "\nДетальный отчет в прикрепленном файле."
        send_telegram_message(short_summary, config.TELEGRAM_TOKEN, config.CHAT_ID)
    
    # Отправка ZIP архива
    send_telegram_file("📎 Детальные отчеты по каждому домену", zip_filename, 
                      config.TELEGRAM_TOKEN, config.CHAT_ID)
    
    # Удаление временного файла
    try:
        os.remove(zip_filename)
    except Exception as e:
        logging.error(f'Ошибка при удалении zip файла: {e}')

def main():
    """Главная функция"""
    print("="*60)
    print("🛡️  SECURITY SCANNER v2.0")
    print(f"📅 Начало сканирования: {format_timestamp()}")
    print(f"🎯 Домены для сканирования: {len(config.DOMAINS)}")
    for domain in config.DOMAINS:
        print(f"   • {domain}")
    print("="*60)
    
    # Логирование
    setup_logging(config.LOG_FILE, config.LOG_LEVEL)
    
    try:
        generate_and_send_reports(config.DOMAINS)
        print("\n✅ Сканирование завершено успешно!")
        logging.info('Сканирование завершено успешно')
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        logging.error(f'Критическая ошибка: {e}', exc_info=True)
        send_telegram_message(
            f"❌ <b>Критическая ошибка при сканировании:</b>\n{str(e)}", 
            config.TELEGRAM_TOKEN, 
            config.CHAT_ID
        )
    
    print("="*60)

if __name__ == "__main__":
    main()
