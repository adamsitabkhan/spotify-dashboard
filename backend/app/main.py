from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

import pandas as pd
import duckdb
import os
import zipfile
import tempfile
import json
import time
import base64
import aiohttp

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_PATH = os.path.join(os.path.dirname(__file__), "spotify_cache.json")

# Module-level DuckDB connection (in-memory)
db_conn = duckdb.connect()

def load_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"track_data": {}, "artist_images": {}}

def save_cache(cache: dict):
    try:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f)
    except Exception as e:
        print("Failed to save Spotify cache:", e)

@app.get("/")
def root():
    return {"message": "Music dashboard backend up and running"}

async def fetch_spotify_data(track_uris: list) -> tuple:
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    if not client_id or not client_secret or client_id == "your_client_id_here":
        return {}, {}, {}

    id_map = {}
    for uri in track_uris:
        if uri and isinstance(uri, str) and uri.startswith("spotify:track:"):
            track_id = uri.split(":")[-1]
            id_map[track_id] = uri

    if not id_map:
        return {}, {}, {}

    cache = load_cache()
    if "track_data" not in cache: cache["track_data"] = {}
    if "artist_images" not in cache: cache["artist_images"] = {}

    track_cache = cache["track_data"]
    artist_cache = cache["artist_images"]

    track_results = {}
    album_images = {}
    
    uncached_track_ids = []
    
    for track_id in id_map:
        if track_id in track_cache:
            data = track_cache[track_id]
            track_results[track_id] = data
            if "album_name" in data and "image_url" in data:
                album_images[data["album_name"]] = data["image_url"]
        else:
            uncached_track_ids.append(track_id)

    fetched_artist_ids = {}
    
    try:
        async with aiohttp.ClientSession() as session:
            credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
            async with session.post(
                "https://accounts.spotify.com/api/token",
                headers={"Authorization": f"Basic {credentials}",
                         "Content-Type": "application/x-www-form-urlencoded"},
                data={"grant_type": "client_credentials"},
            ) as token_resp:
                if token_resp.status != 200:
                    return track_results, album_images, artist_cache
                token_data = await token_resp.json()
                access_token = token_data["access_token"]

            batch_size = 50
            for i in range(0, len(uncached_track_ids), batch_size):
                batch = uncached_track_ids[i:i + batch_size]
                async with session.get(
                    "https://api.spotify.com/v1/tracks",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"ids": ",".join(batch)},
                ) as tracks_resp:
                    if tracks_resp.status != 200:
                        continue
                    tracks_data = await tracks_resp.json()
                    for track in tracks_data.get("tracks", []):
                        if track and "id" in track:
                            tid = track["id"]
                            entry = {
                                "duration_ms": track.get("duration_ms"),
                                "image_url": track.get("album", {}).get("images", [{}])[0].get("url") if track.get("album", {}).get("images") else None,
                                "album_name": track.get("album", {}).get("name"),
                            }
                            if track.get("artists"):
                                entry["artist_id"] = track["artists"][0].get("id")
                                entry["artist_name"] = track["artists"][0].get("name")
                                fetched_artist_ids[entry["artist_id"]] = entry["artist_name"]
                            
                            track_results[tid] = entry
                            track_cache[tid] = entry
                            if entry["album_name"] and entry["image_url"]:
                                album_images[entry["album_name"]] = entry["image_url"]

            uncached_artist_ids = {}
            for t_data in track_results.values():
                a_id = t_data.get("artist_id")
                a_name = t_data.get("artist_name")
                if a_id and a_name and a_name not in artist_cache:
                    uncached_artist_ids[a_id] = a_name

            u_artist_keys = list(uncached_artist_ids.keys())
            for i in range(0, len(u_artist_keys), batch_size):
                batch = u_artist_keys[i:i + batch_size]
                async with session.get(
                    "https://api.spotify.com/v1/artists",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"ids": ",".join(batch)},
                ) as artists_resp:
                    if artists_resp.status != 200:
                        continue
                    artists_data = await artists_resp.json()
                    for artist in artists_data.get("artists", []):
                        if artist and "id" in artist:
                            aid = artist["id"]
                            aname = uncached_artist_ids.get(aid)
                            img_url = artist.get("images", [{}])[0].get("url") if artist.get("images") else None
                            if aname:
                                artist_cache[aname] = img_url

            save_cache(cache)

    except Exception as e:
        print("Spotify API error:", e)

    return track_results, album_images, artist_cache


