export const FEE_PERCENT = 0.05; // 5%
export const DAILY_BUY_AMOUNT_USD = 1.0; // $1 per day
export const MIN_DEPOSIT_USD = 5;
export const MAX_DEPOSIT_USD = 10_000;
// Rough SOL price for fee calculation (in production, use a price oracle)
export const ROUGH_SOL_PRICE_USD = 150;

export interface OrderCalculation {
    depositAmount: number;
    feePercent: number;
    feeAmountUsd: number;
    feeAmountSol: number;
    totalDays: number;
    dailyAmount: number;
}

export function calculateOrder(depositAmountUsd: number): OrderCalculation {
    if (depositAmountUsd < MIN_DEPOSIT_USD) {
        throw new Error(`Minimum deposit is $${MIN_DEPOSIT_USD}`);
    }
    if (depositAmountUsd > MAX_DEPOSIT_USD) {
        throw new Error(`Maximum deposit is $${MAX_DEPOSIT_USD}`);
    }

    const feeAmountUsd = depositAmountUsd * FEE_PERCENT;
    const feeAmountSol = feeAmountUsd / ROUGH_SOL_PRICE_USD;
    const totalDays = Math.floor(depositAmountUsd / DAILY_BUY_AMOUNT_USD);

    return {
        depositAmount: depositAmountUsd,
        feePercent: FEE_PERCENT,
        feeAmountUsd,
        feeAmountSol,
        totalDays,
        dailyAmount: DAILY_BUY_AMOUNT_USD,
    };
}

export function feeSolToLamports(feeAmountSol: number): number {
    return Math.floor(feeAmountSol * 1_000_000_000);
}
