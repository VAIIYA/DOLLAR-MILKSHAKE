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
        const nextBuyAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();

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
