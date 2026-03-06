export interface Memecoin {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
    logoUrl?: string;
}

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const MEMECOINS: Memecoin[] = [
    {
        symbol: "DMS",
        name: "Dollar Milkshake",
        mint: "23hCKRadDLv2vd6ST7TBPG7fsG4uUh7s27PCjcP4jups",
        decimals: 6,
    },
    {
        symbol: "BONK",
        name: "Bonk",
        mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        decimals: 5,
    },
    {
        symbol: "WIF",
        name: "dogwifhat",
        mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
        decimals: 6,
    },
    {
        symbol: "POPCAT",
        name: "Popcat",
        mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
        decimals: 9,
    },
    {
        symbol: "MYRO",
        name: "Myro",
        mint: "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
        decimals: 9,
    },
    {
        symbol: "BOME",
        name: "BOOK OF MEME",
        mint: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
        decimals: 6,
    },
    {
        symbol: "SAMO",
        name: "Samoyedcoin",
        mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        decimals: 9,
    },
];

export function getMemecoiByMint(mint: string): Memecoin | undefined {
    return MEMECOINS.find((m) => m.mint === mint);
}

export function getMemecoiBySymbol(symbol: string): Memecoin | undefined {
    return MEMECOINS.find((m) => m.symbol === symbol);
}
