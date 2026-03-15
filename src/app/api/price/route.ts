import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const ids = searchParams.get("ids") || "SOL";

        const url = new URL("https://api.jup.ag/price/v2/full");
        url.searchParams.set("ids", ids);

        const apiKey = process.env.JUPITER_API_KEY;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
            headers["x-api-key"] = apiKey;
        }

        const res = await fetch(url.toString(), {
            headers,
            next: { revalidate: 60 } // Cache for 1 minute
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`Jupiter Price API failed: ${res.status} ${text}`);
            return NextResponse.json({ error: "Failed to fetch price" }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Price proxy error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
