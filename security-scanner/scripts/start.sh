#!/bin/bash

# Скрипт запуска веб-панели сканера безопасности

set -e

echo "🛡️  Веб-панель сканера безопасности"
echo "=================================="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Создание необходимых директорий
echo "📁 Создание директорий..."
mkdir -p data reports logs

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Создаю из примера..."
    cp .env.example .env
    echo "📝 Отредактируйте файл .env с вашими настройками перед запуском!"
    echo "   Особенно важно настроить TELEGRAM_TOKEN и CHAT_ID"
    exit 1
fi

# Проверка конфигурации
echo "🔍 Проверка конфигурации..."
if ! grep -q "TELEGRAM_TOKEN=" .env || grep -q "your_bot_token_here" .env; then
    echo "⚠️  Не настроен TELEGRAM_TOKEN в .env файле"
    echo "   Получите токен у @BotFather в Telegram"
fi

if ! grep -q "CHAT_ID=" .env || grep -q "your_chat_id_here" .env; then
    echo "⚠️  Не настроен CHAT_ID в .env файле"
    echo "   Узнайте ваш Chat ID у @userinfobot в Telegram"
fi

# Сборка и запуск
echo "🔨 Сборка Docker образов..."
docker-compose build

echo "🚀 Запуск сервисов..."
docker-compose up -d

# Ожидание запуска сервисов
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
echo "📊 Статус сервисов:"
docker-compose ps

# Проверка доступности
echo "🔍 Проверка доступности..."

# Проверка backend
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend API доступен: http://localhost:8000"
    echo "📚 API документация: http://localhost:8000/docs"
else
    echo "❌ Backend API недоступен"
fi

# Проверка frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend доступен: http://localhost:3000"
else
    echo "❌ Frontend недоступен"
fi

echo ""
echo "🎉 Веб-панель сканера безопасности запущена!"
echo ""
echo "🌐 Доступные URL:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Полезные команды:"
echo "   Просмотр логов: docker-compose logs -f"
echo "   Остановка: docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo ""
echo "📖 Документация: README.md"
echo ""
echo "🛡️  Удачного сканирования!"
