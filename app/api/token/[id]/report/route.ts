import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Risk scoring logic
const calculateRiskScore = (holder: any, insiders: any[]) => {
    let score = 0;
    const ownershipPct = holder.pct || 0;
    const isInsider = insiders.some((insider) => insider.id === holder.owner);

    if (ownershipPct > 0.1) score += 30; // High ownership concentration
    if (isInsider) score += 50; // Insider flag
    if (holder.amount > 1000000) score += 20; // Large token volume

    return Math.min(score, 100); // Cap at 100
};

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 1]; // Get the last part of the path

    try {
        // Fetch token report
        const reportResponse = await axios.get(
            `https://api.rugcheck.xyz/v1/tokens/${id}/report`,
        );
        const reportData = reportResponse.data;

        // Fetch insider graph (assuming it returns a list of insider networks)
        let insiders = [];
        try {
            const insidersResponse = await axios.get(
                `https://api.rugcheck.xyz/v1/tokens/${id}/insiders/graph`,
            );
            insiders = insidersResponse.data?.insiderNetworks || [];
        } catch (err) {
            console.warn("Insider graph fetch failed:", err.message);
        }

        // Process wallet profiles
        const walletProfiles = (reportData.topHolders || []).map(
            (holder: any) => ({
                address: holder.owner,
                amount: holder.uiAmountString,
                percentage: holder.pct,
                riskScore: calculateRiskScore(holder, insiders),
                isInsider: insiders.some(
                    (insider: any) => insider.id === holder.owner,
                ),
            }),
        );

        return NextResponse.json({
            token: reportData.mint,
            creator: reportData.creator,
            walletProfiles,
            rawReport: reportData,
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch token data" },
            { status: 500 },
        );
    }
}
