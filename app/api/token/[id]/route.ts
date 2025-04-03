import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const { id } = params;
    try {
        const response = await axios.get(
            `https://api.rugcheck.xyz/v1/tokens/${id}/report`,
        );
        return NextResponse.json(response.data);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch token data" },
            { status: 500 },
        );
    }
}
