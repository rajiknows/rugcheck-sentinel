import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import {
  analyzeTokenomics,
  calculateBehaviorRiskScore,
  calculateInsiderScore,
  calculateRiskScore,
  detectLiquidityEvent,
} from "@/lib/tokenomics";
import { InsiderGraph } from "@/lib/types";

export async function GET(request: NextRequest) {
  // Parse the URL to get the token ID
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const id = pathParts[pathParts.length - 1]; // Get the last part of the path
  if (!id) {
    return NextResponse.json(
      { error: "Token ID is required" },
      {
        status: 400,
      },
    );
  }

  try {
    // Fetch token report
    const reportResponse = await axios.get(
      `https://api.rugcheck.xyz/v1/tokens/${id}/report`,
    );
    const reportData = reportResponse.data;

    await prisma.liquidityHistory.create({
      data: {
        token: id,
        timestamp: Math.floor(Date.now() / 1000),
        totalMarketLiquidity: reportData.totalMarketLiquidity || 0,
        lpLocked: reportData.markets?.[0]?.lp?.lpLocked || 0,
      },
    });

    // Fetch historical data for comparison (last 24 hours)
    const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const historical = await prisma.liquidityHistory.findMany({
      where: {
        token: id,
        timestamp: {
          gte: oneDayAgo,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Detect liquidity events
    const liquidityEvent = detectLiquidityEvent(reportData, historical);

    let insiderGraph: InsiderGraph = { nodes: [], edges: [] };
    try {
      const insidersResponse = await axios.get(
        `https://api.rugcheck.xyz/v1/tokens/${id}/insiders/graph`,
      );
      const nodes = insidersResponse.data.nodes || [];
      const edges = insidersResponse.data.links || [];
      insiderGraph = { nodes, edges };
    } catch (err) {
      console.warn("Insider graph fetch failed:", err.message);
    }

    // Extract important events from the report
    const tokenEvents = [
      { type: "creation", createdAt: reportData.createdAt },
      // Add other events if available in the report
      ...(reportData.authorityEvents || []).map((event: any) => ({
        type: "authority",
        createdAt: event.timestamp,
      })),
    ];

    // Process wallet profiles with insider probability
    const walletProfiles = await Promise.all(
      (reportData.topHolders || []).map(async (holder: any) => {
        try {
          // Fetch transactions for this wallet
          const txResponse = await axios.get(
            `https://public-api.solscan.io/account/transactions?account=${holder.owner}`,
            { headers: { accept: "application/json" } },
          );
          const transactions = txResponse.data || [];

          // Calculate insider probability score
          const insiderProbability = calculateInsiderScore(
            transactions,
            insiderGraph,
            tokenEvents,
          );

          // Calculate behavior risk score
          const creationTime = new Date(reportData.createdAt).getTime() / 1000;
          const behaviorRiskScore = calculateBehaviorRiskScore(
            transactions,
            creationTime,
          );

          return {
            address: holder.owner,
            amount: holder.uiAmountString,
            percentage: holder.pct,
            riskScore: calculateRiskScore(
              holder,
              insiderGraph,
              transactions,
            ),
            isInsider: insiderGraph.some(
              (insider: any) => insider.id === holder.owner,
            ),
            insiderProbability,
            behaviorRiskScore,
            transactionsFetched: true,
            recentTxCount: transactions.filter(
              (tx: any) =>
                new Date(tx.blockTime * 1000) >
                new Date(Date.now() - 24 * 60 * 60 * 1000),
            ).length,
            timingRisk: transactions.some(
              (tx: any) => tx.changeAmount < -1000000,
            )
              ? 30
              : 0,
          };
        } catch (error) {
          console.error(
            `Error processing wallet ${holder.owner}:`,
            error,
          );
          return {
            address: holder.owner,
            amount: holder.uiAmountString,
            percentage: holder.pct,
            riskScore: calculateRiskScore(holder, insiderGraph, []),
            isInsider: insiderGraph.some(
              (insider: any) => insider.id === holder.owner,
            ),
            insiderProbability: 0,
            behaviorRiskScore: 0,
            transactionsFetched: false,
            recentTxCount: 0,
            timingRisk: 0,
          };
        }
      }),
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
        historicalData: historical.map((h) => ({
          timestamp: h.timestamp,
          liquidity: h.totalMarketLiquidity,
          lpLocked: h.lpLocked,
        })),
        liquidityEvent,
      },
      rawReport: reportData,
    });
  } catch (error) {
    console.error("Error fetching token data:", error);
    return NextResponse.json(
      { error: "Failed to fetch token data" },
      {
        status: 500,
      },
    );
  }
}
