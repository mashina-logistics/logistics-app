import logging
logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import Task, Waypoint, Document, User
from schemas import TaskCreate, TaskResponse
import os
import httpx
from datetime import datetime
import asyncio

# Функция отправки уведомления водителю
async def send_driver_notification(driver_messenger_id: str, task_id: int, sender: str, receiver: str, city: str):
    """Отправить уведомление водителю о новом рейсе"""
    try:
        bot_token = os.getenv("BOT_TOKEN")
        if not bot_token:
            logger.warning("BOT_TOKEN не настроен")
            return
        
        message = (
            f"🚚 <b>Новый рейс #{task_id}!</b>\n\n"
            f"<b>От:</b> {sender}\n"
            f"<b>До:</b> {receiver}\n"
            f"<b>Город:</b> {city}\n\n"
            f"Откройте приложение для подробностей:"
        )
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = {
            "chat_id": driver_messenger_id,
            "text": message,
            "parse_mode": "HTML"
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(url, json=data)
    except Exception as e:
        logger.error(f"Ошибка отправки уведомления: {e}")
router = APIRouter(prefix="/tasks", tags=["tasks"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

@router.post("/", response_model=TaskResponse)
async def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    driver = db.query(User).filter(User.id == task_data.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Водитель не найден")
    
    task = Task(
        driver_id=task_data.driver_id,
        sender=task_data.sender,
        receiver=task_data.receiver,
        payer=task_data.payer,
        delivery_city=task_data.delivery_city,
    )
    db.add(task)
    db.flush()
    
    for wp in task_data.waypoints:
        waypoint = Waypoint(
            task_id=task.id,
            order_num=wp.order_num,
            waypoint_type=wp.waypoint_type,
            address=wp.address,
            city=wp.city,
            contact_name=wp.contact_name,
            contact_phone=wp.contact_phone,
            pallets=wp.pallets,
            weight_kg=wp.weight_kg,
            delivery_type=wp.delivery_type or "client",
            tk_name=wp.tk_name or "",
            tk_address=wp.tk_address or "",
            tk_contact=wp.tk_contact or "",
            client_name=wp.client_name or "",
            client_address=wp.client_address or "",
            client_contact=wp.client_contact or "",
        )
        db.add(waypoint)
    
    db.commit()
    db.refresh(task)
    
    # Отправляем уведомление водителю
    if driver:
        await send_driver_notification(
            driver_messenger_id=str(driver.messenger_id),
            task_id=task.id,
            sender=task.sender,
            receiver=task.receiver,
            city=task.delivery_city
        )
    
    return task

@router.get("/driver/{driver_id}", response_model=List[TaskResponse])
def get_driver_tasks(driver_id: int, db: Session = Depends(get_db)):
    return db.query(Task).filter(Task.driver_id == driver_id, Task.status != "completed").all()

@router.get("/", response_model=List[TaskResponse])
def get_all_tasks(db: Session = Depends(get_db)):
    return db.query(Task).filter(Task.status != "completed").all()
@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: int, status_data: dict, db: Session = Depends(get_db)):
    """Обновить статус рейса"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Рейс не найден")
    
    new_status = status_data.get("status")
    if new_status not in ["new", "in_progress", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Неверный статус")
    
    task.status = new_status
    db.commit()
    db.refresh(task)
    return task
@router.post("/{task_id}/waypoint/{waypoint_id}/status")
async def update_waypoint_status(task_id: int, waypoint_id: int, status: str, db: Session = Depends(get_db)):
    waypoint = db.query(Waypoint).filter(Waypoint.id == waypoint_id, Waypoint.task_id == task_id).first()
    if not waypoint:
        raise HTTPException(status_code=404, detail="Точка не найдена")
    
    now = datetime.utcnow()
    if status == "arrived":
        waypoint.arrived_at = now
    elif status == "started":
        waypoint.started_at = now
    elif status == "completed":
        waypoint.completed_at = now
    else:
        raise HTTPException(status_code=400, detail="Неверный статус")
    
    db.commit()
        # Уведомляем логиста
    await notify_logistician_about_waypoint_status(
        db, waypoint.task_id, waypoint_id, status
    )
    return {"status": "ok", "time": now.isoformat()}

@router.post("/{task_id}/upload-document")
async def upload_document(
    task_id: int,
    waypoint_id: Optional[int] = None,
    doc_type: str = "receipt",
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    file_content = await file.read()
    filename = f"{task_id}_{waypoint_id or 'main'}_{file.filename}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": file.content_type or "application/octet-stream"
    }
    
    upload_url = f"{SUPABASE_URL}/storage/v1/object/documents/{filename}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(upload_url, headers=headers, content=file_content)
    
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail="Ошибка загрузки")
    
    file_url = f"{SUPABASE_URL}/storage/v1/object/public/documents/{filename}"
    
    doc = Document(task_id=task_id, waypoint_id=waypoint_id, doc_type=doc_type, file_url=file_url)
    db.add(doc)
    db.commit()
    
    return {"file_url": file_url}
async def notify_logistician_about_waypoint_status(
    db: Session, task_id: int, waypoint_id: int, status: str
):
    """Отправить уведомление логисту о смене статуса точки"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return
        
        driver = db.query(User).filter(User.id == task.driver_id).first()
        if not driver or not driver.messenger_id:
            return
        
        waypoint = db.query(Waypoint).filter(Waypoint.id == waypoint_id).first()
        if not waypoint:
            return
        
        status_text = {
            "arrived": "📍 Прибыл на точку",
            "started": "🔄 Начал работу",
            "completed": "✅ Завершил работу"
        }.get(status, status)
        
        waypoint_type_text = {
            "loading": "погрузку",
            "unloading": "выгрузку"
        }.get(waypoint.waypoint_type, waypoint.waypoint_type)
        
        message = (
            f"{status_text}!\n\n"
            f"<b>Точка #{waypoint_id}</b> — {waypoint_type_text}\n"
            f"<b>Адрес:</b> {waypoint.address}\n"
            f"<b>Город:</b> {waypoint.city}\n"
            f"<b>Водитель:</b> {driver.full_name}"
        )
        
        bot_token = os.getenv("BOT_TOKEN")
        if not bot_token:
            return
        
        logisticians = db.query(User).filter(User.role == "logistician").all()
        
        async with httpx.AsyncClient() as client:
            for logistician in logisticians:
                if logistician.messenger_id:
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    data = {
                        "chat_id": logistician.messenger_id,
                        "text": message,
                        "parse_mode": "HTML"
                    }
                    await client.post(url, json=data, timeout=5.0)
    except Exception as e:
        logger.error(f"Ошибка уведомления логиста: {e}")
        
@router.delete("/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Удалить рейс"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Рейс не найден")
    
    # Удаляем связанные документы
    db.query(Document).filter(Document.task_id == task_id).delete()
    
    # Удаляем точки маршрута
    db.query(Waypoint).filter(Waypoint.task_id == task_id).delete()
    
    # Удаляем рейс
    db.delete(task)
    db.commit()
    
    return {"status": "ok", "message": "Рейс удалён"}
