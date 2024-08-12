import asyncio
from telegram import Bot

async def get_chat_id(telegram_token):
    # Initialize the bot
    bot = Bot(token=telegram_token)

    # Get updates from the bot
    updates = await bot.get_updates()

    # Print chat_id from the last update
    if updates:
        chat_id = updates[-1].message.chat.id
        print(f"Your Chat ID: {chat_id}")
    else:
        print("No new messages to retrieve the Chat ID.")

# Prompt the user to enter their API Token
telegram_token = input("Please enter your Telegram API Token: ")

# Run the asynchronous function
asyncio.run(get_chat_id(telegram_token))
