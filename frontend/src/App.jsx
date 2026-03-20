import { useState } from "react";
import "./App.css";
import UploadScreen from "./components/UploadScreen";
import StreamTable from "./components/StreamTable";
import TopRankings from "./components/TopRankings";

function App() {
    const [data, setData] = useState(null);

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
                <span className="header__stats">
                    {data.total_streams.toLocaleString()} total streams
                </span>
            </header>
            <div className="dashboard">
                <div className="panel panel--left">
                    <StreamTable totalStreams={data.total_streams} />
                </div>
                <div className="panel panel--right">
                    <TopRankings
                        topTracks={data.top_tracks}
                        topAlbums={data.top_albums}
                        topArtists={data.top_artists}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
