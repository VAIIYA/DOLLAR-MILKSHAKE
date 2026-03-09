import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const apiKey = process.env.JUPITER_API_KEY;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
            headers["x-api-key"] = apiKey;
        }

        // Try to fetch from Jupiter API v1 (common for strict list mappings)
        // or fall back to some static common tokens if it fails
        const url = "https://api.jup.ag/tokens/v1/all";
        const res = await fetch(url, {
            headers,
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) {
            const text = await res.text();
            console.warn(`Jupiter Tokens API failed (${res.status} ${text}), returning fallback tokens.`);
            return NextResponse.json(getFallbackTokens());
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Tokens proxy error:", error);
        return NextResponse.json(getFallbackTokens()); // Reliable fallback
    }
}

function getFallbackTokens() {
    return [
        { symbol: "WEN", name: "WEN", address: "WENWENvHsS7WGr6oM78asYEVbsatp8nSHe68C222222", decimals: 5, logoURI: "https://arweave.net/O76_9A5D6B6A562626_O76_9A5D6B6A562626" },
        { symbol: "BONK", name: "Bonk", address: "DezXAZ8z7PnrnRJjz3wXBoRgixeb6dyEPeS11QCqeowX", decimals: 5, logoURI: "https://arweave.net/Oq9_B5y7A3m9m6N8Q6-7788_g78B5m6m6P6m6N8Q6-77" },
        { symbol: "JUP", name: "Jupiter", address: "JUPyiK68zSJ2zXpDfB1y4hYF4xX782637289372", decimals: 6, logoURI: "https://static.jup.ag/jup/icon.png" },
        { symbol: "SOL", name: "Solana", address: "So11111111111111111111111111111111111111112", decimals: 9, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" },
        { symbol: "USDC", name: "USDC", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" },
    ];
}
