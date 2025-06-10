# 🛡️ Security Scanner v2.0

Автоматизированный сканер безопасности для обнаружения субдоменов, открытых портов и уязвимостей с интеграцией Telegram для отчетности.

## 📋 Описание

Security Scanner - это Python-приложение, которое автоматически:
- Находит субдомены для указанных доменов
- Проверяет их доступность
- Сканирует открытые порты
- Ищет уязвимости безопасности
- Генерирует детальные HTML отчеты
- Отправляет результаты в Telegram

## 🚀 Возможности

- **Поиск субдоменов** с использованием Subfinder
- **Сканирование портов** через Nmap
- **Поиск уязвимостей** с помощью Nuclei
- **Отслеживание изменений** между сканированиями
- **HTML отчеты** с современным дизайном
- **Telegram интеграция** для мгновенных уведомлений
- **Архивирование результатов** в ZIP формате

## 📦 Требования

### Системные зависимости

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y python3 python3-pip nmap

# CentOS/RHEL
sudo yum install -y python3 python3-pip nmap
```

### Python зависимости

```bash
pip3 install requests urllib3
```

### Внешние инструменты

1. **Subfinder** - для поиска субдоменов
```bash
# Установка через Go
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Или скачать бинарник
wget https://github.com/projectdiscovery/subfinder/releases/download/v2.6.3/subfinder_2.6.3_linux_amd64.zip
unzip subfinder_2.6.3_linux_amd64.zip
sudo mv subfinder /usr/local/bin/
```

2. **Nuclei** - для поиска уязвимостей
```bash
# Установка через Go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Или скачать бинарник
wget https://github.com/projectdiscovery/nuclei/releases/download/v3.0.4/nuclei_3.0.4_linux_amd64.zip
unzip nuclei_3.0.4_linux_amd64.zip
sudo mv nuclei /usr/local/bin/
```

## ⚙️ Настройка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd security-scanner
```

### 2. Настройка конфигурации

Отредактируйте файл `config.py`:

```python
# Telegram настройки (обязательно!)
TELEGRAM_TOKEN = 'YOUR_BOT_TOKEN'
CHAT_ID = 'YOUR_CHAT_ID'

# Домены для сканирования
DOMAINS = [
    'example.com',
    'yourdomain.com',
    'anotherdomain.com'
]

# Порты для сканирования
PORTS = "22,23,25,53,80,110,443,445,3306,3389,5900,8080,8443,9090"

# Уровни критичности уязвимостей
SEVERITY_LEVELS = "medium,high,critical"
```

### 3. Создание Telegram бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Создайте нового бота: `/newbot`
3. Получите токен бота
4. Узнайте ваш Chat ID:
   - Отправьте сообщение боту
   - Перейдите по ссылке: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Найдите `chat.id` в ответе

## 🏃‍♂️ Запуск

### Простой запуск

```bash
python3 main.py
```

### Запуск через cron (автоматизация)

```bash
# Редактирование crontab
crontab -e

# Добавить строку для ежедневного запуска в 2:00
0 2 * * * cd /path/to/security-scanner && python3 main.py >> /var/log/security-scanner.log 2>&1
```
```

## 📁 Структура проекта

```
security-scanner/
├── main.py              # Главный файл приложения
├── config.py            # Конфигурационные настройки
├── scanner.py           # Функции сканирования
├── report.py            # Генерация HTML отчетов
├── utils.py             # Вспомогательные функции
├── data/                # Данные о предыдущих сканированиях
├── reports/             # Временные HTML отчеты
└── scan_log.log         # Лог файл
```

## 📊 Пример вывода

```
============================================================
🛡️  SECURITY SCANNER v2.0
📅 Начало сканирования: 2024-06-10 14:30:00
🎯 Домены для сканирования: 2
   • example.com
   • testdomain.com
============================================================

🔍 Сканирование домена: example.com

   📡 Поиск субдоменов для example.com...
   ✅ Найдено субдоменов: 15

📊 Общая статистика субдоменов:
   📁 Предыдущих субдоменов: 12
   📁 Текущих субдоменов: 15
   🆕 Новых найденных: 3

🔍 Проверка доступности субдоменов...

   [1/15] Проверка: www.example.com
      ✅ Доступен
      🔍 Сканирование портов...
      📡 Открытых портов: 3
      🔍 Поиск уязвимостей...
      ⚠️ Найдено уязвимостей: 2

📦 Создание архива с отчетами...
📨 Отправка отчета в Telegram...

✅ Сканирование завершено успешно!
```

## 📝 Логирование

Все события записываются в файл `scan_log.log`:

```
2024-06-10 14:30:15 INFO: Найдено 15 субдоменов для example.com
2024-06-10 14:30:20 INFO: Запуск Nmap сканирования для www.example.com
2024-06-10 14:30:25 INFO: Запуск Nuclei сканирования для www.example.com
2024-06-10 14:35:00 INFO: Сообщение успешно отправлено в Telegram
```

## 🔧 Возможные проблемы и решения

### Ошибка: "Subfinder not found"
```bash
# Проверьте установку
which subfinder
# Если не найден, установите заново или обновите PATH
```

### Ошибка: "Permission denied" для Nmap
```bash
# Запустите с правами sudo или настройте capabilities
sudo setcap cap_net_raw,cap_net_admin,cap_net_bind_service+eip /usr/bin/nmap
```

### Telegram бот не отвечает
- Проверьте правильность токена
- Убедитесь, что бот добавлен в чат
- Проверьте Chat ID

### Высокое потребление ресурсов
```python
# В config.py уменьшите количество портов или измените severity
PORTS = "80,443,22"  # Только основные порты
SEVERITY_LEVELS = "high,critical"  # Только критичные уязвимости
```

## 🔒 Безопасность

- Храните `config.py` в безопасности (содержит токены)
- Используйте переменные окружения для чувствительных данных:

```python
import os
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN', 'default_token')
```

- Ограничьте права доступа к файлам:

```bash
chmod 600 config.py
chmod 644 *.py
```

## 📈 Расширение функциональности

### Добавление новых источников субдоменов

```python
# В scanner.py добавьте функцию для Amass
def get_subdomains_amass(domain):
    command = ['amass', 'enum', '-d', domain]
    # ... реализация
```

### Кастомные уведомления

```python
# В utils.py добавьте поддержку Slack/Discord
def send_slack_message(message, webhook_url):
    # ... реализация
```

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/new-feature`)
3. Зафиксируйте изменения (`git commit -am 'Add new feature'`)
4. Отправьте в ветку (`git push origin feature/new-feature`)
5. Создайте Pull Request



## ⚠️ Дисклеймер

Используйте этот инструмент только для тестирования собственных ресурсов или с письменного разрешения владельца. Авторы не несут ответственности за неправомерное использование.

## 📞 Поддержка

При возникновении проблем:
1. Проверьте раздел "Возможные проблемы"
2. Изучите лог файлы
3. Создайте issue в репозитории

---

**Security Scanner v2.0** - Ваш надежный помощник в обеспечении безопасности! 🛡️
