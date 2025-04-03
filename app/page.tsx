"use client";
import { useState } from "react";

export default function Home() {
    const [tokenAddress, setTokenAddress] = useState("");
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [labelWallet, setLabelWallet] = useState("");
    const [labelText, setLabelText] = useState("");
    const [evidence, setEvidence] = useState("");

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

    return (
        <div style={{ padding: "20px" }}>
            <h1>Token Risk Assessment</h1>
            <div>
                <input
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="Enter token address"
                    style={{ marginRight: "10px", padding: "5px" }}
                />
                <button
                    onClick={fetchTokenData}
                    style={{ padding: "5px 10px" }}
                >
                    Analyze
                </button>
            </div>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {data && (
                <div>
                    <h2>Token: {data.token}</h2>
                    <h3>Creator: {data.creator}</h3>
                    <h3>Wallet Profiles</h3>
                    <table
                        style={{ borderCollapse: "collapse", width: "100%" }}
                    >
                        <thead>
                            <tr>
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
                                    Insider
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
                                            {profile.isInsider ? "Yes" : "No"}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <h3>Community Labeling</h3>
            <div>
                <input
                    value={labelWallet}
                    onChange={(e) => setLabelWallet(e.target.value)}
                    placeholder="Wallet address"
                    style={{ marginRight: "10px", padding: "5px" }}
                />
                <input
                    value={labelText}
                    onChange={(e) => setLabelText(e.target.value)}
                    placeholder="Label (e.g., Suspicious)"
                    style={{ marginRight: "10px", padding: "5px" }}
                />
                <input
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Evidence (optional)"
                    style={{ marginRight: "10px", padding: "5px" }}
                />
                <button onClick={submitLabel} style={{ padding: "5px 10px" }}>
                    Submit Label
                </button>
            </div>
        </div>
    );
}