@app.post("/upload")
async def upload_zip(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        return JSONResponse(status_code=400, content={"error": "Please provide the .zip file sent to you by Spotify."})

    filename = file.filename.lower()
    content = await file.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = os.path.join(tmpdir, filename)
        with open(zip_path, "wb") as f:
            f.write(content)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(tmpdir)

        datadir = os.path.join(tmpdir, "Spotify Extended Streaming History")

        df = None
        for datafilename in os.listdir(datadir):
            datafilepath = os.path.join(datadir, datafilename)
            if not datafilepath.endswith(".json"):
                continue
            with open(datafilepath, "r", encoding="utf-8") as json_file:
                data = json.load(json_file)
                df2 = pd.DataFrame(data)
                if df is None:
                    df = df2
                else:
                    df = pd.concat([df, df2], ignore_index=True)

    if df is None or "master_metadata_track_name" not in df.columns:
        return JSONResponse(status_code=400, content={"error": "Missing expected columns in uploaded data."})

    # Prepare fields for DuckDB
    df["seconds_played"] = (df["ms_played"] / 1000.0).round(1)
    
    # Register the dataframe and create a persistent DuckDB table
    db_conn.register("df_upload", df)
    db_conn.execute("DROP TABLE IF EXISTS streams")
    db_conn.execute("CREATE TABLE streams AS SELECT * FROM df_upload")

    # Get total streams count
    total_streams = db_conn.execute("SELECT COUNT(*) FROM streams").fetchone()[0]

    # Pre-aggregate Top 100 Tracks
    top_tracks_df = db_conn.execute("""
        SELECT 
            master_metadata_track_name as name, 
            SUM(ms_played) as total_ms, 
            COUNT(ms_played) as stream_count,
            FIRST(spotify_track_uri ORDER BY ts DESC) as uri
        FROM streams
        WHERE master_metadata_track_name IS NOT NULL AND master_metadata_track_name != ''
        GROUP BY master_metadata_track_name
        ORDER BY total_ms DESC
        LIMIT 100
    """).df()
    top_tracks_list = top_tracks_df.to_dict(orient="records")

    # Pre-aggregate Top 100 Albums
    top_albums_list = db_conn.execute("""
        SELECT 
            master_metadata_album_album_name as name, 
            SUM(ms_played) as total_ms, 
            COUNT(ms_played) as stream_count
        FROM streams
        WHERE master_metadata_album_album_name IS NOT NULL AND master_metadata_album_album_name != ''
        GROUP BY master_metadata_album_album_name
        ORDER BY total_ms DESC
        LIMIT 100
    """).df().to_dict(orient="records")

    # Pre-aggregate Top 100 Artists
    top_artists_list = db_conn.execute("""
        SELECT 
            master_metadata_album_artist_name as name, 
            SUM(ms_played) as total_ms, 
            COUNT(ms_played) as stream_count
        FROM streams
        WHERE master_metadata_album_artist_name IS NOT NULL AND master_metadata_album_artist_name != ''
        GROUP BY master_metadata_album_artist_name
        ORDER BY total_ms DESC
        LIMIT 100
    """).df().to_dict(orient="records")

    # Fetch Images & Durations
    top_track_uris = [t["uri"] for t in top_tracks_list]
    track_data_dict, album_images, artist_images = await fetch_spotify_data(top_track_uris)

    for track in top_tracks_list:
        uri = track["uri"]
        if uri and isinstance(uri, str) and uri.startswith("spotify:track:"):
            track_id = uri.split(":")[-1]
            tdata = track_data_dict.get(track_id, {})
            track["duration_ms"] = tdata.get("duration_ms")
            track["image_url"] = tdata.get("image_url")
        else:
            track["duration_ms"] = None
            track["image_url"] = None

    for album in top_albums_list:
        album["image_url"] = album_images.get(album["name"])
        
    for artist in top_artists_list:
        artist["image_url"] = artist_images.get(artist["name"])

    return {
        "total_streams": total_streams,
        "top_tracks": top_tracks_list,
        "top_albums": top_albums_list,
        "top_artists": top_artists_list,
    }


@app.get("/streams")
async def get_streams(
    page: int = 1,
    page_size: int = 25,
    sort: str = "desc",
    artist: str = "",
    album: str = "",
    date: str = "",
    min_seconds: float = 0.0
):
    offset = (page - 1) * page_size
    
    # Base conditions
    conditions = ["seconds_played >= ?"]
    params = [min_seconds]

    if artist:
        conditions.append("LOWER(master_metadata_album_artist_name) LIKE ?")
        params.append(f"%{artist.lower()}%")
    if album:
        conditions.append("LOWER(master_metadata_album_album_name) LIKE ?")
        params.append(f"%{album.lower()}%")
    if date:
        # Simple substring match against the ISO timestamp
        conditions.append("LOWER(ts) LIKE ?")
        params.append(f"%{date.lower()}%")

    where_clause = " AND ".join(conditions)
    
    order_direction = "ASC" if sort == "asc" else "DESC"
    order_clause = f"ORDER BY ts {order_direction}"

    # Query Total Matching Count
    count_query = f"SELECT COUNT(*) FROM streams WHERE {where_clause}"
    total_matching = db_conn.execute(count_query, params).fetchone()[0]

    # Query Rows
    select_query = f"""
        SELECT 
            ts as ts, 
            master_metadata_track_name as track_name,
            master_metadata_album_album_name as album_name,
            master_metadata_album_artist_name as artist_name,
            seconds_played as seconds_played
        FROM streams
        WHERE {where_clause}
        {order_clause}
        LIMIT ? OFFSET ?
    """
    row_params = params + [page_size, offset]
    
    rows_df = db_conn.execute(select_query, row_params).df()
    rows = rows_df.fillna("").to_dict(orient="records")

    return {
        "rows": rows,
        "total": total_matching,
        "page": page,
        "page_size": page_size
    }