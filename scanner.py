#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Основные функции сканирования
"""

import subprocess
import json
import logging
import re
from collections import defaultdict

def get_subdomains(domain, subfinder_path):
    """Получение субдоменов с использованием Subfinder"""
    try:
        print(f"   📡 Поиск субдоменов для {domain}...")
        command = [subfinder_path, '-d', domain, '-silent']
        result = subprocess.run(command, capture_output=True, text=True, timeout=300)
        
        subdomains = set(result.stdout.splitlines())
        if subdomains:
            logging.info(f'Найдено {len(subdomains)} субдоменов для {domain}')
            print(f"   ✅ Найдено субдоменов: {len(subdomains)}")
            return list(subdomains)
        else:
            logging.warning(f'Не найдено субдоменов для {domain}')
            print(f"   ⚠️  Субдомены не найдены")
            return []
    except subprocess.TimeoutExpired:
        logging.error(f'Таймаут при поиске субдоменов для {domain}')
        print(f"   ❌ Таймаут при поиске субдоменов")
        return []
    except Exception as e:
        logging.error(f'Ошибка при получении субдоменов для {domain}: {e}')
        print(f"   ❌ Ошибка: {e}")
        return []

def scan_ports(subdomain, nmap_path, ports):
    """Сканирование портов с использованием Nmap"""
    try:
        command = [nmap_path, '-p', ports, subdomain, '--open', '--no-styles']
        logging.info(f'Запуск Nmap сканирования для {subdomain}')
        result = subprocess.run(command, capture_output=True, text=True, timeout=120)
        return result.stdout
    except subprocess.TimeoutExpired:
        logging.error(f'Таймаут при сканировании портов для {subdomain}')
        return "Timeout during port scan"
    except Exception as e:
        logging.error(f'Ошибка при сканировании портов для {subdomain}: {e}')
        return f"Error: {e}"

def scan_vulnerabilities(subdomain, nuclei_path, severity_levels):
    """Сканирование уязвимостей с использованием Nuclei"""
    try:
        # Используем JSON формат для лучшего парсинга
        command = [nuclei_path, '-u', subdomain, '-silent', '-no-color', 
                  '-severity', severity_levels, '-j']
        logging.info(f'Запуск Nuclei сканирования для {subdomain}')
        result = subprocess.run(command, capture_output=True, text=True, timeout=300)
        
        vulnerabilities = []
        for line in result.stdout.splitlines():
            if line.strip():
                try:
                    vuln_data = json.loads(line)
                    vulnerabilities.append({
                        'template': vuln_data.get('template-id', 'Unknown'),
                        'name': vuln_data.get('info', {}).get('name', 'Unknown vulnerability'),
                        'severity': vuln_data.get('info', {}).get('severity', 'unknown'),
                        'matched': vuln_data.get('matched-at', subdomain),
                        'description': vuln_data.get('info', {}).get('description', '')
                    })
                except json.JSONDecodeError:
                    # Парсинг текстового формата
                    if line and not line.startswith('['):
                        severity_match = re.search(r'\[(critical|high|medium)\]', line, re.IGNORECASE)
                        severity = severity_match.group(1) if severity_match else 'unknown'
                        
                        vulnerabilities.append({
                            'template': 'text-output',
                            'name': line.strip(),
                            'severity': severity,
                            'matched': subdomain,
                            'description': ''
                        })
        
        return vulnerabilities
    except subprocess.TimeoutExpired:
        logging.error(f'Таймаут при сканировании уязвимостей для {subdomain}')
        return []
    except Exception as e:
        logging.error(f'Ошибка при сканировании уязвимостей для {subdomain}: {e}')
        return []

def parse_open_ports(port_scan_result):
    """Парсинг результатов сканирования портов"""
    open_ports = []
    for line in port_scan_result.splitlines():
        if '/tcp' in line and 'open' in line:
            parts = line.split()
            if len(parts) >= 3:
                port = parts[0].split('/')[0]
                service = parts[2]
                open_ports.append({'port': port, 'service': service})
    return open_ports

def count_vulnerabilities_by_severity(vulnerabilities):
    """Подсчет уязвимостей по уровням критичности"""
    vuln_by_severity = defaultdict(int)
    for vuln in vulnerabilities:
        vuln_by_severity[vuln['severity'].lower()] += 1
    return dict(vuln_by_severity)
