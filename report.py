#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор HTML отчетов
"""

from datetime import datetime
from collections import defaultdict

def generate_html_report(domain, accessible_subdomains_info, new_subdomains, lost_subdomains):
    """Генерация HTML отчета с современным дизайном"""
    # Подсчет статистики
    total_subdomains = len(accessible_subdomains_info)
    total_vulnerabilities = sum(len(info['vulnerabilities']) for info in accessible_subdomains_info)
    
    # Группировка уязвимостей по severity
    vuln_by_severity = defaultdict(int)
    for info in accessible_subdomains_info:
        for vuln in info['vulnerabilities']:
            vuln_by_severity[vuln['severity'].lower()] += 1
    
    # Начинаем формировать HTML
    html_parts = []
    
    # Заголовок HTML
    html_parts.append('''<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Report - ''' + domain + '''</title>
    <style>''' + get_css_styles() + '''</style>
</head>
<body>
    <div class="container">''')
    
    # Header
    html_parts.append(f'''
        <div class="header">
            <h1>🛡️ Security Scan Report</h1>
            <div class="date">Domain: {domain} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>''')
    
    # Changes Section
    html_parts.append(generate_changes_section(new_subdomains, lost_subdomains))
    
    # Statistics
    html_parts.append(generate_statistics_section(total_subdomains, total_vulnerabilities, vuln_by_severity))
    
    # Subdomains
    html_parts.append(generate_subdomains_section(accessible_subdomains_info))
    
    # Footer
    html_parts.append(f'''
        <div class="footer">
            <p><strong>Automated Security Scanner</strong></p>
            <p>Powered by Subfinder, Nmap & Nuclei</p>
            <p>Report generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>''')
    
    return ''.join(html_parts)

def generate_html_report_v2(domain, accessible_subdomains_info, new_subdomains, lost_subdomains, 
                           new_active_subdomains, total_subdomains, active_subdomains):
    """Генерация HTML отчета с современным дизайном и расширенной статистикой"""
    # Подсчет статистики
    total_vulnerabilities = sum(len(info['vulnerabilities']) for info in accessible_subdomains_info)
    
    # Группировка уязвимостей по severity
    vuln_by_severity = defaultdict(int)
    for info in accessible_subdomains_info:
        for vuln in info['vulnerabilities']:
            vuln_by_severity[vuln['severity'].lower()] += 1
    
    # Начинаем формировать HTML
    html_parts = []
    
    # Заголовок HTML
    html_parts.append('''<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Report - ''' + domain + '''</title>
    <style>''' + get_css_styles() + '''</style>
</head>
<body>
    <div class="container">''')
    
    # Header
    html_parts.append(f'''
        <div class="header">
            <h1>🛡️ Security Scan Report</h1>
            <div class="date">Domain: {domain} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>''')
    
    # Changes Section с расширенной статистикой
    html_parts.append(generate_changes_section_v2(
        new_subdomains, lost_subdomains, new_active_subdomains, 
        total_subdomains, active_subdomains
    ))
    
    # Statistics
    html_parts.append(generate_statistics_section(active_subdomains, total_vulnerabilities, vuln_by_severity))
    
    # Subdomains
    html_parts.append(generate_subdomains_section(accessible_subdomains_info))
    
    # Footer
    html_parts.append(f'''
        <div class="footer">
            <p><strong>Automated Security Scanner</strong></p>
            <p>Powered by Subfinder, Nmap & Nuclei</p>
            <p>Report generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>''')
    
    return ''.join(html_parts)

def generate_html_report_v3(domain, accessible_subdomains_info, new_active_subdomains, 
                           lost_active_subdomains, total_subdomains, active_subdomains):
    """Генерация HTML отчета с фокусом на активные субдомены"""
    # Подсчет статистики
    total_vulnerabilities = sum(len(info['vulnerabilities']) for info in accessible_subdomains_info)
    
    # Группировка уязвимостей по severity
    vuln_by_severity = defaultdict(int)
    for info in accessible_subdomains_info:
        for vuln in info['vulnerabilities']:
            vuln_by_severity[vuln['severity'].lower()] += 1
    
    # Начинаем формировать HTML
    html_parts = []
    
    # Заголовок HTML
    html_parts.append('''<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Report - ''' + domain + '''</title>
    <style>''' + get_css_styles() + '''</style>
</head>
<body>
    <div class="container">''')
    
    # Header
    html_parts.append(f'''
        <div class="header">
            <h1>🛡️ Security Scan Report</h1>
            <div class="date">Domain: {domain} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>''')
    
    # Changes Section для активных субдоменов
    html_parts.append(generate_active_changes_section(
        new_active_subdomains, lost_active_subdomains, 
        total_subdomains, active_subdomains
    ))
    
    # Statistics
    html_parts.append(generate_statistics_section(active_subdomains, total_vulnerabilities, vuln_by_severity))
    
    # Subdomains
    html_parts.append(generate_subdomains_section(accessible_subdomains_info))
    
    # Footer
    html_parts.append(f'''
        <div class="footer">
            <p><strong>Automated Security Scanner</strong></p>
            <p>Powered by Subfinder, Nmap & Nuclei</p>
            <p>Report generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>''')
    
    return ''.join(html_parts)

def get_css_styles():
    """Возвращает CSS стили для отчета"""
    return '''
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0f0f1e; color: #e0e0e0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 20px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3); }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .header .date { font-size: 1rem; opacity: 0.9; }
        .summary-stats { background: #1a1a2e; padding: 25px; border-radius: 15px; border: 1px solid #2a2a3e; margin-bottom: 30px; }
        .summary-stats h3 { color: #667eea; margin-bottom: 15px; font-size: 1.3rem; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-item { background: #0f0f1e; padding: 15px; border-radius: 10px; border: 1px solid #2a2a3e; }
        .summary-item .value { font-size: 1.8rem; font-weight: 700; color: #667eea; }
        .summary-item .label { color: #888; font-size: 0.9rem; margin-top: 5px; }
        .changes-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .changes-card { background: #1a1a2e; padding: 20px; border-radius: 15px; border: 1px solid #2a2a3e; }
        .changes-card.new { border-left: 4px solid #2ed573; }
        .changes-card.lost { border-left: 4px solid #ff4757; }
        .changes-card h3 { margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
        .changes-card.new h3 { color: #2ed573; }
        .changes-card.lost h3 { color: #ff4757; }
        .changes-list { list-style: none; padding: 0; max-height: 400px; overflow-y: auto; }
        .changes-list li { padding: 5px 0; font-family: 'Courier New', monospace; font-size: 0.9rem; word-break: break-all; }
        .active-indicator { color: #667eea; font-size: 0.8rem; margin-left: 10px; }
        .active-badge { background: rgba(102, 126, 234, 0.2); color: #667eea; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #1a1a2e; padding: 25px; border-radius: 15px; border: 1px solid #2a2a3e; transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .stat-card .number { font-size: 2.5rem; font-weight: 700; margin-bottom: 5px; }
        .stat-card.critical .number { color: #ff4757; }
        .stat-card.high .number { color: #ff6348; }
        .stat-card.medium .number { color: #ffa502; }
        .stat-card.total .number { color: #667eea; }
        .stat-card.subdomains .number { color: #5f27cd; }
        .stat-card .label { color: #888; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
        .subdomain-card { background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 15px; margin-bottom: 25px; overflow: hidden; transition: all 0.3s ease; }
        .subdomain-card:hover { border-color: #667eea; box-shadow: 0 5px 20px rgba(102, 126, 234, 0.2); }
        .subdomain-header { background: #16213e; padding: 20px 25px; border-bottom: 1px solid #2a2a3e; display: flex; justify-content: space-between; align-items: center; }
        .subdomain-header h2 { font-size: 1.4rem; color: #667eea; word-break: break-all; }
        .vuln-badge { background: #2a2a3e; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; }
        .vuln-badge.has-vulns { background: rgba(255, 71, 87, 0.2); color: #ff4757; border: 1px solid #ff4757; }
        .vuln-badge.no-vulns { background: rgba(46, 213, 115, 0.2); color: #2ed573; border: 1px solid #2ed573; }
        .subdomain-content { padding: 25px; }
        .section { margin-bottom: 30px; }
        .section:last-child { margin-bottom: 0; }
        .section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 15px; color: #a0a0a0; display: flex; align-items: center; gap: 10px; }
        .section-title::before { content: ''; width: 4px; height: 20px; background: #667eea; border-radius: 2px; }
        .ports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .port-item { background: #0f0f1e; padding: 12px 16px; border-radius: 8px; border: 1px solid #2a2a3e; font-family: 'Courier New', monospace; font-size: 0.9rem; transition: all 0.2s ease; }
        .port-item:hover { border-color: #667eea; transform: translateX(3px); }
        .port-number { color: #667eea; font-weight: 600; }
        .port-service { color: #888; font-size: 0.85rem; }
        .vulnerability { background: #0f0f1e; border: 1px solid #2a2a3e; border-radius: 10px; padding: 20px; margin-bottom: 15px; transition: all 0.3s ease; }
        .vulnerability:hover { border-color: #667eea; transform: translateX(5px); }
        .vulnerability.critical { border-left: 4px solid #ff4757; }
        .vulnerability.high { border-left: 4px solid #ff6348; }
        .vulnerability.medium { border-left: 4px solid #ffa502; }
        .vuln-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .vuln-title { font-weight: 600; color: #e0e0e0; flex: 1; margin-right: 10px; }
        .severity-badge { padding: 4px 12px; border-radius: 15px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .severity-badge.critical { background: rgba(255, 71, 87, 0.2); color: #ff4757; }
        .severity-badge.high { background: rgba(255, 99, 72, 0.2); color: #ff6348; }
        .severity-badge.medium { background: rgba(255, 165, 2, 0.2); color: #ffa502; }
        .vuln-details { margin-top: 10px; color: #888; font-size: 0.9rem; }
        .vuln-template { font-family: 'Courier New', monospace; background: #1a1a2e; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; color: #667eea; }
        .no-vulnerabilities { text-align: center; padding: 40px; color: #2ed573; font-size: 1.1rem; }
        .no-vulnerabilities::before { content: '✓'; display: block; font-size: 3rem; margin-bottom: 10px; }
        .footer { margin-top: 50px; padding: 30px; background: #1a1a2e; border-radius: 15px; text-align: center; color: #888; }
        .footer p { margin-bottom: 5px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .subdomain-card { animation: fadeIn 0.6s ease-out; }
        @media (max-width: 768px) { .header h1 { font-size: 2rem; } .stats { grid-template-columns: 1fr; } .subdomain-header { flex-direction: column; gap: 10px; align-items: flex-start; } .changes-section { grid-template-columns: 1fr; } }
    '''

def generate_changes_section(new_subdomains, lost_subdomains):
    """Генерация секции изменений"""
    html = '<div class="changes-section">'
    
    # Новые субдомены
    html += f'<div class="changes-card new"><h3>🆕 Новые субдомены ({len(new_subdomains)})</h3><ul class="changes-list">'
    if new_subdomains:
        for subdomain in list(new_subdomains)[:10]:
            html += f'<li>{subdomain}</li>'
        if len(new_subdomains) > 10:
            html += f'<li>... и еще {len(new_subdomains) - 10}</li>'
    else:
        html += '<li>Новых субдоменов не найдено</li>'
    html += '</ul></div>'
    
    # Пропавшие субдомены
    html += f'<div class="changes-card lost"><h3>❌ Пропавшие субдомены ({len(lost_subdomains)})</h3><ul class="changes-list">'
    if lost_subdomains:
        for subdomain in list(lost_subdomains)[:10]:
            html += f'<li>{subdomain}</li>'
        if len(lost_subdomains) > 10:
            html += f'<li>... и еще {len(lost_subdomains) - 10}</li>'
    else:
        html += '<li>Пропавших субдоменов нет</li>'
    html += '</ul></div></div>'
    
    return html

def generate_changes_section_v2(new_subdomains, lost_subdomains, new_active_subdomains, 
                               total_subdomains, active_subdomains):
    """Генерация секции изменений с расширенной статистикой"""
    html = ''
    
    # Сводная статистика
    html += '<div class="summary-stats">'
    html += '<h3>📊 Сводная статистика</h3>'
    html += '<div class="summary-grid">'
    html += f'''
        <div class="summary-item">
            <div class="value">{total_subdomains}</div>
            <div class="label">Всего субдоменов</div>
        </div>
        <div class="summary-item">
            <div class="value">{active_subdomains}</div>
            <div class="label">Активных субдоменов</div>
        </div>
        <div class="summary-item">
            <div class="value">{len(new_subdomains)}</div>
            <div class="label">Новых субдоменов</div>
        </div>
        <div class="summary-item">
            <div class="value">{len(new_active_subdomains)}</div>
            <div class="label">Новых активных</div>
        </div>
    '''
    html += '</div></div>'
    
    # Детальная информация по изменениям
    html += '<div class="changes-section">'
    
    # Новые субдомены
    html += f'<div class="changes-card new"><h3>🆕 Новые субдомены ({len(new_subdomains)})</h3><ul class="changes-list">'
    if new_subdomains:
        for subdomain in list(new_subdomains)[:10]:
            is_active = subdomain in new_active_subdomains
            active_text = '<span class="active-indicator">[АКТИВЕН]</span>' if is_active else ''
            html += f'<li>{subdomain}{active_text}</li>'
        if len(new_subdomains) > 10:
            html += f'<li>... и еще {len(new_subdomains) - 10}</li>'
    else:
        html += '<li>Новых субдоменов не найдено</li>'
    html += '</ul></div>'
    
    # Пропавшие субдомены
    html += f'<div class="changes-card lost"><h3>❌ Пропавшие субдомены ({len(lost_subdomains)})</h3><ul class="changes-list">'
    if lost_subdomains:
        for subdomain in list(lost_subdomains)[:10]:
            html += f'<li>{subdomain}</li>'
        if len(lost_subdomains) > 10:
            html += f'<li>... и еще {len(lost_subdomains) - 10}</li>'
    else:
        html += '<li>Пропавших субдоменов нет</li>'
    html += '</ul></div></div>'
    
    return html

def generate_active_changes_section(new_active_subdomains, lost_active_subdomains, 
                                   total_subdomains, active_subdomains):
    """Генерация секции изменений для активных субдоменов"""
    html = ''
    
    # Сводная статистика
    html += '<div class="summary-stats">'
    html += '<h3>📊 Сводная статистика</h3>'
    html += '<div class="summary-grid">'
    html += f'''
        <div class="summary-item">
            <div class="value">{total_subdomains}</div>
            <div class="label">Всего субдоменов</div>
        </div>
        <div class="summary-item">
            <div class="value">{active_subdomains}</div>
            <div class="label">Активных субдоменов</div>
        </div>
        <div class="summary-item">
            <div class="value">{len(new_active_subdomains)}</div>
            <div class="label">Новых активных</div>
        </div>
        <div class="summary-item">
            <div class="value">{len(lost_active_subdomains)}</div>
            <div class="label">Пропавших активных</div>
        </div>
    '''
    html += '</div></div>'
    
    # Детальная информация по изменениям активных субдоменов
    html += '<div class="changes-section">'
    
    # Новые АКТИВНЫЕ субдомены
    html += f'<div class="changes-card new"><h3>🆕 Новые активные субдомены ({len(new_active_subdomains)})</h3><ul class="changes-list">'
    if new_active_subdomains:
        for subdomain in sorted(list(new_active_subdomains)):
            html += f'<li>{subdomain}<span class="active-badge">АКТИВЕН</span></li>'
    else:
        html += '<li>Новых активных субдоменов не найдено</li>'
    html += '</ul></div>'
    
    # Пропавшие АКТИВНЫЕ субдомены
    html += f'<div class="changes-card lost"><h3>❌ Пропавшие активные субдомены ({len(lost_active_subdomains)})</h3><ul class="changes-list">'
    if lost_active_subdomains:
        for subdomain in sorted(list(ost_active_subdomains)):
            html += f'<li>{subdomain}</li>'
    else:
        html += '<li>Пропавших активных субдоменов нет</li>'
    html += '</ul></div></div>'
    
    return html

def generate_statistics_section(total_subdomains, total_vulnerabilities, vuln_by_severity):
    """Генерация секции статистики"""
    return f'''
        <div class="stats">
            <div class="stat-card subdomains">
                <div class="number">{total_subdomains}</div>
                <div class="label">Active Subdomains</div>
            </div>
            <div class="stat-card total">
                <div class="number">{total_vulnerabilities}</div>
                <div class="label">Total Vulnerabilities</div>
            </div>
            <div class="stat-card critical">
                <div class="number">{vuln_by_severity.get('critical', 0)}</div>
                <div class="label">Critical</div>
            </div>
            <div class="stat-card high">
                <div class="number">{vuln_by_severity.get('high', 0)}</div>
                <div class="label">High</div>
            </div>
            <div class="stat-card medium">
                <div class="number">{vuln_by_severity.get('medium', 0)}</div>
                <div class="label">Medium</div>
            </div>
        </div>
    '''

def generate_subdomains_section(accessible_subdomains_info):
    """Генерация секции субдоменов"""
    html_parts = []
    
    for info in accessible_subdomains_info:
        subdomain = info['subdomain']
        open_ports = info['open_ports']
        vulnerabilities = info['vulnerabilities']
        vuln_count = len(vulnerabilities)
        
        # Начало карточки субдомена
        html_parts.append(f'<div class="subdomain-card">')
        html_parts.append(f'<div class="subdomain-header">')
        html_parts.append(f'<h2>{subdomain}</h2>')
        badge_class = 'has-vulns' if vuln_count > 0 else 'no-vulns'
        vuln_text = f'{vuln_count} vulnerabilit{"ies" if vuln_count != 1 else "y"} found'
        html_parts.append(f'<div class="vuln-badge {badge_class}">{vuln_text}</div>')
        html_parts.append('</div>')
        html_parts.append('<div class="subdomain-content">')
        
        # Секция портов
        html_parts.append('<div class="section">')
        html_parts.append(f'<div class="section-title">Open Ports ({len(open_ports)})</div>')
        html_parts.append('<div class="ports-grid">')
        for port_info in open_ports:
            html_parts.append(f'<div class="port-item">')
            html_parts.append(f'<div class="port-number">{port_info["port"]}/tcp</div>')
            html_parts.append(f'<div class="port-service">{port_info["service"]}</div>')
            html_parts.append('</div>')
        html_parts.append('</div></div>')
        
        # Секция уязвимостей
        html_parts.append('<div class="section">')
        html_parts.append('<div class="section-title">Detected Vulnerabilities</div>')
        
        if vulnerabilities:
            severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4, 'unknown': 5}
            sorted_vulns = sorted(vulnerabilities, key=lambda x: severity_order.get(x['severity'].lower(), 5))
            
            for vuln in sorted_vulns:
                severity = vuln['severity'].lower()
                html_parts.append(f'<div class="vulnerability {severity}">')
                html_parts.append('<div class="vuln-header">')
                html_parts.append(f'<div class="vuln-title">{vuln["name"]}</div>')
                html_parts.append(f'<span class="severity-badge {severity}">{vuln["severity"]}</span>')
                html_parts.append('</div>')
                html_parts.append('<div class="vuln-details">')
                html_parts.append(f'<div>Template: <span class="vuln-template">{vuln["template"]}</span></div>')
                if vuln.get("description"):
                    html_parts.append(f'<div>{vuln["description"]}</div>')
                html_parts.append('</div></div>')
        else:
            html_parts.append('<div class="no-vulnerabilities">No vulnerabilities detected</div>')
        
        html_parts.append('</div></div></div>')
    
    return ''.join(html_parts)
