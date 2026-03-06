"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import DepositForm from "@/components/ui/DepositForm";
import OrdersDashboard from "@/components/ui/OrdersDashboard";

// WalletMultiButton must be client-only (no SSR)
const WalletMultiButton = dynamic(
    () =>
        import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
    { ssr: false }
);

export default function Home() {
    const [refreshSignal, setRefreshSignal] = useState(0);

    function handleDepositSuccess() {
        setRefreshSignal((n) => n + 1);
    }

    return (
        <>
            {/* Sticky Navbar */}
            <nav className="navbar">
                <span className="logo">🥤 Dollar Milkshake</span>
                <WalletMultiButton />
            </nav>

            {/* Hero */}
            <section className="hero">
                <h1 className="hero-heading">
                    Dollar Cost Average<br />into Memecoins
                </h1>
                <p className="hero-sub">
                    Deposit USDC or SOL once. Our broker buys $1 of your chosen memecoin
                    every 24 hours — straight to your wallet.
                </p>

                <div className="how-grid">
                    <div className="how-card">
                        <div className="how-icon">💳</div>
                        <div className="how-title">1. Deposit</div>
                        <div className="how-desc">
                            Send USDC or SOL to fund your DCA order. Minimum $5.
                        </div>
                    </div>
                    <div className="how-card">
                        <div className="how-icon">🔁</div>
                        <div className="how-title">2. Daily Buys</div>
                        <div className="how-desc">
                            We buy exactly $1 of your memecoin every day via Jupiter Exchange.
                        </div>
                    </div>
                    <div className="how-card">
                        <div className="how-icon">📬</div>
                        <div className="how-title">3. Receive</div>
                        <div className="how-desc">
                            Tokens are sent to your wallet after each buy. Non-custodial.
                        </div>
                    </div>
                </div>
            </section>

            {/* Main content */}
            <main className="container">
                {/* Deposit Form */}
                <div className="deposit-section">
                    <h2 className="deposit-section-title">Start a New DCA Order</h2>
                    <DepositForm onSuccess={handleDepositSuccess} />
                </div>

                {/* Orders Dashboard */}
                <OrdersDashboard refreshSignal={refreshSignal} />
            </main>
        </>
    );
}
