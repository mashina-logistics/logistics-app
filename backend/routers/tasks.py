from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.database import get_db
from backend.models import Task, Waypoint, Document, User
from backend.schemas import TaskCreate, TaskResponse
import os
import httpx
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

@router.post("/", response_model=TaskResponse)
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
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
        )
        db.add(waypoint)
    
    db.commit()
    db.refresh(task)
    return task

@router.get("/driver/{driver_id}", response_model=List[TaskResponse])
def get_driver_tasks(driver_id: int, db: Session = Depends(get_db)):
    return db.query(Task).filter(Task.driver_id == driver_id, Task.status != "completed").all()

@router.get("/", response_model=List[TaskResponse])
def get_all_tasks(db: Session = Depends(get_db)):
    return db.query(Task).filter(Task.status != "completed").all()

@router.post("/{task_id}/waypoint/{waypoint_id}/status")
def update_waypoint_status(task_id: int, waypoint_id: int, status: str, db: Session = Depends(get_db)):
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