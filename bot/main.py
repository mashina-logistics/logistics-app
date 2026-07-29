import os
import logging
import httpx
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from dotenv import load_dotenv

load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Переменные окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")
API_URL = os.getenv("API_URL", "https://logistics-app-production-e4a3.up.railway.app")

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# URL веб-приложения (Netlify)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://logistics-frontend.netlify.app")


# ===== КОМАНДА /START =====
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    """Приветствие и регистрация пользователя"""
    user_id = message.from_user.id
    first_name = message.from_user.first_name or "Пользователь"
    last_name = message.from_user.last_name or ""
    full_name = f"{first_name} {last_name}".strip()
    
    # Пытаемся найти пользователя в базе
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_URL}/users/by-messenger/{user_id}")
            
            if response.status_code == 200:
                user_data = response.json()
                role = user_data.get("role", "driver")
                
                if role == "driver":
                    text = (
                        f"👋 Привет, {full_name}!\n\n"
                        f"Вы зарегистрированы как <b>водитель</b>.\n\n"
                        f"Используйте меню ниже для работы с рейсами."
                    )
                else:
                    text = (
                        f"👋 Привет, {full_name}!\n\n"
                        f"Вы зарегистрированы как <b>логист</b>.\n\n"
                        f"Используйте веб-приложение для управления рейсами."
                    )
            else:
                # Пользователь не найден — предлагаем зарегистрироваться
                text = (
                    f"👋 Привет, {full_name}!\n\n"
                    f"Я бот для управления логистикой. "
                    f"Чтобы начать работу, выберите вашу роль:"
                )
                
                # Клавиатура с выбором роли
                kb = ReplyKeyboardMarkup(
                    keyboard=[
                        [KeyboardButton(text="🚚 Я водитель"), KeyboardButton(text=" Я логист")]
                    ],
                    resize_keyboard=True
                )
                await message.answer(text, reply_markup=kb, parse_mode="HTML")
                return
    except Exception as e:
        logger.error(f"Ошибка при проверке пользователя: {e}")
        text = f" Привет, {full_name}! Выберите вашу роль:"
        kb = ReplyKeyboardMarkup(
            keyboard=[
                [KeyboardButton(text="🚚 Я водитель"), KeyboardButton(text="💼 Я логист")]
            ],
            resize_keyboard=True
        )
        await message.answer(text, reply_markup=kb, parse_mode="HTML")
        return
    
    # Если пользователь найден — показываем главное меню
    await show_main_menu(message, role)


# ===== ВЫБОР РОЛИ =====
@dp.message(F.text == "🚚 Я водитель")
async def register_driver(message: types.Message):
    """Регистрация водителя"""
    user_id = message.from_user.id
    first_name = message.from_user.first_name or ""
    last_name = message.from_user.last_name or ""
    full_name = f"{first_name} {last_name}".strip()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/users/",
                json={
                    "messenger_id": str(user_id),
                    "full_name": full_name,
                    "role": "driver",
                    "phone": ""
                }
            )
            
            if response.status_code in [200, 201]:
                await message.answer(
                    f"✅ Вы успешно зарегистрированы как <b>водитель</b>!\n\n"
                    f"Теперь вы можете получать рейсы и загружать документы.",
                    parse_mode="HTML"
                )
                await show_main_menu(message, "driver")
            else:
                await message.answer("❌ Ошибка регистрации. Попробуйте позже.")
    except Exception as e:
        logger.error(f"Ошибка регистрации водителя: {e}")
        await message.answer("❌ Ошибка сети. Попробуйте позже.")


@dp.message(F.text == "💼 Я логист")
async def register_logistician(message: types.Message):
    """Регистрация логиста"""
    user_id = message.from_user.id
    first_name = message.from_user.first_name or ""
    last_name = message.from_user.last_name or ""
    full_name = f"{first_name} {last_name}".strip()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/users/",
                json={
                    "messenger_id": str(user_id),
                    "full_name": full_name,
                    "role": "logistician",
                    "phone": ""
                }
            )
            
            if response.status_code in [200, 201]:
                await message.answer(
                    f"✅ Вы успешно зарегистрированы как <b>логист</b>!\n\n"
                    f"Откройте веб-приложение для управления рейсами:",
                    parse_mode="HTML",
                    reply_markup=ReplyKeyboardMarkup(
                        keyboard=[[KeyboardButton(text="🌐 Открыть приложение", web_app=WebAppInfo(url=WEBAPP_URL))]],
                        resize_keyboard=True
                    )
                )
            else:
                await message.answer("❌ Ошибка регистрации. Попробуйте позже.")
    except Exception as e:
        logger.error(f"Ошибка регистрации логиста: {e}")
        await message.answer("❌ Ошибка сети. Попробуйте позже.")


