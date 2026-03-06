import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, executions } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get("wallet");

        if (!wallet) {
            return NextResponse.json(
                { error: "wallet query parameter is required" },
                { status: 400 }
            );
        }

        const userOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.userId, wallet));

        // Fetch executions for each order
        const result = await Promise.all(
            userOrders.map(async (order) => {
                const execs = await db
                    .select()
                    .from(executions)
                    .where(eq(executions.orderId, order.id))
                    .orderBy(asc(executions.dayNumber));
                return { ...order, executions: execs };
            })
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("[GET /api/orders]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
