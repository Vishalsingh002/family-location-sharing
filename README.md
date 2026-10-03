# 📍 FamLocator — Real-Time Family Location Sharing & Safety Hub

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet.js-199900.svg?style=flat&logo=leaflet)](https://leafletjs.com/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28.svg?style=flat&logo=firebase)](https://firebase.google.com/)
[![Cloudinary](https://img.shields.io/badge/Media-Cloudinary-3448C5.svg?style=flat&logo=cloudinary)](https://cloudinary.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**FamLocator** is a modern, privacy-focused real-time location sharing and family safety web application. It enables families and trusted circles to stay connected with live radar tracking, interactive route history, 1-click emergency SOS alerts, safe zones, and confidential medical emergency information.

---

## 🌟 Key Features

- **🗺️ Live GPS Radar Map:**
  - Real-time location tracking powered by Leaflet.js and OpenStreetMap.
  - Custom user avatar pins, live battery level indicator, and GPS accuracy circles.
  - Smart distance calculations between family members in kilometers.

- **🚨 1-Click Instant Emergency SOS:**
  - Instant red floating SOS button (zero popups/confirmations needed in emergencies).
  - High-priority alarm audio broadcast and red visual distress pulses across all circle members.
  - 1-click green "SAFE" resolution button to mark yourself safe.

- **📈 Interactive Route & Trip History:**
  - Replay travel paths over 4h, 12h, 24h, and 48h intervals.
  - Polyline path visualization with Trip Start (A) and Latest Point (B) pins.

- **🛡️ GPS Privacy Controls:**
  - **Exact Mode:** Accurate GPS tracking with precision radius.
  - **Blurred / Neighborhood Mode:** Offsets GPS coordinates by ~300m for privacy.
  - **Master Live Switch:** Pause location sharing at any time with 1 toggle.

- **👨‍👩‍👧‍👦 Family Circles & Groups:**
  - Create custom circles (e.g., "Family", "Road Trip Group").
  - Auto-generated 8-character invite codes for private, invitation-only joining.

- **🏥 Emergency Medical Hub:**
  - Store confidential medical emergency details (Blood Group, Allergies, Medical Notes, Home Address).
  - Accessible to circle members during emergencies.

- **🔐 Dual Authentication System:**
  - **1-Click Google Sign-In:** Authenticated via Firebase OAuth SDK.
  - **Secure Email / Password:** Hashed using Bcrypt with JWT Bearer Token sessions.

- **☁️ Cloudinary CDN Avatar Storage:**
  - Fast global image delivery for profile avatars with automatic fallback to local memory.

- **🌓 Glassmorphism Dark / Light Mode:**
  - Sleek modern design, animated bottom sheet for mobile gestures, and responsive layouts across all devices.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, SQLite, Pydantic, Uvicorn, Jose JWT, Passlib |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3, Bootstrap 5, Bootstrap Icons |
| **Maps & GPS** | Leaflet.js, OpenStreetMap Tiles, HTML5 Geolocation API |
| **Third-Party Services** | Firebase Authentication (OAuth & Email), Cloudinary CDN (Media Storage) |

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Vishalsingh002/family-location-sharing.git
cd family-location-sharing
```

### 2. Create and Activate a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:
```ini
APP_NAME=FamLocator
SECRET_KEY=your_super_secret_jwt_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./family_locator.db

# Cloudinary CDN (Optional for avatar image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 5. Start the Application Server
```bash
uvicorn backend.main:app --reload
```

Open your browser and visit:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 📱 Application Pages

| Page | URL | Purpose |
| :--- | :--- | :--- |
| **Live Map & Radar** | `http://localhost:8000/` or `/map` | Interactive map, family feed, route history & SOS |
| **Login** | `http://localhost:8000/login` | Google OAuth & email sign-in |
| **Sign Up** | `http://localhost:8000/signup` | New user registration |
| **Profile & Hub** | `http://localhost:8000/profile` | Personal info, medical details, circles & privacy controls |

---

## 📂 Project Architecture

```
family_location_sharing/
├── backend/
│   ├── routers/
│   │   ├── auth_router.py       # Login, Signup, Firebase OAuth, Profile
│   │   ├── friends_router.py    # Friend requests and connections
│   │   ├── groups_router.py     # Family circle management & invite codes
│   │   ├── location_router.py   # Live GPS telemetry, feed, route history
│   │   ├── notify_router.py     # In-app notifications
│   │   └── sos_router.py        # Emergency SOS triggers & broadcasts
│   ├── auth.py                  # JWT creation, verification & password hashing
│   ├── cloudinary_service.py    # CDN upload helper & health diagnostics
│   ├── database.py              # SQLite engine & SQLAlchemy session setup
│   ├── main.py                  # FastAPI app entry point & static file server
│   ├── models.py                # Database ORM models (Users, Locations, Circles)
│   └── schemas.py               # Pydantic request/response schemas
├── frontend/
│   ├── css/
│   │   └── styles.css           # Glassmorphism design system & responsive UI
│   ├── js/
│   │   ├── app.js               # Main frontend controller & feed management
│   │   ├── firebase-config.js   # Firebase SDK authentication helper
│   │   ├── location.js          # GPS tracker & emergency SOS dispatcher
│   │   └── map.js               # Leaflet map manager & route polylines
│   ├── index.html               # Live Radar Map application
│   ├── login.html               # Modern authentication portal
│   ├── signup.html              # Registration portal
│   └── profile.html             # Profile & Account Hub
├── .gitignore                   # Ignored files (secrets, caches, temp DBs)
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```

---

## 🔒 Security & Privacy Highlights

- **Confidential Passwords:** Bcrypt 12-round hashing prevents credential exposure.
- **Protected Environment:** `.gitignore` keeps API keys and JWT secrets out of public version control.
- **Privacy Offset:** Neighborhood blurring mode protects exact domestic coordinates when desired.
- **Encrypted Tokens:** Stateless JWT authentication tokens with configurable expiration.

---

## 📄 License

This project is licensed under the MIT License - feel free to use and adapt it for personal and commercial applications.
