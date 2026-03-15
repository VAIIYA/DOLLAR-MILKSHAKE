// ─── Database row types (re-exported from schema for convenience) ─────────────
export type { User, NewUser, Order, NewOrder, Execution, NewExecution } from "@/lib/schema";

// ─── API request / response types ────────────────────────────────────────────

export interface CreateDepositRequest {
    userWallet: string;
    tokenMint: string;
    tokenSymbol: string;
    tokenName: string;
    depositAmountUsd: number;
    depositMint: string;
    depositSymbol: string;
}

export interface CreateDepositResponse {
    orderId: string;
    totalDays: number;
    dailyAmount: number;
    feeAmount: number;
    feeAmountSol: number;
    nextBuyAt: string;
}

export interface ConfirmOrderRequest {
    depositTxSignature: string;
    feeTxSignature?: string;
}

export interface OrderWithExecutions {
    id: string;
    userId: string;
    tokenMint: string;
    tokenSymbol: string;
    tokenName: string;
    depositMint: string;
    depositSymbol: string;
    depositAmount: number;
    depositTxSignature: string | null;
    feeAmount: number;
    feeTxSignature: string | null;
    dailyAmount: number;
    totalDays: number;
    daysCompleted: number;
    remainingBalance: number;
    status: "pending_deposit" | "active" | "paused" | "completed" | "failed";
    createdAt: string;
    activatedAt: string | null;
    completedAt: string | null;
    nextBuyAt: string | null;
    executions: ExecutionRecord[];
}

export interface ExecutionRecord {
    id: string;
    orderId: string;
    userId: string;
    inputMint: string;
    inputAmount: number;
    outputMint: string;
    outputAmount: number | null;
    outputAmountUi: string | null;
    jupiterQuoteId: string | null;
    swapTxSignature: string | null;
    transferTxSignature: string | null;
    status: "pending" | "swapping" | "transferring" | "completed" | "failed";
    errorMessage: string | null;
    dayNumber: number;
    executedAt: string;
}

export interface CronSummary {
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export type DepositCurrency = "USDC" | "SOL";

export type TxStep =
    | "idle"
    | "creating_order"
    | "checking_balance"
    | "awaiting_deposit"
    | "awaiting_fee"
    | "confirming"
    | "done";
