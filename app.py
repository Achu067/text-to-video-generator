from __future__ import annotations

import hashlib
import secrets
import sqlite3
import textwrap
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from pydantic import BaseModel
from gtts import gTTS
from moviepy.editor import AudioFileClip, ImageClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont
import os
import jwt

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
OUTPUT_DIR = BASE_DIR / "generated_videos"
DB_PATH = BASE_DIR / "app.db"
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="VideoMaker - Text to Video Generator")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
FREE_VIDEO_LIMIT = 5
PURCHASE_BONUS = 10
TOKEN_EXPIRY_HOURS = 24

# Security
security = HTTPBearer()


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class VideoRequest(BaseModel):
    text: str
    voice: str = "en"


class PurchaseRequest(BaseModel):
    pass


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database schema."""
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                credits INTEGER NOT NULL DEFAULT 5,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS video_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                title TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.commit()


def hash_password(password: str) -> str:
    """Hash password securely using PBKDF2."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 200000
    )
    return f"{salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    try:
        salt, stored_hash = password_hash.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 200000
    )
    return digest.hex() == stored_hash


def create_jwt_token(user_id: str) -> str:
    """Create JWT token for user session."""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verify_jwt_token(token: str) -> str:
    """Verify JWT token and return user_id."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(credentials: HTTPAuthCredentials = Depends(security)) -> str:
    """Get current authenticated user from token."""
    return verify_jwt_token(credentials.credentials)


def get_user_from_db(user_id: str) -> dict[str, Any] | None:
    """Fetch user from database."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, email, credits FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def signup_user(email: str, password: str) -> dict[str, Any]:
    """Register new user."""
    normalized_email = email.strip().lower()
    if not normalized_email or not password or len(password) < 6:
        raise HTTPException(
            status_code=400, detail="Email and password (min 6 chars) required"
        )

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (normalized_email,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        user_id = uuid.uuid4().hex
        conn.execute(
            "INSERT INTO users (id, email, password_hash, credits) VALUES (?, ?, ?, ?)",
            (user_id, normalized_email, hash_password(password), FREE_VIDEO_LIMIT),
        )
        conn.commit()

    return {
        "user_id": user_id,
        "email": normalized_email,
        "token": create_jwt_token(user_id),
        "credits": FREE_VIDEO_LIMIT,
    }


def login_user(email: str, password: str) -> dict[str, Any]:
    """Authenticate user and return token."""
    normalized_email = email.strip().lower()
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, password_hash, credits FROM users WHERE email = ?",
            (normalized_email,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    return {
        "user_id": row["id"],
        "email": normalized_email,
        "token": create_jwt_token(row["id"]),
        "credits": int(row["credits"]),
    }


def split_text_into_chunks(text: str, max_chars: int = 120) -> list[str]:
    """Split text into scene chunks."""
    normalized = " ".join(text.split())
    sentences = [part.strip() for part in normalized.split(".") if part.strip()]
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_chars:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            current = sentence

    if current:
        chunks.append(current)

    if not chunks:
        words = normalized.split()
        for i in range(0, len(words), 24):
            chunks.append(" ".join(words[i : i + 24]))

    return chunks


def load_font(size: int):
    """Load font with fallback."""
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except Exception:
        return ImageFont.load_default()


def create_scene_image(text: str, output_path: str, index: int) -> None:
    """Create a scene slide image."""
    width, height = 1280, 720
    image = Image.new("RGB", (width, height), "#0f172a")
    draw = ImageDraw.Draw(image)

    for y in range(height):
        r = int(15 + (y / height) * 35)
        g = int(23 + (y / height) * 60)
        b = int(42 + (y / height) * 70)
        draw.line((0, y, width, y), fill=(r, g, b))

    title = "VideoMaker"
    title_font = load_font(30)
    subtitle_font = load_font(24)
    body_font = load_font(48)

    title_box = draw.textbbox((0, 0), title, font=title_font)
    title_x = (width - (title_box[2] - title_box[0])) / 2
    draw.text((title_x, 60), title, font=title_font, fill=(255, 255, 255))

    card_x1, card_y1 = 120, 170
    card_x2, card_y2 = width - 120, height - 120
    draw.rounded_rectangle(
        (card_x1, card_y1, card_x2, card_y2),
        radius=28,
        fill=(15, 23, 42, 180),
        outline=(71, 85, 105),
        width=2,
    )

    wrapped = textwrap.wrap(text, width=30)
    lines = wrapped[:5]
    y_cursor = 240
    for line in lines:
        line_box = draw.textbbox((0, 0), line, font=body_font)
        line_width = line_box[2] - line_box[0]
        x = (width - line_width) / 2
        draw.text((x, y_cursor), line, font=body_font, fill=(248, 250, 252))
        y_cursor += 70

    page_text = f"Scene {index + 1}"
    page_box = draw.textbbox((0, 0), page_text, font=subtitle_font)
    page_x = width - (page_box[2] - page_box[0]) - 140
    draw.text((page_x, 610), page_text, font=subtitle_font, fill=(148, 163, 184))

    image.save(output_path)


def generate_video_from_text(text: str, voice: str) -> str:
    """Generate video from text script."""
    if not text or not text.strip():
        raise ValueError("Text input cannot be empty")

    chunks = split_text_into_chunks(text)
    scene_dir = OUTPUT_DIR / str(uuid.uuid4())
    scene_dir.mkdir(exist_ok=True)

    for i, chunk in enumerate(chunks):
        image_path = scene_dir / f"scene_{i}.png"
        create_scene_image(chunk, str(image_path), i)

    audio_path = scene_dir / "voice.mp3"
    tts = gTTS(text=text, lang=voice, slow=False)
    tts.save(str(audio_path))

    clips = []
    for i, chunk in enumerate(chunks):
        image_path = scene_dir / f"scene_{i}.png"
        scene_duration = max(2.5, min(5.0, len(chunk.split()) * 0.25))
        clip = ImageClip(str(image_path), duration=scene_duration)
        clips.append(clip)

    final_video_path = scene_dir / "output_video.mp4"
    video = concatenate_videoclips(clips, method="compose")
    audio = AudioFileClip(str(audio_path))

    if audio.duration > video.duration:
        video = video.set_duration(audio.duration)

    video = video.set_audio(audio)
    video.write_videofile(
        str(final_video_path),
        fps=24,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=str(scene_dir / "temp_audio.m4a"),
        remove_temp=True,
        verbose=False,
        logger=None,
    )

    return str(final_video_path)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/")
def home() -> FileResponse:
    return FileResponse(str(TEMPLATES_DIR / "index.html"))


@app.post("/api/signup")
def signup(request: SignupRequest):
    try:
        user = signup_user(request.email, request.password)
        return {"success": True, **user}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/login")
def login(request: LoginRequest):
    try:
        user = login_user(request.email, request.password)
        return {"success": True, **user}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/me")
def get_me(user_id: str = Depends(get_current_user)):
    user = get_user_from_db(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": user["id"], "email": user["email"], "credits": user["credits"]}


@app.post("/api/generate")
def generate_video(request: VideoRequest, user_id: str = Depends(get_current_user)):
    """Generate video (requires authentication)."""
    user = get_user_from_db(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user["credits"] <= 0:
        return {
            "success": False,
            "message": "No credits remaining. Purchase more to continue.",
            "need_purchase": True,
            "remaining_credits": 0,
        }

    try:
        output_path = generate_video_from_text(request.text, request.voice)
        filename = output_path.split("/")[-1]

        # Deduct credit and save to database
        with get_db() as conn:
            conn.execute(
                "UPDATE users SET credits = credits - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (user_id,),
            )
            conn.execute(
                "INSERT INTO video_history (user_id, filename, title) VALUES (?, ?, ?)",
                (user_id, filename, request.text[:50]),
            )
            conn.commit()

        new_credits = get_user_from_db(user_id)["credits"]
        return {
            "success": True,
            "message": "Video generated successfully",
            "video_url": f"/video/{filename}",
            "filename": filename,
            "remaining_credits": new_credits,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/history")
def get_history(user_id: str = Depends(get_current_user)):
    """Get user's video history (requires authentication)."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT filename, title, created_at FROM video_history WHERE user_id = ? ORDER BY id DESC LIMIT 20",
            (user_id,),
        ).fetchall()
    return {"videos": [dict(row) for row in rows]}


@app.post("/api/purchase")
def purchase(request: PurchaseRequest, user_id: str = Depends(get_current_user)):
    """Purchase credits (requires authentication)."""
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (PURCHASE_BONUS, user_id),
        )
        conn.commit()

    user = get_user_from_db(user_id)
    return {
        "success": True,
        "message": f"Purchased {PURCHASE_BONUS} credits",
        "credits_added": PURCHASE_BONUS,
        "remaining_credits": user["credits"],
        "price_usd": 2,
    }


@app.get("/video/{filename}")
def get_video(filename: str):
    """Download video (public endpoint, but filename must exist)."""
    for candidate in OUTPUT_DIR.rglob(filename):
        if candidate.is_file():
            return FileResponse(str(candidate), media_type="video/mp4")
    raise HTTPException(status_code=404, detail="Video not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
