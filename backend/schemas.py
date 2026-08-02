from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class WaypointCreate(BaseModel):
    order_num: int
    waypoint_type: str
    address: str
    city: str = ""
    contact_name: str = ""
    contact_phone: str = ""
    pallets: Optional[int] = None
    weight_kg: Optional[int] = None
    delivery_type: str = "client"
    tk_name: str = ""
    tk_address: str = ""
    tk_contact: str = ""
    client_name: str = ""
    client_address: str = ""
    client_contact: str = ""

class TaskCreate(BaseModel):
    driver_id: int
    sender: Optional[str] = None
    receiver: Optional[str] = None
    payer: Optional[str] = None
    delivery_city: Optional[str] = None
    waypoints: List[WaypointCreate]

class WaypointResponse(BaseModel):
    id: int
    order_num: int
    waypoint_type: str
    address: str
    city: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    pallets: Optional[int] = None
    weight_kg: Optional[int] = None
    arrived_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    delivery_type: Optional[str] = "client"
    tk_name: Optional[str] = ""
    tk_address: Optional[str] = ""
    tk_contact: Optional[str] = ""
    client_name: Optional[str] = ""
    client_address: Optional[str] = ""
    client_contact: Optional[str] = ""
    
    class Config:
        from_attributes = True

class TaskResponse(BaseModel):
    id: int
    driver_id: int
    sender: Optional[str]
    receiver: Optional[str]
    payer: Optional[str]
    delivery_city: Optional[str]
    status: str
    waypoints: List[WaypointResponse] = []
    created_at: datetime
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    messenger_id: str
    full_name: str
    role: str
    phone: Optional[str] = None
    vehicle_number: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    messenger_id: str
    full_name: str
    role: str
    phone: Optional[str]
    vehicle_number: Optional[str]
    class Config:
        from_attributes = True

class BroadcastCreate(BaseModel):
    author_id: int
    text: str

class BroadcastResponse(BaseModel):
    id: int
    text: str
    created_at: datetime
    class Config:
        from_attributes = True
