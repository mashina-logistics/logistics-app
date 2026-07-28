from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    messenger_id = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    phone = Column(String)
    vehicle_number = Column(String)
    tasks = relationship("Task", back_populates="driver")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    sender = Column(String)
    receiver = Column(String)
    payer = Column(String)
    delivery_city = Column(String)
    status = Column(String, default="new")
    driver = relationship("User", back_populates="tasks")
    waypoints = relationship("Waypoint", back_populates="task",
                             cascade="all, delete-orphan",
                             order_by="Waypoint.order_num")
    documents = relationship("Document", back_populates="task")


class Waypoint(Base):
    __tablename__ = "waypoints"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    order_num = Column(Integer, nullable=False)
    waypoint_type = Column(String)
    address = Column(String, nullable=False)
    city = Column(String)
    contact_name = Column(String)
    contact_phone = Column(String)
    pallets = Column(Integer)
    weight_kg = Column(Integer)
    arrived_at = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    task = relationship("Task", back_populates="waypoints")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    waypoint_id = Column(Integer, ForeignKey("waypoints.id"), nullable=True)
    doc_type = Column(String)
    file_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    task = relationship("Task", back_populates="documents")


class Broadcast(Base):
    __tablename__ = "broadcasts"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Integer, default=1)