from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import pandas as pd
import os
import zipfile
import tempfile
import json
import time
import io

app = FastAPI()

def print_tree(start_path, prefix=""):
    for item in os.listdir(start_path):
        path = os.path.join(start_path, item)
        print(prefix + "├── " + item)
        if os.path.isdir(path):
            print_tree(path, prefix + "│   ")

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
    if not file.filename.endswith(".zip"):
        return JSONResponse(status_code=400, content={"error": "Please provide the .zip file sent to you by Spotify."})
    
    filename = file.filename.lower()
    content = await file.read()
    
    start_time = time.perf_counter()
    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = os.path.join(tmpdir, filename)
        with open(zip_path, "wb") as f:
            f.write(content)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(tmpdir)
        
        datadir = f"{tmpdir}\\Spotify Extended Streaming History"
    
        full_df = None
        for datafilename in os.listdir(datadir):
            datafilepath = os.path.join(datadir, datafilename)
            
            if not datafilepath.endswith(".json"): continue
                
            with open(datafilepath, "r", encoding="utf-8") as json_file:
                data = json.load(json_file)
                df = pd.DataFrame(data)
                if full_df is None:
                    full_df = df
                else:
                    full_df = pd.concat([full_df, df], ignore_index=True)
    end_time = time.perf_counter()
    print("Time:", end_time - start_time)

    # Simplified assumption: the CSV has a "trackName" column
    if "master_metadata_track_name" not in full_df.columns:
        return JSONResponse(status_code=400, content={"error": "Missing 'master_metadata_track_name' column in one of uploaded JSON files."})

    top_tracks = full_df["master_metadata_track_name"].value_counts().head(10).to_dict()

    return {"top_tracks": top_tracks}