from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Profile
from backend.schemas import UserSignup, UserLogin, Token, UserOut, ProfileUpdate
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=Token)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    clean_username = payload.username.strip().lower()

    if db.query(User).filter((User.email == clean_email) | (User.username == clean_username)).first():
        raise HTTPException(status_code=400, detail="Username or Email already registered.")

    hashed = get_password_hash(payload.password)
    user = User(
        email=clean_email,
        username=clean_username,
        hashed_password=hashed,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        is_sharing=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(user_id=user.id)
    db.add(profile)
    db.commit()

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    ident = payload.username_or_email.strip().lower()
    user = db.query(User).filter(
        (User.email == ident) | (User.username == ident)
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    profile = current_user.profile or Profile(user_id=current_user.id)
    if payload.bio is not None:
        profile.bio = payload.bio.strip()
    if payload.home_address is not None:
        profile.home_address = payload.home_address.strip()
    if payload.blood_group is not None:
        profile.blood_group = payload.blood_group.strip()
    if payload.medical_notes is not None:
        profile.medical_notes = payload.medical_notes.strip()

    db.add(profile)
    db.commit()
    db.refresh(current_user)
    return current_user