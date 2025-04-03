import { NextRequest, NextResponse } from "next/server";
import { addWalletLabel } from "../../../lib/db";

export async function POST(req: NextRequest) {
    try {
        const { walletAddress, label, evidence } = await req.json();
        if (!walletAddress || !label) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }
        await addWalletLabel(walletAddress, label, evidence || "");
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to save label" },
            { status: 500 },
        );
    }
}
