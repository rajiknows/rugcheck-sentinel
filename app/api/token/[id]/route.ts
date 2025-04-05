import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const SOLSCAN_API_KEY = "YOUR_SOLSCAN_API_KEY"; // Move to .env later

// Initialize database
let db: any = null;

async function getDB() {
  if (db) return db;
  
  db = await open({
    filename: "./liquidity.db",
    driver: sqlite3.Database
  });
  
  // Create table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS liquidity_history (
      token TEXT, 
      timestamp INTEGER, 
      totalMarketLiquidity REAL, 
      lpLocked REAL
    )
  `);
  
  return db;
}

const calculateRiskScore = (
    holder: any,
    insiders: any[],
    transactions: any[],
) => {
    let score = 0;
    const ownershipPct = holder.pct || 0;
    const isInsider = insiders.some((insider) => insider.id === holder.owner);
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

const analyzeTokenomics = (reportData: any, lockersData: any) => {
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

function calculateBehaviorRiskScore(transactions: any[], creationTime: number) {
    const now = Date.now() / 1000; // Current time in seconds
    const daysSinceCreation = (now - creationTime) / (24 * 3600) || 1; // Avoid division by zero
    const txsPerDay = transactions.length / daysSinceCreation;
    
    let score = 0;
    if (txsPerDay > 5) score += 25; // High frequency
    
    const totalVolume = transactions.reduce((sum, tx) => sum + Math.abs(tx.lamports || 0), 0) / 1e9; // Convert lamports to SOL
    if (totalVolume > 100) score += 35; // Large volume in SOL
    
    const earlyTxs = transactions.filter(tx => tx.blockTime && tx.blockTime < creationTime + 3600).length;
    if (earlyTxs > 2) score += 40; // Suspicious early activity
    
    return Math.min(score, 100);
}

// Add this function to calculate insider probability score
function calculateInsiderScore(txs: any[], graph: any[], events: any[]) {
  const eventTimes = events.map(e => new Date(e.createdAt).getTime() / 1000);
  let score = 0;
  
  // Check for transactions near important events
  const earlyTxs = txs.filter(tx => 
    eventTimes.some(time => Math.abs(tx.blockTime - time) < 3600)
  ).length;
  
  if (earlyTxs > 1) score += 50; // Transactions within 1 hour of events
  
  // Check network centrality
  const walletAddress = txs[0]?.owner;
  const connections = graph.filter(g => g.id === walletAddress || 
                                      g.connections?.includes(walletAddress)).length;
  
  if (connections > 3) score += 30; // High network centrality
  
  // Additional score for direct insider connections
  if (graph.some(g => g.id === walletAddress)) score += 20;
  
  return Math.min(score, 100);
}

function detectLiquidityEvent(current: any, historical: any[]) {
  if (!historical.length) return { detected: false, reason: "No historical data" };
  
  const prevLiquidity = historical[0].totalMarketLiquidity || 0;
  const currentLiquidity = current.totalMarketLiquidity || 0;
  
  // Calculate percentage drop
  const liquidityDrop = prevLiquidity > 0 
    ? ((prevLiquidity - currentLiquidity) / prevLiquidity) * 100 
    : 0;
  
  // Check for LP unlock
  const lpUnlock = current.markets?.some((m: any) => 
    m.lp?.lpLocked < 100 && m.lp?.lpLocked > 0
  );
  
  // Check for significant liquidity drop (>10%)
  if (liquidityDrop > 10) {
    return { 
      detected: true, 
      reason: `Liquidity dropped by ${liquidityDrop.toFixed(2)}% in the last 24 hours`,
      severity: liquidityDrop > 20 ? "high" : "medium"
    };
  }
  
  // Check for LP unlock
  if (lpUnlock) {
    return { 
      detected: true, 
      reason: "LP tokens partially unlocked, potential risk of liquidity removal",
      severity: "high"
    };
  }
  
  return { detected: false, reason: "No suspicious activity detected" };
}

export async function GET(request: Request) {
    // Parse the URL to get the token ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1]; // Get the last part of the path
    
    // Alternative method using search params if the ID is passed as a query parameter
    // const id = url.searchParams.get('id');
    
    if (!id) {
        return NextResponse.json({ error: "Token ID is required" }, { status: 400 });
    }
    
    try {
        // Fetch token report
        const reportResponse = await axios.get(
            `https://api.rugcheck.xyz/v1/tokens/${id}/report`
        );
        const reportData = reportResponse.data;

        // Get database connection
        const database = await getDB();
        
        // Store current liquidity data
        await database.run(
            'INSERT INTO liquidity_history (token, timestamp, totalMarketLiquidity, lpLocked) VALUES (?, ?, ?, ?)',
            [
                id, 
                Math.floor(Date.now() / 1000), 
                reportData.totalMarketLiquidity || 0, 
                reportData.markets?.[0]?.lp?.lpLocked || 0
            ]
        );
        
        // Fetch historical data for comparison (last 24 hours)
        const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
        const historical = await database.all(
            'SELECT * FROM liquidity_history WHERE token = ? AND timestamp > ? ORDER BY timestamp DESC',
            [id, oneDayAgo]
        );
        
        // Detect liquidity events
        const liquidityEvent = detectLiquidityEvent(reportData, historical);
        
        let insiderGraph = [];
        try {
            const insidersResponse = await axios.get(
                `https://api.rugcheck.xyz/v1/tokens/${id}/insiders/graph`,
            );
            insiderGraph = insidersResponse.data?.insiderNetworks || [];
        } catch (err) {
            console.warn("Insider graph fetch failed:", err.message);
        }

        // Extract important events from the report
        const tokenEvents = [
            { type: 'creation', createdAt: reportData.createdAt },
            // Add other events if available in the report
            ...(reportData.authorityEvents || []).map((event: any) => ({
                type: 'authority',
                createdAt: event.timestamp
            }))
        ];

        // Process wallet profiles with insider probability
        const walletProfiles = await Promise.all(
            (reportData.topHolders || []).map(async (holder: any) => {
                try {
                    // Fetch transactions for this wallet
                    const txResponse = await axios.get(
                        `https://public-api.solscan.io/account/transactions?account=${holder.owner}`,
                        { headers: { 'accept': 'application/json' } }
                    );
                    const transactions = txResponse.data || [];
                    
                    // Calculate insider probability score
                    const insiderProbability = calculateInsiderScore(
                        transactions, 
                        insiderGraph, 
                        tokenEvents
                    );
                    
                    // Calculate behavior risk score
                    const creationTime = new Date(reportData.createdAt).getTime() / 1000;
                    const behaviorRiskScore = calculateBehaviorRiskScore(transactions, creationTime);
                    
                    return {
                        address: holder.owner,
                        amount: holder.uiAmountString,
                        percentage: holder.pct,
                        riskScore: calculateRiskScore(
                            holder,
                            insiderGraph,
                            transactions,
                        ),
                        isInsider: insiderGraph.some((insider: any) => insider.id === holder.owner),
                        insiderProbability,
                        behaviorRiskScore,
                        transactionsFetched: true,
                        recentTxCount: transactions.filter(
                            (tx: any) => new Date(tx.blockTime * 1000) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                        ).length,
                        timingRisk: transactions.some((tx: any) => tx.changeAmount < -1000000) ? 30 : 0,
                    };
                } catch (error) {
                    console.error(`Error processing wallet ${holder.owner}:`, error);
                    return {
                        address: holder.owner,
                        amount: holder.uiAmountString,
                        percentage: holder.pct,
                        riskScore: calculateRiskScore(holder, insiderGraph, []),
                        isInsider: insiderGraph.some((insider: any) => insider.id === holder.owner),
                        insiderProbability: 0,
                        behaviorRiskScore: 0,
                        transactionsFetched: false,
                        recentTxCount: 0,
                        timingRisk: 0,
                    };
                }
            })
        );

        const tokenomics = analyzeTokenomics(reportData, {});

        // Return enhanced data with liquidity monitoring
        return NextResponse.json({
            token: reportData.mint,
            creator: reportData.creator,
            walletProfiles,
            tokenomics,
            liquidityMonitoring: {
                currentLiquidity: reportData.totalMarketLiquidity || 0,
                lpLocked: reportData.markets?.[0]?.lp?.lpLocked || 0,
                historicalData: historical.map(h => ({
                    timestamp: h.timestamp,
                    liquidity: h.totalMarketLiquidity,
                    lpLocked: h.lpLocked
                })),
                liquidityEvent
            },
            rawReport: reportData,
        });
    } catch (error) {
        console.error("Error fetching token data:", error);
        return NextResponse.json({ error: "Failed to fetch token data" }, { status: 500 });
    }
}
