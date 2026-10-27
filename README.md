# CultureLens AI — Cultural Heritage Tagging Website

A hackathon starter project for tagging cultural heritage photos using an open-source image-text model.

## Features
- Upload a heritage image
- AI suggests cultural tags using zero-shot image classification (CLIP)
- Review/edit tags and add notes, region, and year
- Save records locally in a JSON archive
- Search/filter saved archive records
- Export archive metadata as JSON
- Responsive React interface

## Stack
- Frontend: React + Vite
- Backend: Python + FastAPI
- AI: Hugging Face Transformers + OpenAI CLIP
- Image processing: Pillow
- Storage: JSON file + local uploads (easy to replace with MongoDB)

## Requirements
- Node.js 18+
- Python 3.10+
- Internet connection on first AI run to download the model (about 600 MB, may vary)

## Run the backend
Open a terminal in this folder:

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

macOS/Linux:
```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The first AI request downloads the model. For a laptop with limited RAM, use a smaller model or replace the model setup in `backend/main.py`.

## Run the frontend
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## Notes
- The model produces suggestions, not verified historical facts. Users should review tags.
- The starter stores uploaded images and metadata locally. It is intended for a demo, not production deployment.
- Video upload is not implemented in this starter; add frame extraction with OpenCV/FFmpeg as a next step.
