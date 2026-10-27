from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from transformers import pipeline
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
import json, shutil, io

ROOT = Path(__file__).resolve().parent
UPLOADS = ROOT / "uploads"
DATA_FILE = ROOT / "archive.json"
UPLOADS.mkdir(exist_ok=True)
CANDIDATE_LABELS = [
    "traditional dance performance", "folk music performance", "traditional musical instrument",
    "temple architecture", "historic monument", "traditional Indian clothing",
    "religious festival", "village life", "traditional craft or handmade object",
    "historical photograph", "museum artifact", "classical dance", "puppet performance",
    "traditional food", "wedding ceremony", "agricultural activity", "street market",
    "painting or mural", "sculpture", "historic building", "people in a cultural celebration"
]

app = FastAPI(title="CultureLens AI API", description="AI-assisted cultural heritage image tagging")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_classifier = None

def get_classifier():
    global _classifier
    if _classifier is None:
        try:
            _classifier = pipeline(
                "zero-shot-image-classification",
                model="openai/clip-vit-base-patch32"
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Could not load AI model: {exc}")
    return _classifier

def load_records():
    if not DATA_FILE.exists():
        return []
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def save_records(records):
    DATA_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CultureLens AI"}

@app.get("/api/archive")
def archive(q: str = ""):
    records = load_records()
    query = q.strip().lower()
    if query:
        records = [
            r for r in records
            if query in (r.get("title", "") + " " + r.get("description", "") + " " +
                         r.get("region", "") + " " + " ".join(r.get("tags", []))).lower()
        ]
    return sorted(records, key=lambda r: r.get("created_at", ""), reverse=True)

@app.post("/api/tag")
async def tag_image(
    file: UploadFile = File(...),
    title: str = Form("Untitled heritage item"),
    region: str = Form(""),
    year: str = Form(""),
    description: str = Form("")
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")
    raw = await file.read()
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")
    suffix = Path(file.filename or "image.jpg").suffix.lower()
    if suffix not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
        suffix = ".jpg"
    item_id = str(uuid4())
    image_name = item_id + suffix
    image_path = UPLOADS / image_name
    image.save(image_path)
    classifier = get_classifier()
    try:
        results = classifier(image, candidate_labels=CANDIDATE_LABELS)
    except Exception as exc:
        image_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"AI tagging failed: {exc}")
    top = results[:6]
    tags = [r["label"].title() for r in top if r.get("score", 0) >= 0.04]
    if not tags:
        tags = [r["label"].title() for r in top[:3]]
    record = {
        "id": item_id,
        "title": title.strip() or "Untitled heritage item",
        "region": region.strip(),
        "year": year.strip(),
        "description": description.strip(),
        "tags": tags,
        "scores": [{"label": r["label"], "score": round(float(r["score"]), 4)} for r in top],
        "image_url": f"/uploads/{image_name}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed": False
    }
    records = load_records()
    records.append(record)
    save_records(records)
    return record

@app.patch("/api/archive/{item_id}")
async def update_record(item_id: str, payload: dict):
    records = load_records()
    for i, record in enumerate(records):
        if record["id"] == item_id:
            for key in ["title", "region", "year", "description", "tags", "reviewed"]:
                if key in payload:
                    record[key] = payload[key]
            records[i] = record
            save_records(records)
            return record
    raise HTTPException(status_code=404, detail="Archive item not found.")

@app.delete("/api/archive/{item_id}")
def delete_record(item_id: str):
    records = load_records()
    match = next((r for r in records if r["id"] == item_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Archive item not found.")
    records = [r for r in records if r["id"] != item_id]
    save_records(records)
    image_name = match.get("image_url", "").split("/")[-1]
    if image_name:
        (UPLOADS / image_name).unlink(missing_ok=True)
    return {"deleted": True}

from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")
