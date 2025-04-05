import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    const { email, password } = await req.json();
    try {
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 },
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const isValid = await bcrypt.compare(hashedPassword, user.password);
        if (!isValid) {
            return NextResponse.json(
                { message: "Invalid password" },
                { status: 401 },
            );
        }

        return NextResponse.json({ message: "Login successful" });
    } catch (error) {
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 },
        );
    }
}
