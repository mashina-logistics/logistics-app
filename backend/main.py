from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routers import tasks, drivers, broadcasts

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Logistics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(drivers.router)
app.include_router(broadcasts.router)

@app.get("/")
def root():
    return {"service": "Logistics API", "status": "running"}

@app.get("/health")
def health():
    return {"ok": True}