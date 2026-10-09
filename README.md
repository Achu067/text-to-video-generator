# Text-to-Video Generator

A professional text-to-video generator with a simple credit system:
- **5 free videos** to start
- **$2 unlocks 10 more videos**

Perfect for creating video content from scripts without any technical knowledge.

## Features

✨ **Core Features:**
- Convert text to speech with multiple language support
- Automatic scene slide generation with gradient backgrounds
- Video composition with synchronized audio and visuals
- Real-time character count and script preview
- Download generated videos in MP4 format

🎬 **Video Settings:**
- Multiple language options (English, Hindi, Spanish, French, German, Italian)
- Video quality selection (HD 720p, Full HD 1080p)
- Customizable scene durations based on script length

💳 **Monetization:**
- 5 free videos per user
- $2 one-time purchase for 10 additional videos
- Simple in-memory credit tracking (can be upgraded to database)
- Purchase flow with payment modal

🎨 **Modern UI:**
- Professional gradient design
- Responsive layout (desktop, tablet, mobile)
- Real-time status updates and progress visualization
- Video preview and download functionality
- Share buttons and social integration ready

## Tech Stack

**Backend:**
- Python 3.10+
- FastAPI
- gTTS (Google Text-to-Speech)
- MoviePy (video composition)
- Pillow (image generation)

**Frontend:**
- HTML5
- CSS3 (Flexbox, Grid, Gradients)
- Vanilla JavaScript (ES6+)

**Video Processing:**
- FFmpeg (codec, encoding)
- H.264 video codec
- AAC audio codec

## Installation

### Prerequisites
- Python 3.10 or higher
- FFmpeg installed on your system

### 1. Clone the Repository

```bash
git clone https://github.com/Achu067/text-to-video-generator.git
cd text-to-video-generator
```

### 2. Create Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Install FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
- Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Add FFmpeg to your system PATH

### 5. Run the Application

```bash
uvicorn app:app --reload
```

Open your browser and navigate to:
```
http://localhost:8000
```

## Usage

1. **Write your script** in the text area
2. **Select language** for text-to-speech narration
3. **Choose video quality** (HD or Full HD)
4. **Click "Generate Video"** to create your video
5. **Preview** the video in real-time
6. **Download** your completed video

## Project Structure

```
text-to-video-generator/
├── app.py                      # Main FastAPI application
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── .gitignore                 # Git ignore file
├── templates/
│   └── index.html            # Main UI
├── static/
│   ├── style.css             # Styling
│   └── script.js             # Frontend logic
├── generated_videos/         # Output directory for videos
│   └── .gitkeep
└── .venv/                    # Virtual environment
```

## API Endpoints

### GET `/`
Serves the main HTML page.

### GET `/api/credits/{user_id}`
Fetch remaining credits for a user.

**Response:**
```json
{
  "user_id": "guest-user",
  "remaining_credits": 5,
  "free_limit": 5,
  "purchase_bonus": 10,
  "price_usd": 2
}
```

### POST `/api/generate`
Generate a video from text.

**Request:**
```json
{
  "text": "Your script here",
  "voice": "en",
  "user_id": "user-id-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video generated successfully.",
  "video_url": "/video/filename.mp4",
  "filename": "filename.mp4",
  "remaining_credits": 4
}
```

### POST `/api/purchase`
Purchase additional video credits.

**Request:**
```json
{
  "user_id": "user-id-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase successful. You received 10 extra videos.",
  "price_usd": 2,
  "credits_added": 10,
  "remaining_credits": 14
}
```

### GET `/video/{filename}`
Download a generated video.

## Credit System

- **Free Tier:** 5 videos per user
- **Purchase:** $2 adds 10 videos
- **Storage:** Currently in-memory (ideal for local testing)
- **Persistence:** Can be upgraded to SQLite or PostgreSQL

## Next Steps for Production

1. **Database Integration:**
   - Add SQLite or PostgreSQL for persistent storage
   - User registration and authentication
   - Video history and analytics

2. **Payment Integration:**
   - Integrate Stripe for real payment processing
   - Webhook handling for payment confirmations
   - Invoice generation

3. **Premium Features:**
   - AI image generation (DALL-E, Midjourney)
   - Premium TTS voices (Eleven Labs, Google Cloud)
   - 4K video export
   - Music and background audio selection
   - Custom templates and themes

4. **Deployment:**
   - Docker containerization
   - Cloud hosting (AWS, GCP, Heroku)
   - CDN for video delivery
   - Monitoring and error logging

5. **Performance:**
   - Async video processing with task queues (Celery)
   - Video caching and optimization
   - Concurrent video generation

## Troubleshooting

**FFmpeg not found:**
- Ensure FFmpeg is installed and added to PATH
- On Linux: `which ffmpeg`
- On Mac: `brew list ffmpeg`

**Video generation is slow:**
- This is normal on systems with limited resources
- Processing takes 2-5 minutes depending on script length
- Can be optimized with cloud processing later

**Audio not syncing with video:**
- This is a known issue with MoviePy
- Solution: Update to latest MoviePy version
- Or upgrade to cloud-based video processing

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions, please open a GitHub issue.

## Roadmap

- [ ] User authentication and accounts
- [ ] Database persistence (SQLite/PostgreSQL)
- [ ] Real Stripe payment integration
- [ ] AI image generation integration
- [ ] Premium TTS voices
- [ ] 4K video export
- [ ] Video templates and customization
- [ ] Batch video generation
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

---

Built with ❤️ for creators. Start creating amazing videos today!
