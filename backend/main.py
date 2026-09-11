import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import engine, Base, SessionLocal
from backend.models import User, Profile
from backend.auth import get_password_hash
from backend.routers import (
    auth_router, friends_router, groups_router, location_router, sos_router, notify_router
)

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    if not db.query(User).filter(User.username == "admin").first():
        default_user = User(
            email="admin@example.com",
            username="admin",
            hashed_password=get_password_hash("password123"),
            full_name="Admin Family",
            phone="9876543210",
            is_sharing=True
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        db.add(Profile(user_id=default_user.id))
        db.commit()
        print("\n" + "="*50)
        print(">>> READY: Username: 'admin' | Password: 'password123'")
        print("="*50 + "\n")

app = FastAPI(title="FamLocator Web App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(friends_router.router)
app.include_router(groups_router.router)
app.include_router(location_router.router)
app.include_router(sos_router.router)
app.include_router(notify_router.router)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/")
def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)