import type { Metadata } from "next";
import SolanaWalletProvider from "@/components/wallet/WalletProvider";
import "./globals.css";

export const metadata: Metadata = {
    title: "MemeDCA — Dollar Cost Average into Memecoins",
    description:
        "Automatically DCA into Solana memecoins like BONK, WIF, and POPCAT using USDC or SOL. Powered by Jupiter Exchange.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <SolanaWalletProvider>{children}</SolanaWalletProvider>
            </body>
        </html>
    );
}
