from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Location, Notification, Friend, GroupMember
from backend.schemas import SOSAlertRequest
from backend.auth import get_current_user

router = APIRouter(prefix="/api/emergency", tags=["Emergency SOS"])

@router.post("/sos/trigger")
def trigger_sos(
    payload: SOSAlertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.is_sos_active = True
    current_user.is_sharing = True

    loc = Location(
        user_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_sos=True,
        timestamp=datetime.utcnow()
    )
    db.add(loc)

    friend_ids = [f.friend_id for f in db.query(Friend).filter(Friend.user_id == current_user.id).all()]
    my_groups = [m.group_id for m in db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()]
    group_member_ids = [gm.user_id for gm in db.query(GroupMember).filter(GroupMember.group_id.in_(my_groups)).all()]

    recipients = set(friend_ids + group_member_ids)
    recipients.discard(current_user.id)

    for r_id in recipients:
        db.add(Notification(
            user_id=r_id,
            sender_id=current_user.id,
            type="SOS_ALERT",
            title="EMERGENCY SOS ALERT!",
            message=f"{current_user.full_name} triggered an SOS emergency signal!"
        ))

    db.commit()
    return {"status": "sos_active", "message": "Emergency SOS broadcasted!"}

@router.post("/sos/resolve")
def resolve_sos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.is_sos_active = False

    friend_ids = [f.friend_id for f in db.query(Friend).filter(Friend.user_id == current_user.id).all()]
    my_groups = [m.group_id for m in db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()]
    group_member_ids = [gm.user_id for gm in db.query(GroupMember).filter(GroupMember.group_id.in_(my_groups)).all()]

    recipients = set(friend_ids + group_member_ids)
    recipients.discard(current_user.id)

    for r_id in recipients:
        db.add(Notification(
            user_id=r_id,
            sender_id=current_user.id,
            type="SOS_RESOLVED",
            title="Emergency Resolved",
            message=f"{current_user.full_name} marked themselves as SAFE."
        ))

    db.commit()
    return {"status": "resolved", "message": "SOS mode turned off. Returned to normal."}