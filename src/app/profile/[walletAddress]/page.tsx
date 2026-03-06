import Link from "next/link";
import OrdersDashboard from "@/components/ui/OrdersDashboard";

export default function ProfilePage({ params }: { params: { walletAddress: string } }) {
    const { walletAddress } = params;

    return (
        <>
            {/* Navbar */}
            <nav className="navbar">
                <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
                    🥤 Dollar Milkshake
                </Link>
            </nav>

            <main className="container" style={{ marginTop: "2rem" }}>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <h1 className="hero-heading" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                        Wallet Profile
                    </h1>
                    <p className="hero-sub" style={{ wordBreak: "break-all", fontSize: "1rem" }}>
                        {walletAddress}
                    </p>
                </div>

                <OrdersDashboard profileAddress={walletAddress} />
            </main>
        </>
    );
}
