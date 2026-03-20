import { useState, useEffect, useCallback } from "react";

function formatTimestamp(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPlaytime(sec) {
    if (typeof sec !== "number") return "—";
    if (sec < 60) return `${Math.floor(sec)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
}

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function StreamTable({ totalStreams: initialTotal }) {
    // UI State
    const [filtersOpen, setFiltersOpen] = useState(false);
    
    // API State
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(initialTotal);
    const [loading, setLoading] = useState(false);

    // Query State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortAsc, setSortAsc] = useState(false);
    
    const [artistFilter, setArtistFilter] = useState("");
    const [albumFilter, setAlbumFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [minSeconds, setMinSeconds] = useState(0);

    // Debounced values for API calls
    const debouncedArtist = useDebounce(artistFilter, 400);
    const debouncedAlbum = useDebounce(albumFilter, 400);
    const debouncedDate = useDebounce(dateFilter, 400);
    const debouncedMinSecs = useDebounce(minSeconds, 400);

    // Reset to page 1 when filters or sort change
    useEffect(() => {
        setPage(1);
    }, [debouncedArtist, debouncedAlbum, debouncedDate, debouncedMinSecs, sortAsc, pageSize]);

    // Fetch data
    useEffect(() => {
        const url = new URL("http://localhost:8000/streams");
        url.searchParams.set("page", page);
        url.searchParams.set("page_size", pageSize);
        url.searchParams.set("sort", sortAsc ? "asc" : "desc");
        if (debouncedArtist) url.searchParams.set("artist", debouncedArtist);
        if (debouncedAlbum) url.searchParams.set("album", debouncedAlbum);
        if (debouncedDate) url.searchParams.set("date", debouncedDate);
        if (debouncedMinSecs > 0) url.searchParams.set("min_seconds", debouncedMinSecs);

        let active = true;
        setLoading(true);

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (active) {
                    setRows(data.rows || []);
                    setTotal(data.total || 0);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Failed to fetch streams:", err);
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [page, pageSize, sortAsc, debouncedArtist, debouncedAlbum, debouncedDate, debouncedMinSecs]);

    const toggleSort = useCallback(() => setSortAsc(v => !v), []);
    
    const maxPage = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="panel__header">
                <span className="panel__title">Stream Log</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button 
                        className={`sort-toggle ${filtersOpen ? "sort-toggle--active" : ""}`}
                        onClick={() => setFiltersOpen(v => !v)}
                        title="Toggle Filters"
                    >
                        🔍 Filter
                    </button>
                    <button
                        className="sort-toggle"
                        onClick={toggleSort}
                        title={sortAsc ? "Oldest first — click for newest first" : "Newest first — click for oldest first"}
                    >
                        {sortAsc ? "↑ Oldest first" : "↓ Newest first"}
                    </button>
                    <span className="count-badge">
                        {loading ? "..." : total.toLocaleString()} streams
                    </span>
                </div>
            </div>
            
            {filtersOpen && (
                <div className="filter-bar">
                    <input 
                        type="text" 
                        className="filter-input" 
                        placeholder="Filter by Artist..." 
                        value={artistFilter}
                        onChange={e => setArtistFilter(e.target.value)}
                    />
                    <input 
                        type="text" 
                        className="filter-input" 
                        placeholder="Filter by Album..." 
                        value={albumFilter}
                        onChange={e => setAlbumFilter(e.target.value)}
                    />
                    <input 
                        type="text" 
                        className="filter-input filter-input--date" 
                        placeholder="Date (e.g. 2025-11-12)..." 
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)"}}>Min Sec:</span>
                        <input
                            type="number"
                            className="filter-input"
                            style={{ width: "60px" }}
                            value={minSeconds}
                            min={0}
                            onChange={e => setMinSeconds(Number(e.target.value))}
                        />
                    </div>
                    {(artistFilter || albumFilter || dateFilter || minSeconds > 0) && (
                        <button 
                            className="sort-toggle" 
                            style={{marginLeft: "auto"}}
                            onClick={() => { 
                                setArtistFilter(""); 
                                setAlbumFilter(""); 
                                setDateFilter(""); 
                                setMinSeconds(0); 
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            <div className="panel__body" style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
                <table className="stream-table">
                    <thead>
                        <tr>
                            <th className="col-ts">Timestamp</th>
                            <th className="col-track">Song Title</th>
                            <th className="col-album">Album</th>
                            <th className="col-artist">Artist</th>
                            <th className="col-sec">Playtime</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
                                    No streams found.
                                </td>
                            </tr>
                        )}
                        {rows.map((s, i) => (
                            <tr key={i}>
                                <td className="col-ts" title={s.ts}>{formatTimestamp(s.ts)}</td>
                                <td title={s.track_name}>{s.track_name || "—"}</td>
                                <td title={s.album_name}>{s.album_name || "—"}</td>
                                <td title={s.artist_name}>{s.artist_name || "—"}</td>
                                <td>{formatPlaytime(s.seconds_played)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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

export default StreamTable;
