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
                    Dollar Cost Average into{" "}
                    <span className="accent">Memecoins</span>
                </h1>
                <p className="hero-sub">
                    Deposit USDC or SOL once. We buy $1 of your chosen memecoin every 24
                    hours via Jupiter Exchange — sent straight to your wallet.
                </p>

                <div className="how-grid">
                    <div className="how-card">
                        <div className="how-icon">💳</div>
                        <div className="how-title">Deposit</div>
                        <div className="how-desc">
                            Send USDC or SOL to fund your order. Minimum $5, maximum $10,000.
                        </div>
                    </div>
                    <div className="how-card">
                        <div className="how-icon">🔁</div>
                        <div className="how-title">Daily Buys</div>
                        <div className="how-desc">
                            We automatically buy $1 of your memecoin every 24 hours via
                            Jupiter.
                        </div>
                    </div>
                    <div className="how-card">
                        <div className="how-icon">📬</div>
                        <div className="how-title">Receive</div>
                        <div className="how-desc">
                            Tokens arrive in your wallet after each buy. Always
                            non-custodial.
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
