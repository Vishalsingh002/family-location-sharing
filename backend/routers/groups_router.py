import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, FamilyGroup, GroupMember
from backend.schemas import GroupCreate, GroupJoin
from backend.auth import get_current_user

router = APIRouter(prefix="/api/groups", tags=["Family Groups"])

@router.post("/create")
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = secrets.token_hex(4).upper()
    group = FamilyGroup(
        name=payload.name,
        description=payload.description,
        invite_code=code,
        created_by_id=current_user.id
    )
    db.add(group)
    db.flush()

    db.add(GroupMember(group_id=group.id, user_id=current_user.id, role="admin"))
    db.commit()
    db.refresh(group)
    return {"id": group.id, "name": group.name, "invite_code": group.invite_code, "member_count": 1}

@router.post("/join")
def join_group(
    payload: GroupJoin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.query(FamilyGroup).filter(FamilyGroup.invite_code == payload.invite_code.strip().upper()).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code.")

    if db.query(GroupMember).filter(GroupMember.group_id == group.id, GroupMember.user_id == current_user.id).first():
        raise HTTPException(status_code=400, detail="Already in this circle.")

    db.add(GroupMember(group_id=group.id, user_id=current_user.id, role="member"))
    db.commit()
    return {"message": f"Joined {group.name}!"}

@router.get("/")
def get_user_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    groups = []
    for m in memberships:
        g = m.group
        member_count = db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
        groups.append({
            "id": g.id,
            "name": g.name,
            "invite_code": g.invite_code,
            "member_count": member_count
        })
    return groups