import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, orders } from "@/lib/schema";
import { calculateOrder, getNextNoonUTC } from "@/lib/fees";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            userWallet,
            tokenMint,
            tokenSymbol,
            tokenName,
            depositAmountUsd,
            depositMint,
            depositSymbol,
        } = body;

        // Validate required fields
        if (
            !userWallet ||
            !tokenMint ||
            !tokenSymbol ||
            !tokenName ||
            !depositAmountUsd ||
            !depositMint ||
            !depositSymbol
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        let calc;
        try {
            calc = await calculateOrder(Number(depositAmountUsd));
        } catch (e) {
            return NextResponse.json(
                { error: (e as Error).message },
                { status: 400 }
            );
        }

        // Upsert user
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.id, userWallet))
            .get();

        if (!existingUser) {
            await db.insert(users).values({
                id: userWallet,
                createdAt: new Date().toISOString(),
                totalDeposited: 0,
                totalFeesPaid: 0,
            });
        }

        // Create order
        const orderId = crypto.randomUUID();
        const nextBuyAt = getNextNoonUTC().toISOString();

        await db.insert(orders).values({
            id: orderId,
            userId: userWallet,
            tokenMint,
            tokenSymbol,
            tokenName,
            depositMint,
            depositSymbol,
            depositAmount: calc.depositAmount,
            feeAmount: calc.feeAmountUsd,
            dailyAmount: calc.dailyAmount,
            totalDays: calc.totalDays,
            daysCompleted: 0,
            remainingBalance: calc.depositAmount,
            status: "pending_deposit",
            createdAt: new Date().toISOString(),
            nextBuyAt,
        });

        return NextResponse.json({
            orderId,
            totalDays: calc.totalDays,
            dailyAmount: calc.dailyAmount,
            feeAmount: calc.feeAmountUsd,
            feeAmountSol: calc.feeAmountSol,
            nextBuyAt,
        });
    } catch (error) {
        console.error("[POST /api/deposits]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
