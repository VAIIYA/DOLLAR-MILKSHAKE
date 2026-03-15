export interface Memecoin {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
    logoUrl?: string;
}

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const DMS_TOKEN: Memecoin = {
    symbol: "DMS",
    name: "Dollar Milkshake",
    mint: "23hCKRadDLv2vd6ST7TBPG7fsG4uUh7s27PCjcP4jups",
    decimals: 9,
    logoUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/23hCKRadDLv2vd6ST7TBPG7fsG4uUh7s27PCjcP4jups/logo.png"
};
