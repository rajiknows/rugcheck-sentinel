import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { InsiderGraph } from "@/lib/types";

// Risk scoring logic
const calculateRiskScore = (holder: any, insiders: InsiderGraph) => {
    let score = 0;
    const ownershipPct = holder.pct || 0;
    const isInsider = insiders.nodes.some(
        (insider) => insider.id === holder.owner,
    );

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
        // {
        //   "creator": "string",
        //   "creatorTokens": [
        //     {
        //       "createdAt": "string",
        //       "marketCap": 0,
        //       "mint": "string"
        //     }
        //   ],
        //   "detectedAt": "string",
        //   "events": [
        //     {
        //       "createdAt": "string",
        //       "event": 0,
        //       "newValue": "string",
        //       "oldValue": "string"
        //     }
        //   ],
        //   "fileMeta": {
        //     "description": "string",
        //     "image": "string",
        //     "name": "string",
        //     "symbol": "string"
        //   },
        //   "freezeAuthority": "string",
        //   "graphInsidersDetected": 0,
        //   "insiderNetworks": [
        //     {
        //       "activeAccounts": 0,
        //       "id": "string",
        //       "size": 0,
        //       "tokenAmount": 0,
        //       "type": "string"
        //     }
        //   ],
        //   "knownAccounts": {
        //     "additionalProp1": {
        //       "name": "string",
        //       "type": "string"
        //     },
        //     "additionalProp2": {
        //       "name": "string",
        //       "type": "string"
        //     },
        //     "additionalProp3": {
        //       "name": "string",
        //       "type": "string"
        //     }
        //   },
        //   "lockerOwners": {
        //     "additionalProp1": true,
        //     "additionalProp2": true,
        //     "additionalProp3": true
        //   },
        //   "lockers": {
        //     "additionalProp1": {
        //       "owner": "string",
        //       "programID": "string",
        //       "tokenAccount": "string",
        //       "type": "string",
        //       "unlockDate": 0,
        //       "uri": "string",
        //       "usdcLocked": 0
        //     },
        //     "additionalProp2": {
        //       "owner": "string",
        //       "programID": "string",
        //       "tokenAccount": "string",
        //       "type": "string",
        //       "unlockDate": 0,
        //       "uri": "string",
        //       "usdcLocked": 0
        //     },
        //     "additionalProp3": {
        //       "owner": "string",
        //       "programID": "string",
        //       "tokenAccount": "string",
        //       "type": "string",
        //       "unlockDate": 0,
        //       "uri": "string",
        //       "usdcLocked": 0
        //     }
        //   },
        //   "markets": [
        //     {
        //       "liquidityA": "string",
        //       "liquidityAAccount": "string",
        //       "liquidityB": "string",
        //       "liquidityBAccount": "string",
        //       "lp": {
        //         "base": 0,
        //         "baseMint": "string",
        //         "basePrice": 0,
        //         "baseUSD": 0,
        //         "currentSupply": 0,
        //         "holders": [
        //           {
        //             "address": "string",
        //             "amount": 0,
        //             "decimals": 0,
        //             "insider": true,
        //             "owner": "string",
        //             "pct": 0,
        //             "uiAmount": 0,
        //             "uiAmountString": "string"
        //           }
        //         ],
        //         "lpCurrentSupply": 0,
        //         "lpLocked": 0,
        //         "lpLockedPct": 0,
        //         "lpLockedUSD": 0,
        //         "lpMaxSupply": 0,
        //         "lpMint": "string",
        //         "lpTotalSupply": 0,
        //         "lpUnlocked": 0,
        //         "pctReserve": 0,
        //         "pctSupply": 0,
        //         "quote": 0,
        //         "quoteMint": "string",
        //         "quotePrice": 0,
        //         "quoteUSD": 0,
        //         "reserveSupply": 0,
        //         "tokenSupply": 0,
        //         "totalTokensUnlocked": 0
        //       },
        //       "marketType": "string",
        //       "mintA": "string",
        //       "mintAAccount": "string",
        //       "mintB": "string",
        //       "mintBAccount": "string",
        //       "mintLP": "string",
        //       "mintLPAccount": "string",
        //       "pubkey": "string"
        //     }
        //   ],
        //   "mint": "string",
        //   "mintAuthority": "string",
        //   "price": 0,
        //   "risks": [
        //     {
        //       "description": "string",
        //       "level": "string",
        //       "name": "string",
        //       "score": 0,
        //       "value": "string"
        //     }
        //   ],
        //   "rugged": true,
        //   "score": 0,
        //   "score_normalised": 0,
        //   "token": "string",
        //   "tokenMeta": {
        //     "mutable": true,
        //     "name": "string",
        //     "symbol": "string",
        //     "updateAuthority": "string",
        //     "uri": "string"
        //   },
        //   "tokenProgram": "string",
        //   "tokenType": "string",
        //   "token_extensions": "string",
        //   "topHolders": [
        //     {
        //       "address": "string",
        //       "amount": 0,
        //       "decimals": 0,
        //       "insider": true,
        //       "owner": "string",
        //       "pct": 0,
        //       "uiAmount": 0,
        //       "uiAmountString": "string"
        //     }
        //   ],
        //   "totalHolders": 0,
        //   "totalLPProviders": 0,
        //   "totalMarketLiquidity": 0,
        //   "transferFee": {
        //     "authority": "string",
        //     "maxAmount": 0,
        //     "pct": 0
        //   },
        //   "verification": {
        //     "description": "string",
        //     "jup_strict": true,
        //     "jup_verified": true,
        //     "links": [
        //       {
        //         "provider": "string",
        //         "value": "string"
        //       }
        //     ],
        //     "mint": "string",
        //     "name": "string",
        //     "payer": "string",
        //     "symbol": "string"
        //   }
        // }

        // Fetch insider graph (assuming it returns a list of insider networks)
        let insiders: InsiderGraph = { nodes: [], edges: [] };
        try {
            const insidersResponse = await axios.get(
                `https://api.rugcheck.xyz/v1/tokens/${id}/insiders/graph`,
            );
            const nodes = insidersResponse.data.nodes || [];
            const edges = insidersResponse.data.links || [];
            insiders = { nodes, edges };
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
                isInsider: insiders.nodes.some(
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
