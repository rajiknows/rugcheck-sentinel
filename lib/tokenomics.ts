import { InsiderGraph } from "./types";

export const calculateRiskScore = (
    holder: any,
    insiders: InsiderGraph,
    transactions: any[],
) => {
    let score = 0;
    const ownershipPct = holder.pct || 0;
    const isInsider = insiders.nodes.some(
        (insider) => insider.id === holder.owner,
    );
    const recentTxCount = transactions.filter(
        (tx) =>
            new Date(tx.blockTime * 1000) >
            new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).length;

    if (ownershipPct > 0.1) score += 30;
    if (isInsider) score += 50;
    if (holder.amount > 1000000) score += 20;
    if (recentTxCount > 10) score += 20;

    return Math.min(score, 100);
};

export const analyzeTokenomics = (reportData: any, lockersData: any) => {
    const liquidityLockedPct = lockersData?.total?.pct || 0;
    const marketLiquidity = reportData.totalMarketLiquidity || 0;
    const transferFeePct = reportData.transferFee?.pct || 0;

    let liquidityRisk = 0;
    if (liquidityLockedPct < 0.5) liquidityRisk += 40; // Low locked liquidity
    if (marketLiquidity < 10000) liquidityRisk += 30; // Low liquidity
    if (transferFeePct > 0.05) liquidityRisk += 20; // High transfer fee

    return {
        liquidityLockedPct: (liquidityLockedPct * 100).toFixed(2),
        marketLiquidityUSD: marketLiquidity,
        transferFeePct: (transferFeePct * 100).toFixed(2),
        liquidityRisk: Math.min(liquidityRisk, 100),
    };
};

export function calculateBehaviorRiskScore(
    transactions: any[],
    creationTime: number,
) {
    const now = Date.now() / 1000; // Current time in seconds
    const daysSinceCreation = (now - creationTime) / (24 * 3600) || 1; // Avoid division by zero
    const txsPerDay = transactions.length / daysSinceCreation;

    let score = 0;
    if (txsPerDay > 5) score += 25; // High frequency

    const totalVolume =
        transactions.reduce((sum, tx) => sum + Math.abs(tx.lamports || 0), 0) /
        1e9; // Convert lamports to SOL
    if (totalVolume > 100) score += 35; // Large volume in SOL

    const earlyTxs = transactions.filter(
        (tx) => tx.blockTime && tx.blockTime < creationTime + 3600,
    ).length;
    if (earlyTxs > 2) score += 40; // Suspicious early activity

    return Math.min(score, 100);
}

// Add this function to calculate insider probability score
export function calculateInsiderScore(
    txs: any[],
    graph: InsiderGraph,
    events: any[],
) {
    const eventTimes = events.map(
        (e) => new Date(e.createdAt).getTime() / 1000,
    );
    let score = 0;

    // Check for transactions near important events
    const earlyTxs = txs.filter((tx) =>
        eventTimes.some((time) => Math.abs(tx.blockTime - time) < 3600),
    ).length;

    if (earlyTxs > 1) score += 50; // Transactions within 1 hour of events

    // Check network centrality
    const walletAddress = txs[0]?.owner;
    const connections = graph.nodes.filter(
        (g) => g.id === walletAddress,
    ).length;

    if (connections > 3) score += 30; // High network centrality

    // Additional score for direct insider connections
    if (graph.nodes.some((g) => g.id === walletAddress)) score += 20;

    return Math.min(score, 100);
}

export function detectLiquidityEvent(current: any, historical: any[]) {
    if (!historical.length) {
        return { detected: false, reason: "No historical data" };
    }

    const prevLiquidity = historical[0].totalMarketLiquidity || 0;
    const currentLiquidity = current.totalMarketLiquidity || 0;

    // Calculate percentage drop
    const liquidityDrop =
        prevLiquidity > 0
            ? ((prevLiquidity - currentLiquidity) / prevLiquidity) * 100
            : 0;

    // Check for LP unlock
    const lpUnlock = current.markets?.some(
        (m: any) => m.lp?.lpLocked < 100 && m.lp?.lpLocked > 0,
    );

    // Check for significant liquidity drop (>10%)
    if (liquidityDrop > 10) {
        return {
            detected: true,
            reason: `Liquidity dropped by ${liquidityDrop.toFixed(
                2,
            )}% in the last 24 hours`,
            severity: liquidityDrop > 20 ? "high" : "medium",
        };
    }

    // Check for LP unlock
    if (lpUnlock) {
        return {
            detected: true,
            reason: "LP tokens partially unlocked, potential risk of liquidity removal",
            severity: "high",
        };
    }

    return { detected: false, reason: "No suspicious activity detected" };
}
