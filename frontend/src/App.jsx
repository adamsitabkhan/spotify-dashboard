import { useState, useEffect } from "react";
import "./App.css";
import UploadScreen from "./components/UploadScreen";
import StreamTable from "./components/StreamTable";
import TopRankings from "./components/TopRankings";
import SettingsModal from "./components/SettingsModal";

function App() {
    const [data, setData] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    
    // Global Stream Definition Logic
    const [minSec, setMinSec] = useState(30);
    const [minPct, setMinPct] = useState(50);
    const [operator, setOperator] = useState("OR");

    // Dynamic stat recalculation
    const [totalStreams, setTotalStreams] = useState(0);

    // Initial load sets data, triggering first stats
    useEffect(() => {
        if (data) {
            setTotalStreams(data.total_streams);
        }
    }, [data]);

    // Recalculate stats when settings change
    useEffect(() => {
        if (!data) return;
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/stats`);
        url.searchParams.set("min_sec", minSec);
        url.searchParams.set("min_pct", minPct);
        url.searchParams.set("operator", operator);

        fetch(url)
            .then(res => res.json())
            .then(res => {
                setTotalStreams(res.total_streams || 0);
            })
            .catch(console.error);
    }, [minSec, minPct, operator, data]);

    if (!data) {
        return <UploadScreen onDataLoaded={setData} />;
    }

    return (
        <div className="app">
            <header className="header">
                <div className="header__title">
                    <span className="header__dot" />
                    Spotify Dashboard
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span className="header__stats">
                        {totalStreams.toLocaleString()} total streams
                    </span>
                    <button className="settings-btn" onClick={() => setShowSettings(true)} title="Stream Logic Settings">
                        ⚙️
                    </button>
                </div>
            </header>
            <div className="dashboard">
                <div className="panel panel--left">
                    <StreamTable 
                        totalStreams={totalStreams} 
                        minSec={minSec} 
                        minPct={minPct} 
                        operator={operator} 
                    />
                </div>
                <div className="panel panel--right">
                    <TopRankings 
                        minSec={minSec} 
                        minPct={minPct} 
                        operator={operator} 
                    />
                </div>
            </div>
            
            {showSettings && (
                <SettingsModal 
                    onClose={() => setShowSettings(false)}
                    minSec={minSec} setMinSec={setMinSec}
                    minPct={minPct} setMinPct={setMinPct}
                    operator={operator} setOperator={setOperator}
                />
            )}
        </div>
    );
}

export default App;
