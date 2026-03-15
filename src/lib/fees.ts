export const FEE_PERCENT = 0.01; // 1%
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

export async function getSolPriceUsd(): Promise<number> {
    try {
        // Use our internal proxy to keep the API key safe if on the client
        const baseUrl = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/price?ids=SOL`, {
            next: { revalidate: 60 } // Cache for 60 seconds
        });
        if (!res.ok) {
            console.warn(`Failed to fetch price from proxy: ${res.status}`);
            return ROUGH_SOL_PRICE_USD;
        }
        const json = await res.json();
        // Handle V2 response format (data.SOL.price)
        return json.data?.SOL?.price ?? ROUGH_SOL_PRICE_USD;
    } catch (err) {
        console.error("Failed to fetch SOL price:", err);
        return ROUGH_SOL_PRICE_USD;
    }
}

export async function calculateOrder(depositAmountUsd: number): Promise<OrderCalculation> {
    if (depositAmountUsd < MIN_DEPOSIT_USD) {
        throw new Error(`Minimum deposit is $${MIN_DEPOSIT_USD}`);
    }
    if (depositAmountUsd > MAX_DEPOSIT_USD) {
        throw new Error(`Maximum deposit is $${MAX_DEPOSIT_USD}`);
    }

    const solPrice = await getSolPriceUsd();
    const feeAmountUsd = depositAmountUsd * FEE_PERCENT;
    const feeAmountSol = feeAmountUsd / solPrice;
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

export function getNextNoonUTC(): string {
    const now = new Date();
    const nextNoon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0));

    // If it's already past 12:00 PM UTC today, the next noon is tomorrow
    if (now.getTime() > nextNoon.getTime()) {
        nextNoon.setUTCDate(nextNoon.getUTCDate() + 1);
    }

    return nextNoon.toISOString().replace('T', ' ').replace('Z', '');
}
