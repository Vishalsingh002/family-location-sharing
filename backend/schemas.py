from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ProfileOut(BaseModel):
    bio: Optional[str] = None
    home_address: Optional[str] = None
    blood_group: Optional[str] = None
    medical_notes: Optional[str] = None

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_sharing: bool
    sharing_expires_at: Optional[datetime] = None
    privacy_mode: str
    is_sos_active: bool
    last_active: datetime
    profile: Optional[ProfileOut] = None

    class Config:
        from_attributes = True

class UserSignup(BaseModel):
    email: str
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    home_address: Optional[str] = None
    blood_group: Optional[str] = None
    medical_notes: Optional[str] = None

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    battery_level: Optional[int] = None
    is_sos: Optional[bool] = False

class LocationBatchSync(BaseModel):
    locations: List[LocationUpdate]

class SharingToggleRequest(BaseModel):
    is_sharing: bool
    duration_minutes: Optional[int] = None
    privacy_mode: Optional[str] = "exact"

class FriendRequestCreate(BaseModel):
    username_or_email: str

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None

class GroupJoin(BaseModel):
    invite_code: str

class SOSAlertRequest(BaseModel):
    latitude: float
    longitude: float
    message: Optional[str] = "Emergency! I need assistance."