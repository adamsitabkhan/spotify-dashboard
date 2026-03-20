import { useState, useRef } from "react";

function UploadScreen({ onDataLoaded }) {
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    const handleFile = (f) => {
        if (f && f.name.endsWith(".zip")) {
            setFile(f);
            setError(null);
        } else {
            setError("Please select a .zip file.");
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/upload`,
                { method: "POST", body: formData }
            );
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Something went wrong.");
            } else {
                onDataLoaded(data);
            }
        } catch {
            setError("Failed to connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-screen">
            <div className="upload-card">
                <div className="upload-card__icon">🎵</div>
                <h1 className="upload-card__title">Spotify Dashboard</h1>
                <p className="upload-card__subtitle">
                    Upload the <strong>.zip</strong> file from your Spotify
                    Extended Streaming History to explore your listening data.
                </p>

                <div
                    className={`upload-dropzone ${dragActive ? "upload-dropzone--active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <span className="upload-dropzone__text">
                        Drag & drop your file here, or{" "}
                        <span className="upload-dropzone__browse">browse</span>
                    </span>
                    {file && (
                        <span className="upload-dropzone__filename">
                            {file.name}
                        </span>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".zip"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                        style={{ display: "none" }}
                    />
                </div>

                {loading ? (
                    <div className="upload-loading">
                        <div className="spinner" />
                        Analyzing your data…
                    </div>
                ) : (
                    <button
                        className="upload-btn"
                        disabled={!file}
                        onClick={handleUpload}
                    >
                        Upload and Analyze
                    </button>
                )}

                {error && <p className="upload-error">{error}</p>}
            </div>
        </div>
    );
}

export default UploadScreen;
