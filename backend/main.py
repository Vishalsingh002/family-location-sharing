import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

load_dotenv()

from backend.database import engine, Base
from backend.routers import (
    auth_router, friends_router, groups_router, location_router, sos_router, notify_router
)

Base.metadata.create_all(bind=engine)

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

@app.get("/login")
def serve_login():
    return FileResponse(FRONTEND_DIR / "login.html")

@app.get("/signup")
def serve_signup():
    return FileResponse(FRONTEND_DIR / "signup.html")

@app.get("/profile")
def serve_profile():
    return FileResponse(FRONTEND_DIR / "profile.html")

@app.get("/map")
def serve_map():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/auth_hero.jpg")
def serve_auth_hero():
    return FileResponse(FRONTEND_DIR / "auth_hero.jpg")

@app.get("/favicon.ico.png")
def serve_favicon():
    return FileResponse(FRONTEND_DIR / "favicon.ico.png")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)