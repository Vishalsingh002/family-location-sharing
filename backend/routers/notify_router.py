from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database import get_db
from backend.models import Notification
from backend.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/")
def get_notifications(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(15).all()

    return [{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read
    } for n in notifs]