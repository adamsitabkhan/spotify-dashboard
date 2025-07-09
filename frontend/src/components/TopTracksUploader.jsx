import { useState } from "react";

function TopTracksUploader() {
    const [file, setFile] = useState(null);
    const [topTracks, setTopTracks] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setTopTracks(null); // reset output
        setError(null);     // reset error
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("http://localhost:8000/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong.");
            } else {
                setTopTracks(data.top_tracks);
                setError(null);
            }
        } catch (err) {
            setError("Failed to connect to backend.");
            console.error(err);
        }
    };

    return (
        <div className="p-4 max-w-xl mx-auto space-y-4">
            <h2 className="text-xl font-bold">Spotify Listening History Dashboard</h2>
            <h3>Please upload the .zip file provided to you by Spotify.</h3>
            <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="block"
            />
            <button
                onClick={handleUpload}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Upload and Analyze
            </button>

            {error && <p className="text-red-600">{error}</p>}

            {topTracks && (
                <div className="mt-6">
                    <h3 className="font-semibold text-lg mb-2">Top 10 Tracks</h3>
                    <ul className="list-disc list-inside">
                        {Object.entries(topTracks).map(([track, count]) => (
                            <li key={track}>
                                {track} — {count} plays
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default TopTracksUploader;