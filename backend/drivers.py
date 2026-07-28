from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.messenger_id == user.messenger_id).first()
    if existing:
        return existing
    new_user = User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.get("/drivers", response_model=List[UserResponse])
def get_drivers(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == "driver").all()


@router.get("/by-messenger/{messenger_id}", response_model=UserResponse)
def get_user_by_messenger(messenger_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.messenger_id == messenger_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user