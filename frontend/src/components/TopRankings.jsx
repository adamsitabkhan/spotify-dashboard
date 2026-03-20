import { useState, useEffect } from "react";

const CATEGORIES = ["Songs", "Albums", "Artists"];
const METRICS = ["Minutes", "Streams"];

function formatDuration(ms) {
    if (ms == null) return "—";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function TopRankings({ minSec, minPct, operator }) {
    const [category, setCategory] = useState("Songs");
    const [metric, setMetric] = useState("Minutes");

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);

    // Data state
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Reset page when sorting or category changes
    useEffect(() => {
        setPage(1);
    }, [category, metric, pageSize]);

    useEffect(() => {
        let active = true;
        setLoading(true);

        let endpoint = "tracks";
        if (category === "Albums") endpoint = "albums";
        if (category === "Artists") endpoint = "artists";

        const url = new URL(`http://localhost:8000/top/${endpoint}`);
        url.searchParams.set("page", page);
        url.searchParams.set("page_size", pageSize);
        url.searchParams.set("metric", metric);
        url.searchParams.set("min_sec", minSec);
        url.searchParams.set("min_pct", minPct);
        url.searchParams.set("operator", operator);

        fetch(url)
            .then(res => res.json())
            .then(res => {
                if (active) {
                    setData(res.rows || []);
                    setTotal(res.total || 0);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [page, pageSize, category, metric, minSec, minPct, operator]);

    const displayItems = data.map(item => ({
        ...item,
        value: metric === "Minutes" ? Math.round(item.total_ms / 60000) : item.stream_count,
        label: metric === "Minutes" 
            ? "min" 
            : (item.stream_count === 1 ? "stream" : "streams")
    }));

    const showDuration = category === "Songs";
    const maxPage = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
                    Top {category}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="count-badge">
                        {loading ? "..." : total.toLocaleString()} total
                    </span>
                </div>
            </div>

            <div className="panel__body" style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
                {displayItems.length === 0 && !loading && (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
                        No items found.
                    </div>
                )}
                {displayItems.map((item, i) => {
                    const rankPos = (page - 1) * pageSize + i + 1;
                    return (
                        <div className="rank-item" key={item.name + rankPos}>
                            {item.image_url ? (
                                <img src={item.image_url} alt="" className="rank-item__img" />
                            ) : (
                                <div className="rank-item__img rank-item__img--placeholder">🎵</div>
                            )}
                            <span className={`rank-item__pos ${rankPos <= 3 ? "rank-item__pos--top3" : ""}`}>
                                {rankPos}
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
                    );
                })}
            </div>

            <div className="pagination-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Rows per page:</span>
                    <select 
                        className="pagination-select"
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                
                <div className="pagination-controls">
                    <button 
                        className="pagination-btn" 
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        ← Prev
                    </button>
                    <span className="pagination-info">
                        Page {page} of {maxPage}
                    </span>
                    <button 
                        className="pagination-btn" 
                        disabled={page === maxPage || total === 0}
                        onClick={() => setPage(p => Math.min(maxPage, p + 1))}
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TopRankings;
