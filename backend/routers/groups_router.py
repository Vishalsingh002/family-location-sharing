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
    name = payload.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Circle name must be at least 2 characters.")

    code = secrets.token_hex(4).upper()
    while db.query(FamilyGroup).filter(FamilyGroup.invite_code == code).first():
        code = secrets.token_hex(4).upper()

    group = FamilyGroup(
        name=name,
        description=payload.description.strip() if payload.description else None,
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
    code = payload.invite_code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Please enter an invite code.")

    group = db.query(FamilyGroup).filter(FamilyGroup.invite_code == code).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code. Circle not found.")

    if db.query(GroupMember).filter(GroupMember.group_id == group.id, GroupMember.user_id == current_user.id).first():
        raise HTTPException(status_code=400, detail="You are already a member of this circle.")

    db.add(GroupMember(group_id=group.id, user_id=current_user.id, role="member"))
    db.commit()
    return {"message": f"Successfully joined circle '{group.name}'!"}

@router.get("/")
def get_user_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    groups = []
    for m in memberships:
        g = m.group
        if not g:
            continue
        member_count = db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
        groups.append({
            "id": g.id,
            "name": g.name,
            "invite_code": g.invite_code,
            "member_count": member_count,
            "role": m.role
        })
    return groups

@router.delete("/{group_id}/leave")
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of this circle.")

    db.delete(membership)
    remaining = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()
    if remaining == 0:
        group = db.query(FamilyGroup).filter(FamilyGroup.id == group_id).first()
        if group:
            db.delete(group)
    db.commit()
    return {"message": "You left the circle."}

@router.delete("/{group_id}/delete")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.query(FamilyGroup).filter(FamilyGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Circle not found.")

    if group.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the circle creator can delete this circle.")

    db.delete(group)
    db.commit()
    return {"message": f"Circle '{group.name}' has been deleted."}