import math
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database import get_db
from backend.models import User, Location, Friend, GroupMember
from backend.schemas import LocationUpdate, LocationBatchSync, SharingToggleRequest
from backend.auth import get_current_user

router = APIRouter(prefix="/api/locations", tags=["Location Sharing"])

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

@router.post("/update")
def update_location(
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_sharing and not payload.is_sos:
        return {"status": "skipped", "message": "Sharing is disabled"}

    loc = Location(
        user_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        speed=payload.speed,
        heading=payload.heading,
        battery_level=payload.battery_level,
        is_sos=bool(payload.is_sos),
        timestamp=datetime.utcnow()
    )
    db.add(loc)
    current_user.last_active = datetime.utcnow()
    db.commit()
    return {"status": "success", "id": loc.id}

@router.post("/batch-sync")
def sync_offline_locations(
    payload: LocationBatchSync,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = 0
    for item in payload.locations:
        loc = Location(
            user_id=current_user.id,
            latitude=item.latitude,
            longitude=item.longitude,
            accuracy=item.accuracy,
            battery_level=item.battery_level,
            timestamp=datetime.utcnow()
        )
        db.add(loc)
        count += 1
    current_user.last_active = datetime.utcnow()
    db.commit()
    return {"status": "synced", "count": count}

@router.post("/toggle-sharing")
def toggle_sharing(
    payload: SharingToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.is_sharing = payload.is_sharing
    current_user.privacy_mode = payload.privacy_mode or "exact"
    db.commit()
    return {"is_sharing": current_user.is_sharing, "privacy_mode": current_user.privacy_mode}

@router.get("/live-feed")
def get_live_family_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    friend_ids = [f.friend_id for f in db.query(Friend).filter(Friend.user_id == current_user.id).all()]
    my_groups = [m.group_id for m in db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()]
    group_member_ids = [gm.user_id for gm in db.query(GroupMember).filter(GroupMember.group_id.in_(my_groups)).all()]

    all_ids = set(friend_ids + group_member_ids)
    all_ids.discard(current_user.id)

    my_loc = db.query(Location).filter(Location.user_id == current_user.id).order_by(desc(Location.timestamp)).first()
    feed = []

    for uid in all_ids:
        u = db.query(User).filter(User.id == uid).first()
        if not u:
            continue

        latest = db.query(Location).filter(Location.user_id == uid).order_by(desc(Location.timestamp)).first()
        if not latest or (not u.is_sharing and not u.is_sos_active):
            feed.append({
                "user_id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "is_sharing": False,
                "is_sos": u.is_sos_active,
                "location": None,
                "distance_km": None
            })
            continue

        lat, lng = latest.latitude, latest.longitude
        if u.privacy_mode == "blurred" and not u.is_sos_active:
            lat += 0.003
            lng += 0.003

        distance = None
        if my_loc:
            distance = haversine_km(my_loc.latitude, my_loc.longitude, lat, lng)

        feed.append({
            "user_id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "is_sharing": u.is_sharing,
            "is_sos": u.is_sos_active or latest.is_sos,
            "distance_km": distance,
            "location": {
                "latitude": lat,
                "longitude": lng,
                "battery_level": latest.battery_level,
                "timestamp": latest.timestamp
            }
        })

    return feed

@router.get("/history/{user_id}")
def get_location_history(
    user_id: int,
    hours: int = Query(default=8, ge=1, le=48),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    since = datetime.utcnow() - timedelta(hours=hours)
    trail = db.query(Location).filter(
        Location.user_id == user_id,
        Location.timestamp >= since
    ).order_by(Location.timestamp.asc()).all()

    return [{"latitude": l.latitude, "longitude": l.longitude} for l in trail]