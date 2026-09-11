from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Friend, FriendRequest, Notification
from backend.schemas import FriendRequestCreate
from backend.auth import get_current_user

router = APIRouter(prefix="/api/friends", tags=["Friends"])

@router.get("/")
def list_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendships = db.query(Friend).filter(Friend.user_id == current_user.id).all()
    results = []
    for f in friendships:
        friend_user = db.query(User).filter(User.id == f.friend_id).first()
        if friend_user:
            results.append({
                "id": f.id,
                "friend": {
                    "id": friend_user.id,
                    "username": friend_user.username,
                    "full_name": friend_user.full_name,
                    "is_sharing": friend_user.is_sharing,
                    "is_sos_active": friend_user.is_sos_active
                }
            })
    return results

@router.post("/request")
def send_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target = db.query(User).filter(
        (User.username == payload.username_or_email.strip().lower()) |
        (User.email == payload.username_or_email.strip().lower())
    ).first()

    if not target or target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Invalid user.")

    if db.query(Friend).filter(Friend.user_id == current_user.id, Friend.friend_id == target.id).first():
        raise HTTPException(status_code=400, detail="Already friends.")

    freq = FriendRequest(sender_id=current_user.id, receiver_id=target.id, status="pending")
    db.add(freq)
    db.add(Notification(
        user_id=target.id,
        sender_id=current_user.id,
        type="FRIEND_REQUEST",
        title="Friend Request",
        message=f"{current_user.full_name} sent you a friend request."
    ))
    db.commit()
    return {"message": "Request sent successfully."}

@router.get("/requests")
def get_incoming_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    requests = db.query(FriendRequest).filter(
        FriendRequest.receiver_id == current_user.id,
        FriendRequest.status == "pending"
    ).all()
    return [{
        "id": r.id,
        "sender": {
            "id": r.sender.id,
            "username": r.sender.username,
            "full_name": r.sender.full_name
        }
    } for r in requests]

@router.post("/requests/{req_id}/respond")
def respond_request(
    req_id: int,
    action: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    freq = db.query(FriendRequest).filter(
        FriendRequest.id == req_id,
        FriendRequest.receiver_id == current_user.id,
        FriendRequest.status == "pending"
    ).first()
    if not freq:
        raise HTTPException(status_code=404, detail="Request not found.")

    if action == "accept":
        freq.status = "accepted"
        db.add(Friend(user_id=current_user.id, friend_id=freq.sender_id))
        db.add(Friend(user_id=freq.sender_id, friend_id=current_user.id))
    else:
        freq.status = "rejected"

    db.commit()
    return {"message": f"Request {action}ed."}