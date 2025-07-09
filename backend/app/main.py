from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import io

app = FastAPI()

# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Change if your React app runs elsewhere
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Music dashboard backend up and running"}

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        return JSONResponse(status_code=400, content={"error": "Only CSV files are supported."})

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    # Simplified assumption: the CSV has a "trackName" column
    if "trackName" not in df.columns:
        return JSONResponse(status_code=400, content={"error": "Missing 'trackName' column in uploaded CSV."})

    top_tracks = df["trackName"].value_counts().head(5).to_dict()

    return {"top_tracks": top_tracks}