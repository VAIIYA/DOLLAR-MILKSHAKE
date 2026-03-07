import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: text("id").primaryKey(), // wallet pubkey
    createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
    totalDeposited: real("total_deposited").default(0).notNull(),
    totalFeesPaid: real("total_fees_paid").default(0).notNull(),
});

export const orders = sqliteTable("orders", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id),
    tokenMint: text("token_mint").notNull(),
    tokenSymbol: text("token_symbol").notNull(),
    tokenName: text("token_name").notNull(),
    depositMint: text("deposit_mint").notNull(),
    depositSymbol: text("deposit_symbol").notNull(),
    depositAmount: real("deposit_amount").notNull(),
    depositTxSignature: text("deposit_tx_signature"),
    feeAmount: real("fee_amount").notNull(),
    feeTxSignature: text("fee_tx_signature"),
    dailyAmount: real("daily_amount").default(1.0).notNull(),
    totalDays: integer("total_days").notNull(),
    daysCompleted: integer("days_completed").default(0).notNull(),
    remainingBalance: real("remaining_balance").notNull(),
    status: text("status", {
        enum: ["pending_deposit", "active", "paused", "completed", "failed", "cancelled"],
    })
        .default("pending_deposit")
        .notNull(),
    createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
    activatedAt: text("activated_at"),
    completedAt: text("completed_at"),
    nextBuyAt: text("next_buy_at"),
});

export const executions = sqliteTable("executions", {
    id: text("id").primaryKey(),
    orderId: text("order_id")
        .notNull()
        .references(() => orders.id),
    userId: text("user_id").notNull(),
    inputMint: text("input_mint").notNull(),
    inputAmount: real("input_amount").notNull(),
    outputMint: text("output_mint").notNull(),
    outputAmount: real("output_amount"),
    outputAmountUi: text("output_amount_ui"),
    jupiterQuoteId: text("jupiter_quote_id"),
    swapTxSignature: text("swap_tx_signature"),
    transferTxSignature: text("transfer_tx_signature"),
    status: text("status", {
        enum: ["pending", "swapping", "transferring", "completed", "failed"],
    })
        .default("pending")
        .notNull(),
    errorMessage: text("error_message"),
    dayNumber: integer("day_number").notNull(),
    executedAt: text("executed_at").default(sql`(datetime('now'))`).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;
