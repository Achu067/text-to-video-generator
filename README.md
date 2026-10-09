# VideoMaker - Text to Video Generator

A secure, production-ready text-to-video app with:
- **5 free videos** per user
- **$2 to unlock 10 more videos**
- User authentication with JWT tokens
- Password hashing (PBKDF2)
- SQLite database for user management
- Private source code, public web app

## 🚀 Deployment Setup

### Private Code + Public Web

Your GitHub repo is **private** (only you see the code).
Your deployed app is **public** (anyone can use it via a web URL).

### How it Works

```
User (Chrome on phone)
    ↓
Opens: https://your-app.railway.app
    ↓
Sees login/signup
    ↓
Creates account with email + password
    ↓
Gets 5 free videos
    ↓
Can generate videos or pay $2 for 10 more
    ↓
Your code stays private on GitHub
```

## 📋 Prerequisites

- Python 3.10+
- FFmpeg
- Railway account (free tier available)
- GitHub account

## 🔒 Security Features

- ✅ Password hashing (PBKDF2-SHA256)
- ✅ JWT token authentication
- ✅ Private GitHub repo (code not visible to users)
- ✅ Environment variables for secrets
- ✅ User-specific credit tracking
- ✅ Protected API routes
- ✅ HTTPS on Railway (automatic)

## 📦 Local Setup (for development)

### 1. Clone private repo

```bash
git clone https://github.com/Achu067/text-to-video-generator.git
cd text-to-video-generator
```

### 2. Create virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Install FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH

### 5. Set environment variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```
SECRET_KEY=your-random-secret-key-here
DATABASE_URL=sqlite:///app.db
```

### 6. Run locally

```bash
uvicorn app:app --reload
```

Open: http://localhost:8000

Test login with any email/password.

## 🚢 Deployment on Railway

### Step 1: Make GitHub repo private

1. Go to your GitHub repo settings
2. Scroll to "Danger Zone"
3. Click "Change repository visibility"
4. Select "Private"
5. Confirm

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Log in with GitHub
5. Select your **private** repo
6. Railway will deploy automatically

### Step 3: Add environment variables to Railway

In Railway dashboard:
1. Go to your project
2. Click "Variables"
3. Add:
   ```
   SECRET_KEY=generate-a-random-string-here
   DATABASE_URL=sqlite:///app.db
   PORT=8000
   ```

### Step 4: Get your public URL

Railway will give you a URL like:
```
https://text-to-video-generator-prod.railway.app
```

This is your **public app URL**.

### Step 5: Share with users

Users can access at:
```
https://text-to-video-generator-prod.railway.app
```

They sign up, get 5 free videos, and can purchase more.

Your code stays **private** on GitHub.

## 💳 Adding Stripe Payments (Optional)

Once the app is live, you can add real payments:

1. Sign up at https://stripe.com
2. Get Stripe Secret Key
3. Add to Railway env vars: `STRIPE_SECRET_KEY=sk_...`
4. I can add Stripe integration to the app
5. Users pay $2 for 10 more videos

## 📊 Project Structure

```
text-to-video-generator/
├── app.py                 # FastAPI backend (private)
├── requirements.txt       # Dependencies
├── Procfile              # Railway deployment config
├── .env.example          # Environment template
├── .gitignore            # Hide .env, .db, videos
├── templates/
│   └── index.html        # Web UI
├── static/
│   ├── style.css         # Styling
│   └── script.js         # Frontend logic
├── generated_videos/     # Video output (ignored in git)
└── app.db                # SQLite database (ignored in git)
```

## 🔑 API Endpoints

All routes require JWT authentication (Bearer token).

### Public Routes
- `POST /api/signup` - Register new user
- `POST /api/login` - Log in and get token
- `GET /video/{filename}` - Download video

### Protected Routes (require token)
- `GET /api/me` - Get user info and credits
- `POST /api/generate` - Generate video (costs 1 credit)
- `GET /api/history` - Get user's video history
- `POST /api/purchase` - Buy 10 more videos

## 🛡️ Best Practices

1. **Keep repo private** - Your code is not visible to users
2. **Use environment variables** - Never commit secrets
3. **HTTPS only** - Railway provides this automatically
4. **Token expiry** - Tokens expire after 24 hours
5. **Password hashing** - Passwords are hashed with PBKDF2
6. **Database backups** - Regularly back up your SQLite DB

## 💰 Revenue Model

- User signs up (free)
- Generates 5 free videos
- After 5 videos, pay $2 for 10 more
- You get ~$1.72 per sale (after Stripe fees)

## 📈 Scaling (Future)

When you outgrow Railway:
- Migrate to PostgreSQL (away from SQLite)
- Add CDN for video delivery
- Use async task queue (Celery) for video generation
- Add analytics and user dashboard
- Implement real payment webhooks

## 🆘 Troubleshooting

**"FFmpeg not found"**
- Install FFmpeg for your OS
- Add to system PATH

**"Video generation is slow"**
- Normal on shared hosting
- Optimize with async processing later

**"Can't log in"**
- Make sure `.env` has `SECRET_KEY` set
- Database file needs write permissions

**"404 on Railway"**
- Check Procfile is deployed
- Check environment variables are set

## 📝 License

MIT

## 🤝 Support

For issues or questions, open a GitHub issue (private repo).

---

**Your app is now secure, private, and ready for users.** 🎉

Next steps:
1. Make GitHub repo private
2. Deploy to Railway
3. Set environment variables
4. Share the public URL with users
5. (Optional) Add Stripe for real payments
