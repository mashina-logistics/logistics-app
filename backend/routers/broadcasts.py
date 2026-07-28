from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Broadcast, User
from schemas import BroadcastCreate, BroadcastResponse

router = APIRouter(prefix="/broadcasts", tags=["broadcasts"])

@router.post("/", response_model=BroadcastResponse)
def create_broadcast(data: BroadcastCreate, db: Session = Depends(get_db)):
    author = db.query(User).filter(User.id == data.author_id).first()
    if not author or author.role != "logistician":
        raise HTTPException(status_code=403, detail="Только логист")
    broadcast = Broadcast(author_id=data.author_id, text=data.text)
    db.add(broadcast)
    db.commit()
    db.refresh(broadcast)
    return broadcast

@router.get("/active", response_model=List[BroadcastResponse])
def get_active_broadcasts(db: Session = Depends(get_db)):
    return db.query(Broadcast).filter(Broadcast.is_active == 1).order_by(Broadcast.created_at.desc()).all()