# ===== ГЛАВНОЕ МЕНЮ =====
async def show_main_menu(message: types.Message, role: str):
    """Показать главное меню в зависимости от роли"""
    if role == "driver":
        kb = ReplyKeyboardMarkup(
            keyboard=[
                [KeyboardButton(text="📋 Мои рейсы")],
                [KeyboardButton(text=" Открыть приложение", web_app=WebAppInfo(url=WEBAPP_URL))],
                [KeyboardButton(text="❓ Помощь")]
            ],
            resize_keyboard=True
        )
        await message.answer(
            "🚚 <b>Меню водителя</b>\n\n"
            "Выберите действие:",
            reply_markup=kb,
            parse_mode="HTML"
        )
    else:
        kb = ReplyKeyboardMarkup(
            keyboard=[
                [KeyboardButton(text="🌐 Открыть приложение", web_app=WebAppInfo(url=WEBAPP_URL))],
                [KeyboardButton(text="📊 Статистика")],
                [KeyboardButton(text="❓ Помощь")]
            ],
            resize_keyboard=True
        )
        await message.answer(
            "💼 <b>Меню логиста</b>\n\n"
            "Используйте веб-приложение для управления рейсами:",
            reply_markup=kb,
            parse_mode="HTML"
        )


# ===== МОИ РЕЙСЫ =====
@dp.message(F.text == " Мои рейсы")
async def show_my_tasks(message: types.Message):
    """Показать рейсы водителя"""
    user_id = message.from_user.id
    
    try:
        async with httpx.AsyncClient() as client:
            # Получаем пользователя
            user_resp = await client.get(f"{API_URL}/users/by-messenger/{user_id}")
            if user_resp.status_code != 200:
                await message.answer("❌ Вы не зарегистрированы. Отправьте /start")
                return
            
            user_data = user_resp.json()
            driver_id = user_data.get("id")
            
            # Получаем рейсы водителя
            tasks_resp = await client.get(f"{API_URL}/tasks/driver/{driver_id}")
            
            if tasks_resp.status_code == 200:
                tasks = tasks_resp.json()
                
                if not tasks:
                    await message.answer(" У вас пока нет рейсов.")
                    return
                
                for task in tasks:
                    status_emoji = {
                        "new": "🆕",
                        "in_progress": "🚚",
                        "completed": "✅",
                        "cancelled": "❌"
                    }.get(task.get("status"), "")
                    
                    status_text = {
                        "new": "Новый",
                        "in_progress": "В пути",
                        "completed": "Завершён",
                        "cancelled": "Отменён"
                    }.get(task.get("status"), task.get("status"))
                    
                    text = (
                        f"{status_emoji} <b>Рейс #{task['id']}</b> — {status_text}\n\n"
                        f"<b>От:</b> {task.get('sender', '—')}\n"
                        f"<b>До:</b> {task.get('receiver', '—')}\n"
                        f"<b>Город:</b> {task.get('delivery_city', '—')}\n"
                        f"<b>Плательщик:</b> {task.get('payer', '—')}"
                    )
                    
                    await message.answer(text, parse_mode="HTML")
            else:
                await message.answer("❌ Не удалось загрузить рейсы.")
    except Exception as e:
        logger.error(f"Ошибка получения рейсов: {e}")
        await message.answer("❌ Ошибка сети. Попробуйте позже.")


# ===== ПОМОЩЬ =====
@dp.message(F.text == "❓ Помощь")
async def cmd_help(message: types.Message):
    """Справка по боту"""
    text = (
        "📖 <b>Справка по боту</b>\n\n"
        "<b>Команды:</b>\n"
        "/start — Регистрация и главное меню\n"
        "/help — Эта справка\n\n"
        "<b>Возможности:</b>\n"
        " Водители: просмотр рейсов, загрузка документов\n"
        "💼 Логисты: управление рейсами через веб-приложение\n\n"
        "Если у вас есть вопросы — обратитесь к администратору."
    )
    await message.answer(text, parse_mode="HTML")


# ===== ЗАПУСК =====
async def main():
    """Запуск бота"""
    logger.info("Бот запущен!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
