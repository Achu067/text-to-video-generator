# Text-to-Video Generator

A free text-to-video generator with a simple credit system:
- 5 free videos
- $2 unlocks 10 more videos

This project is built with Python + FastAPI + MoviePy + FFmpeg.

## Features
- Create a video from plain text
- Convert text to speech using gTTS
- Generate scene images with Pillow
- Combine audio and visuals into an MP4 video
- Track video credits per user
- Premium unlock route: $2 for 10 more videos

## Local setup

### 1. Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Install FFmpeg

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install ffmpeg
```

macOS:

```bash
brew install ffmpeg
```

### 4. Run the app

```bash
uvicorn app:app --reload
```

Open:

```text
http://localhost:8000
```

## Credits model

- User starts with 5 free videos
- $2 purchase adds 10 more videos
- Each successful generation consumes 1 credit

## Project structure

```text
.
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
├── generated_videos/
│   └── .gitkeep
└── .venv/
```

## Notes

This is a free, local-first project that can later be upgraded with premium voices, AI imagery, 4K rendering, or cloud deployment.

## License

MIT
