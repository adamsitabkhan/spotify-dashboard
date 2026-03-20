import React from "react";

function SettingsModal({ onClose, minSec, setMinSec, minPct, setMinPct, operator, setOperator }) {
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Stream Definition Logic</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="modal-desc">
                        Define exactly what counts as a stream! Adjust the minimum play duration and minimum total track percentage.
                    </p>
                    <div className="setting-row">
                        <label>Minimum Duration (seconds)</label>
                        <input 
                            type="number" 
                            className="setting-input"
                            value={minSec} 
                            min={0}
                            onChange={(e) => setMinSec(Number(e.target.value))} 
                        />
                    </div>
                    
                    <div className="setting-row setting-row--center">
                        <div className="operator-toggle">
                            <button 
                                className={`operator-btn ${operator === "AND" ? "active" : ""}`}
                                onClick={() => setOperator("AND")}
                            >AND</button>
                            <button 
                                className={`operator-btn ${operator === "OR" ? "active" : ""}`}
                                onClick={() => setOperator("OR")}
                            >OR</button>
                        </div>
                    </div>

                    <div className="setting-row">
                        <label>Minimum Track Percentage (%)</label>
                        <input 
                            type="number" 
                            className="setting-input"
                            value={minPct} 
                            min={0} max={100}
                            onChange={(e) => setMinPct(Number(e.target.value))} 
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="upload-btn" style={{ padding: "8px 16px", marginTop: "12px" }} onClick={onClose}>Apply Logic</button>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
