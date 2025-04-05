"use client";
import { useState, useEffect } from "react";

export default function Home() {
    const [tokenAddress, setTokenAddress] = useState("");
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [labelWallet, setLabelWallet] = useState("");
    const [labelText, setLabelText] = useState("");
    const [evidence, setEvidence] = useState("");
    const [alertWallet, setAlertWallet] = useState("");
    const [alertCondition, setAlertCondition] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [alerts, setAlerts] = useState<any[]>([]);

    const fetchTokenData = async () => {
        setError(null);
        try {
            const res = await fetch(`/api/token/${tokenAddress}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();
            setData(result);
        } catch (err) {
            setError("Error fetching token data");
        }
    };

    const submitLabel = async () => {
        try {
            const res = await fetch("/api/wallet/label", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: labelWallet,
                    label: labelText,
                    evidence,
                }),
            });
            if (!res.ok) throw new Error("Failed to submit label");
            alert("Label submitted successfully!");
            setLabelWallet("");
            setLabelText("");
            setEvidence("");
        } catch (err) {
            setError("Error submitting label");
        }
    };

    const submitAlert = async () => {
        try {
            const res = await fetch("/api/alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: alertWallet,
                    condition: alertCondition,
                    message: alertMessage,
                }),
            });
            if (!res.ok) throw new Error("Failed to submit alert");
            alert("Alert set successfully!");
            fetchAlerts();
            setAlertWallet("");
            setAlertCondition("");
            setAlertMessage("");
        } catch (err) {
            setError("Error submitting alert");
        }
    };

    const fetchAlerts = async () => {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        setAlerts(data);
        // Basic alert check (for demo)
        if (data.token) {
            data.walletProfiles.forEach((profile: any) => {
                alerts.forEach((alert: any) => {
                    if (
                        alert.wallet_address === profile.address &&
                        eval(`profile.${alert.condition}`)
                    ) {
                        console.log(`Alert triggered: ${alert.message}`);
                    }
                });
            });
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1 style={{ color: "#333" }}>Token Risk Assessment</h1>
            <div style={{ marginBottom: "20px" }}>
                <input
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="Enter token address"
                    style={{
                        marginRight: "10px",
                        padding: "8px",
                        width: "300px",
                    }}
                />
                <button
                    onClick={fetchTokenData}
                    style={{
                        padding: "8px 16px",
                        background: "#0070f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Analyze
                </button>
            </div>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {data && (
                <div>
                    <h2 style={{ color: "#555" }}>
                        Token Report: {data.token}
                    </h2>
                    <p>
                        <strong>Creator:</strong> {data.creator}
                    </p>
                    
                    {/* Liquidity Monitoring Section */}
                    <h3>Liquidity Monitoring</h3>
                    <div style={{ 
                        padding: "15px", 
                        backgroundColor: data.liquidityMonitoring?.liquidityEvent?.detected ? "#fff8f8" : "#f8fff8",
                        border: `1px solid ${data.liquidityMonitoring?.liquidityEvent?.detected ? "#ffcccc" : "#ccffcc"}`,
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                            <div>
                                <p><strong>Current Liquidity:</strong> ${data.liquidityMonitoring?.currentLiquidity?.toLocaleString() || "0"}</p>
                                <p><strong>LP Locked:</strong> {data.liquidityMonitoring?.lpLocked || 0}%</p>
                            </div>
                            
                            {data.liquidityMonitoring?.liquidityEvent?.detected && (
                                <div style={{ 
                                    backgroundColor: data.liquidityMonitoring.liquidityEvent.severity === "high" ? "#ef4444" : "#f59e0b",
                                    color: "white",
                                    padding: "10px 15px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center"
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    <span><strong>Warning:</strong> {data.liquidityMonitoring.liquidityEvent.reason}</span>
                                </div>
                            )}
                        </div>
                        
                        {data.liquidityMonitoring?.historicalData?.length > 1 && (
                            <div>
                                <p><strong>Liquidity History (Last 24 Hours):</strong></p>
                                <div style={{ height: "100px", display: "flex", alignItems: "flex-end", marginTop: "10px" }}>
                                    {data.liquidityMonitoring.historicalData.slice(0, 10).reverse().map((point, i) => {
                                        const maxLiquidity = Math.max(...data.liquidityMonitoring.historicalData.map(h => h.liquidity));
                                        const height = maxLiquidity > 0 ? (point.liquidity / maxLiquidity) * 80 : 0;
                                        const date = new Date(point.timestamp * 1000);
                                        const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                                        
                                        return (
                                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: "15px" }}>
                                                <div style={{ 
                                                    height: `${height}px`, 
                                                    width: "20px", 
                                                    backgroundColor: "#0070f3",
                                                    borderRadius: "2px 2px 0 0"
                                                }}></div>
                                                <div style={{ fontSize: "10px", marginTop: "5px" }}>{timeString}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <h3>Tokenomics</h3>
                    <ul>
                        <li>
                            Liquidity Locked:{" "}
                            {data.tokenomics.liquidityLockedPct}%
                        </li>
                        <li>
                            Market Liquidity: $
                            {data.tokenomics.marketLiquidityUSD.toLocaleString()}
                        </li>
                        <li>Transfer Fee: {data.tokenomics.transferFeePct}%</li>
                        <li>
                            Liquidity Risk Score:{" "}
                            {data.tokenomics.liquidityRisk}
                        </li>
                    </ul>
                    
                    <h3>Wallet Profiles</h3>
                    <table
                        style={{
                            borderCollapse: "collapse",
                            width: "100%",
                            marginBottom: "20px",
                        }}
                    >
                        <thead>
                            <tr style={{ background: "#f5f5f5" }}>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Address
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Amount
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Percentage
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Risk Score
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Behavior Risk
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Insider
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Insider Probability
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Recent Txs
                                </th>
                                <th
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "8px",
                                    }}
                                >
                                    Timing Risk
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.walletProfiles.map(
                                (profile: any, index: number) => (
                                    <tr key={index}>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.address}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.amount}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {(profile.percentage * 100).toFixed(
                                                2,
                                            )}
                                            %
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.riskScore}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.behaviorRiskScore !== undefined ? (
                                                <div style={{ display: "flex", alignItems: "center" }}>
                                                    <div 
                                                        style={{ 
                                                            width: "12px", 
                                                            height: "12px", 
                                                            borderRadius: "50%", 
                                                            backgroundColor: profile.behaviorRiskScore >= 70 ? "#ef4444" : 
                                                                            profile.behaviorRiskScore >= 40 ? "#f59e0b" : "#22c55e",
                                                            marginRight: "8px"
                                                        }} 
                                                    />
                                                    <span>
                                                        {profile.behaviorRiskScore >= 70 ? "High" : 
                                                         profile.behaviorRiskScore >= 40 ? "Medium" : "Low"} 
                                                        ({profile.behaviorRiskScore})
                                                    </span>
                                                </div>
                                            ) : (
                                                "N/A"
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.isInsider ? "Yes" : "No"}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.insiderProbability !== undefined ? (
                                                <div style={{ display: "flex", alignItems: "center" }}>
                                                    <div 
                                                        style={{ 
                                                            width: "12px", 
                                                            height: "12px", 
                                                            borderRadius: "50%", 
                                                            backgroundColor: profile.insiderProbability >= 70 ? "#ef4444" : 
                                                                            profile.insiderProbability >= 40 ? "#f59e0b" : "#22c55e",
                                                            marginRight: "8px"
                                                        }} 
                                                    />
                                                    <span>
                                                        {profile.insiderProbability >= 70 ? "High" : 
                                                         profile.insiderProbability >= 40 ? "Medium" : "Low"} 
                                                        ({profile.insiderProbability}%)
                                                    </span>
                                                </div>
                                            ) : (
                                                "N/A"
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.recentTxCount}
                                        </td>
                                        <td
                                            style={{
                                                border: "1px solid #ddd",
                                                padding: "8px",
                                            }}
                                        >
                                            {profile.timingRisk}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <h3 style={{ marginTop: "20px" }}>Community Labeling</h3>
            <div style={{ marginBottom: "20px" }}>
                <input
                    value={labelWallet}
                    onChange={(e) => setLabelWallet(e.target.value)}
                    placeholder="Wallet address"
                    style={{
                        marginRight: "10px",
                        padding: "8px",
                        width: "200px",
                    }}
                />
                <input
                    value={labelText}
                    onChange={(e) => setLabelText(e.target.value)}
                    placeholder="Label (e.g., Suspicious)"
                    style={{
                        marginRight: "10px",
                        padding: "8px",
                        width: "200px",
                    }}
                />
                <input
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Evidence (optional)"
                    style={{
                        marginRight: "10px",
                        padding: "8px",
                        width: "200px",
                    }}
                />
                <button
                    onClick={submitLabel}
                    style={{
                        padding: "8px 16px",
                        background: "#0070f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Submit Label
                </button>
            </div>

            <h3>Set Alerts</h3>
            <div style={{ marginBottom: "20px" }}>
                <input
                    value={alertWallet}
                    onChange={(e) => setAlertWallet(e.target.value)}
                    placeholder="Wallet address"
                    style={{
                        marginRight: "10px",
                        padding: "8px",
                        width: "200px",
                    }}
                />
                <input
                    value={alertCondition}
                    onChange={(e) => setAlertCondition(e.target.value)}
                    placeholder="Condition (e.g., riskScore > 70)"
                    style={{
                        marginRight: "10px",
                        padding: "8px",
                        width: "200px",
                    }}
                />
                <input
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Message (optional)"
                    style={{
                        marginRight: "10px",
                        padding: "8px",
                        width: "200px",
                    }}
                />
                <button
                    onClick={submitAlert}
                    style={{
                        padding: "8px 16px",
                        background: "#0070f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Set Alert
                </button>
            </div>
            <h4>Active Alerts</h4>
            <ul>
                {alerts.map((alert) => (
                    <li key={alert.id}>
                        {alert.wallet_address}: {alert.condition} -{" "}
                        {alert.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}
