import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, executions } from "@/lib/schema";
import { eq, and, lte } from "drizzle-orm";
import {
    getBrokerKeypair,
    getConnection,
    getQuote,
    executeSwap,
    transferTokensToUser,
    usdcToLamports,
} from "@/lib/jupiter";
import { USDC_MINT } from "@/lib/tokens";
import { PublicKey } from "@solana/web3.js";

export const maxDuration = 300; // Vercel max for hobby / pro plans
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Cron started, checking for due orders at:", new Date().toISOString().replace('T', ' ').replace('Z', ''));

    // ── Setup ─────────────────────────────────────────────────────────────────
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    let brokerKeypair, connection, dueOrders;
    try {
        brokerKeypair = getBrokerKeypair();
        console.log("Broker keypair loaded OK");
        connection = getConnection();
        console.log("Connection loaded OK");

        // ── Fetch due orders ──────────────────────────────────────────────────────
        dueOrders = await db
            .select()
            .from(orders)
            .where(and(eq(orders.status, "active"), lte(orders.nextBuyAt!, now)));

        console.log("Due orders found:", dueOrders.length, JSON.stringify(dueOrders.map(o => ({ id: o.id, status: o.status, nextBuyAt: o.nextBuyAt }))));

        console.log("Query debug - now value:", now, "type:", typeof now);

        // Run a raw debug query to verify
        const allActive = await db.select().from(orders).where(eq(orders.status, "active"));
        console.log("All active orders:", JSON.stringify(allActive.map(o => ({
            id: o.id,
            nextBuyAt: o.nextBuyAt,
            nextBuyAtType: typeof o.nextBuyAt,
            nowValue: now,
            comparison: (o.nextBuyAt ?? "") <= now
        }))));
    } catch (setupErr) {
        console.error("SETUP FAILED:", String(setupErr));
        return NextResponse.json({ error: "Setup failed", detail: String(setupErr) }, { status: 500 });
    }

    processed = dueOrders.length;

    // ── Process each order ────────────────────────────────────────────────────
    for (const order of dueOrders) {
        const executionId = crypto.randomUUID();
        const dayNumber = order.daysCompleted + 1;

        // Insert execution as "swapping"
        await db.insert(executions).values({
            id: executionId,
            orderId: order.id,
            userId: order.userId,
            inputMint: USDC_MINT,
            inputAmount: order.dailyAmount,
            outputMint: order.tokenMint,
            status: "swapping",
            dayNumber,
            executedAt: new Date().toISOString().replace('T', ' ').replace('Z', ''),
        });

        let attempt = 0;
        const MAX_ATTEMPTS = 3;
        let success = false;
        let lastError: unknown = null;

        while (attempt < MAX_ATTEMPTS && !success) {
            try {
                // ─ Step 1: Get Jupiter quote ────────────────────────────────────────
                const amountLamports = usdcToLamports(order.dailyAmount);
                const quote = await getQuote(USDC_MINT, order.tokenMint, amountLamports);

                // ─ Step 2: Execute swap ─────────────────────────────────────────────
                const { swapTxSignature, outputAmount, outputAmountUi } =
                    await executeSwap(quote, brokerKeypair, connection);

                // Update execution to "transferring"
                await db
                    .update(executions)
                    .set({
                        status: "transferring",
                        swapTxSignature,
                        outputAmount,
                        outputAmountUi,
                        jupiterQuoteId: quote.quoteId ?? null,
                    })
                    .where(eq(executions.id, executionId));

                // ─ Step 3: Transfer tokens to user ─────────────────────────────────
                const { transferTxSignature } = await transferTokensToUser(
                    new PublicKey(order.tokenMint),
                    new PublicKey(order.userId),
                    brokerKeypair,
                    connection,
                    outputAmount
                );

                // Update execution to "completed"
                await db
                    .update(executions)
                    .set({
                        status: "completed",
                        transferTxSignature,
                    })
                    .where(eq(executions.id, executionId));

                // ─ Step 4: Update order ─────────────────────────────────────────────
                const newDaysCompleted = order.daysCompleted + 1;
                const newRemainingBalance = order.remainingBalance - order.dailyAmount;
                const isComplete = newDaysCompleted >= order.totalDays;

                await db
                    .update(orders)
                    .set({
                        daysCompleted: newDaysCompleted,
                        remainingBalance: Math.max(0, newRemainingBalance),
                        status: isComplete ? "completed" : "active",
                        completedAt: isComplete ? new Date().toISOString().replace('T', ' ').replace('Z', '') : null,
                        nextBuyAt: isComplete
                            ? null
                            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', ''),
                    })
                    .where(eq(orders.id, order.id));

                success = true;
                succeeded++;
            } catch (err) {
                lastError = err;
                attempt++;
                console.error("Swap failed for order", order.id, "attempt", attempt, err);
                if (attempt < MAX_ATTEMPTS) {
                    await new Promise((res) => setTimeout(res, 3000));
                }
            }
        }

        if (!success) {
            const errorMessage =
                lastError instanceof Error ? lastError.message : "Unknown error";
            errors.push(`Order ${order.id}: ${errorMessage}`);
            failed++;

            // Mark execution failed, schedule retry for tomorrow
            await db
                .update(executions)
                .set({ status: "failed", errorMessage })
                .where(eq(executions.id, executionId));

            // Advance nextBuyAt by 24h so we retry tomorrow
            await db
                .update(orders)
                .set({
                    nextBuyAt: new Date(
                        Date.now() + 24 * 60 * 60 * 1000
                    ).toISOString().replace('T', ' ').replace('Z', ''),
                })
                .where(eq(orders.id, order.id));
        }
    }

    console.log("Cron result:", { processed, succeeded, failed, errors });

    return NextResponse.json({
        processed,
        succeeded,
        failed,
        errors,
        timestamp: now,
    });
}
