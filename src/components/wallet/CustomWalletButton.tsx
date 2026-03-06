"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export default function CustomWalletButton() {
    const { publicKey, wallet, disconnect } = useWallet();
    const { setVisible } = useWalletModal();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    if (!publicKey || !wallet) {
        return <WalletMultiButton />;
    }

    const base58 = publicKey.toBase58();
    const truncatedAddress = `${base58.slice(0, 4)}..${base58.slice(-4)}`;

    return (
        <div className="custom-wallet-wrapper" ref={ref} style={{ position: "relative" }}>
            <button
                className="wallet-adapter-button wallet-adapter-button-trigger custom-wallet-btn"
                onClick={() => setDropdownOpen((prev) => !prev)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                {wallet.adapter.icon && (
                    <img src={wallet.adapter.icon} alt={`${wallet.adapter.name} icon`} style={{ width: "24px", height: "24px" }} />
                )}
                <span className="wallet-name" style={{ fontFamily: "'Inter', sans-serif" }}>{truncatedAddress}</span>
            </button>

            {dropdownOpen && (
                <ul className="custom-wallet-dropdown">
                    <li className="custom-wallet-dropdown-item">
                        <Link
                            href={`/profile/${base58}`}
                            className="custom-wallet-dropdown-link"
                            onClick={() => setDropdownOpen(false)}
                        >
                            Profile
                        </Link>
                    </li>
                    <li
                        className="custom-wallet-dropdown-item"
                        onClick={() => {
                            navigator.clipboard.writeText(base58);
                            setDropdownOpen(false);
                        }}
                    >
                        Copy address
                    </li>
                    <li
                        className="custom-wallet-dropdown-item"
                        onClick={() => {
                            setVisible(true);
                            setDropdownOpen(false);
                        }}
                    >
                        Change wallet
                    </li>
                    <li
                        className="custom-wallet-dropdown-item"
                        onClick={() => {
                            disconnect();
                            setDropdownOpen(false);
                        }}
                    >
                        Disconnect
                    </li>
                </ul>
            )}
        </div>
    );
}
