import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, users, executions } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, id))
            .get();

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const execs = await db
            .select()
            .from(executions)
            .where(eq(executions.orderId, id))
            .orderBy(asc(executions.dayNumber));

        return NextResponse.json({ ...order, executions: execs });
    } catch (error) {
        console.error("[GET /api/orders/[id]]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { depositTxSignature, feeTxSignature } = body;

        if (!depositTxSignature) {
            return NextResponse.json(
                { error: "depositTxSignature is required" },
                { status: 400 }
            );
        }

        const order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, id))
            .get();

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.status !== "pending_deposit") {
            return NextResponse.json(
                { error: `Order is already in status: ${order.status}` },
                { status: 409 }
            );
        }

        const now = new Date().toISOString();
        const nextBuyAt = now;

        await db
            .update(orders)
            .set({
                status: "active",
                depositTxSignature,
                feeTxSignature: feeTxSignature ?? null,
                activatedAt: now,
                nextBuyAt,
            })
            .where(eq(orders.id, id));

        // Update user totals
        await db
            .update(users)
            .set({
                totalDeposited: order.depositAmount,
                totalFeesPaid: order.feeAmount,
            })
            .where(eq(users.id, order.userId));

        const updatedOrder = await db
            .select()
            .from(orders)
            .where(eq(orders.id, id))
            .get();

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error("[PATCH /api/orders/[id]]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { userWallet } = body;

        if (!userWallet) {
            return NextResponse.json({ error: "userWallet is required" }, { status: 400 });
        }

        const order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, id))
            .get();

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.userId !== userWallet) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (order.status !== "active") {
            return NextResponse.json({ error: `Cannot cancel order in status: ${order.status}` }, { status: 400 });
        }

        // Handle refunds for remaining balance
        let refundTxSignature: string | null = null;
        if (order.remainingBalance > 0) {
            const { getBrokerKeypair, getConnection, transferTokensToUser, transferSolToUser } = await import("@/lib/jupiter");
            const { PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
            const { USDC_MINT } = await import("@/lib/tokens");

            const brokerKeypair = getBrokerKeypair();
            const connection = getConnection();

            if (order.depositSymbol === "SOL") {
                const lamports = Math.floor(order.remainingBalance * LAMPORTS_PER_SOL);
                const res = await transferSolToUser(
                    new PublicKey(userWallet),
                    brokerKeypair,
                    connection,
                    lamports
                );
                refundTxSignature = res.transferTxSignature;
            } else {
                const { getMint } = await import("@solana/spl-token");
                const mintPubkey = new PublicKey(USDC_MINT);
                const mintInfo = await getMint(connection, mintPubkey);
                const rawAmount = Math.floor(order.remainingBalance * 10 ** mintInfo.decimals);
                const res = await transferTokensToUser(
                    mintPubkey,
                    new PublicKey(userWallet),
                    brokerKeypair,
                    connection,
                    rawAmount
                );
                refundTxSignature = res.transferTxSignature;
            }
        }

        // Mark as cancelled
        await db
            .update(orders)
            .set({
                status: "cancelled",
                nextBuyAt: null,
                completedAt: new Date().toISOString()
            })
            .where(eq(orders.id, id));

        return NextResponse.json({ success: true, refundTxSignature });
    } catch (error) {
        console.error("[DELETE /api/orders/[id]]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
