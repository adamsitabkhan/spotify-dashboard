import { useState, useMemo } from "react";

const CATEGORIES = ["Songs", "Albums", "Artists"];
const METRICS = ["Minutes", "Streams"];

function formatDuration(ms) {
    if (ms == null) return "—";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function TopRankings({ topTracks, topAlbums, topArtists }) {
    const [category, setCategory] = useState("Songs");
    const [metric, setMetric] = useState("Minutes");

    const sourceData = useMemo(() => {
        if (category === "Songs") return topTracks;
        if (category === "Albums") return topAlbums;
        return topArtists;
    }, [category, topTracks, topAlbums, topArtists]);

    const rankedItems = useMemo(() => {
        if (metric === "Minutes") {
            return sourceData
                .slice()
                .sort((a, b) => b.total_ms - a.total_ms)
                .map((item) => ({
                    name: item.name,
                    value: Math.round(item.total_ms / 60000),
                    label: "min",
                    duration_ms: item.duration_ms ?? null,
                    image_url: item.image_url ?? null,
                }));
        }

        // "Streams" mode — uses the pre-aggregated stream_count from the backend top-100 lists!
        return sourceData
            .slice()
            .sort((a, b) => b.stream_count - a.stream_count)
            .map((item) => ({
                name: item.name,
                value: item.stream_count,
                label: item.stream_count === 1 ? "stream" : "streams",
                duration_ms: item.duration_ms ?? null,
                image_url: item.image_url ?? null,
            }));
    }, [sourceData, metric]);

    const showDuration = category === "Songs";

    return (
        <>
            <div className="rankings-controls">
                <div className="rankings-controls__row">
                    <div className="toggle-group">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c}
                                className={`toggle-btn ${category === c ? "toggle-btn--active" : ""}`}
                                onClick={() => setCategory(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    <div className="toggle-group">
                        {METRICS.map((m) => (
                            <button
                                key={m}
                                className={`toggle-btn ${metric === m ? "toggle-btn--active" : ""}`}
                                onClick={() => setMetric(m)}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="panel__header panel__header--rankings">
                <span className="panel__title">
                    Top {rankedItems.length} {category}
                </span>
            </div>

            <div className="panel__body">
                {rankedItems.map((item, i) => (
                    <div className="rank-item" key={item.name}>
                        {item.image_url ? (
                            <img src={item.image_url} alt="" className="rank-item__img" />
                        ) : (
                            <div className="rank-item__img rank-item__img--placeholder">🎵</div>
                        )}
                        <span className={`rank-item__pos ${i < 3 ? "rank-item__pos--top3" : ""}`}>
                            {i + 1}
                        </span>
                        <div className="rank-item__info">
                            <div className="rank-item__name" title={item.name}>
                                {item.name}
                            </div>
                            {showDuration && (
                                <div className="rank-item__duration">
                                    {formatDuration(item.duration_ms)}
                                </div>
                            )}
                        </div>
                        <span className="rank-item__value">
                            {item.value.toLocaleString()} {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </>
    );
}

export default TopRankings;
