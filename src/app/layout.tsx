import type { Metadata } from "next";
import SolanaWalletProvider from "@/components/wallet/WalletProvider";
import "./globals.css";

export const metadata: Metadata = {
    title: "Dollar Milkshake — Dollar Cost Average into Memecoins",
    description:
        "Automatically DCA into Solana memecoins like BONK, WEN, and POPCAT using USDC or SOL. Powered by Jupiter Exchange.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <SolanaWalletProvider>{children}</SolanaWalletProvider>
            </body>
        </html>
    );
}
