import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { walletAddress, condition, message } = await req.json();
        if (!walletAddress || !condition) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }
        await addAlert(walletAddress, condition, message || "Alert triggered!");
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to save alert" },
            { status: 500 },
        );
    }
}

export async function GET() {
    try {
        const alerts = await getAlerts();
        return NextResponse.json(alerts);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch alerts" },
            { status: 500 },
        );
    }
}
