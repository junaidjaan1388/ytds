# main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
import yt_dlp, tempfile, os

app = FastAPI()

@app.get("/download")
def download(url: str):
    tmp = tempfile.mkdtemp()
    opts = {
        "outtmpl": f"{tmp}/%(title)s.%(ext)s",
        "format": "best[filesize<50M]/best",
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            path = ydl.prepare_filename(info)
        return FileResponse(path, filename=os.path.basename(path))
    except Exception as e:
        raise HTTPException(400, str(e))
