"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddressSync,
    createTransferInstruction,
    createAssociatedTokenAccountIdempotentInstruction,
    getMint,
} from "@solana/spl-token";
import { USDC_MINT, SOL_MINT, DMS_TOKEN } from "@/lib/tokens";
import type { Memecoin } from "@/lib/tokens";
import { calculateOrder, feeSolToLamports } from "@/lib/fees";
import type { OrderCalculation } from "@/lib/fees";
import type { DepositCurrency, TxStep } from "@/types/index";

interface DepositFormProps {
    onSuccess?: () => void;
}

export default function DepositForm({ onSuccess }: DepositFormProps) {
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();

    const [tokens, setTokens] = useState<Memecoin[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedToken, setSelectedToken] = useState<Memecoin | null>(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositCurrency, setDepositCurrency] =
        useState<DepositCurrency>("USDC");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txStep, setTxStep] = useState<TxStep>("idle");
    const [calc, setCalc] = useState<OrderCalculation | null>(null);

    const amountNum = parseFloat(depositAmount);
    const isValidAmount = !isNaN(amountNum) && amountNum >= 5 && amountNum <= 10000;

    useEffect(() => {
        setTokens([DMS_TOKEN]);
        setSelectedToken(DMS_TOKEN);
    }, []);

    useEffect(() => {
        let isMounted = true;
        async function runCalc() {
            if (isValidAmount) {
                try {
                    const result = await calculateOrder(amountNum);
                    if (isMounted) setCalc(result);
                } catch {
                    if (isMounted) setCalc(null);
                }
            } else {
                if (isMounted) setCalc(null);
            }
        }
        const to = setTimeout(runCalc, 300); // 300ms debounce
        return () => {
            isMounted = false;
            clearTimeout(to);
        };
    }, [amountNum, isValidAmount]);

    const filteredTokens = tokens
        .filter(t => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 12);

    const brokerPubkey = process.env.NEXT_PUBLIC_BROKER_WALLET_PUBKEY;

    const handleSubmit = useCallback(async () => {
        if (!publicKey || !calc || !selectedToken) return;

        if (!brokerPubkey) {
            setError("Configuration error: Broker wallet public key is missing. Please check your environment variables and redeploy.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // ─ Step 1: Create order ─────────────────────────────────────────────
            setTxStep("creating_order");
            const orderRes = await fetch("/api/deposits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userWallet: publicKey.toBase58(),
                    tokenMint: selectedToken.mint,
                    tokenSymbol: selectedToken.symbol,
                    tokenName: selectedToken.name,
                    depositAmountUsd: amountNum,
                    depositMint: depositCurrency === "USDC" ? USDC_MINT : SOL_MINT,
                    depositSymbol: depositCurrency,
                }),
            });

            if (!orderRes.ok) {
                const data = await orderRes.json();
                throw new Error(data.error ?? "Failed to create order");
            }

            const { orderId, feeAmountSol } = await orderRes.json();
            const broker = new PublicKey(brokerPubkey);

            // ─ Step 2: Deposit TX ──────────────────────────────────────────────
            setTxStep("awaiting_deposit");
            let depositTxSignature: string;

            const { blockhash } = await connection.getLatestBlockhash();

            if (depositCurrency === "SOL") {
                const lamports = Math.floor(amountNum * LAMPORTS_PER_SOL);
                const tx = new Transaction({
                    recentBlockhash: blockhash,
                    feePayer: publicKey,
                }).add(
                    SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: broker,
                        lamports,
                    })
                );
                depositTxSignature = await sendTransaction(tx, connection);
                await connection.confirmTransaction(depositTxSignature, "confirmed");
            } else {
                // USDC SPL transfer
                const mintPubkey = new PublicKey(USDC_MINT);
                const mintInfo = await getMint(connection, mintPubkey);
                const rawAmount = Math.floor(amountNum * 10 ** mintInfo.decimals);

                const userAta = getAssociatedTokenAddressSync(mintPubkey, publicKey);
                const brokerAta = getAssociatedTokenAddressSync(mintPubkey, broker);

                const tx = new Transaction({
                    recentBlockhash: blockhash,
                    feePayer: publicKey,
                }).add(
                    createAssociatedTokenAccountIdempotentInstruction(
                        publicKey,
                        brokerAta,
                        broker,
                        mintPubkey
                    ),
                    createTransferInstruction(userAta, brokerAta, publicKey, rawAmount)
                );
                depositTxSignature = await sendTransaction(tx, connection);
                await connection.confirmTransaction(depositTxSignature, "confirmed");
            }

            // ─ Step 3: Fee TX (SOL) ────────────────────────────────────────────
            setTxStep("awaiting_fee");
            const feeBlocks = await connection.getLatestBlockhash();
            const feeLamports = feeSolToLamports(feeAmountSol);
            const feeTx = new Transaction({
                recentBlockhash: feeBlocks.blockhash,
                feePayer: publicKey,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: broker,
                    lamports: feeLamports,
                })
            );
            const feeTxSignature = await sendTransaction(feeTx, connection);
            await connection.confirmTransaction(feeTxSignature, "confirmed");

            // ─ Step 4: Confirm order ───────────────────────────────────────────
            setTxStep("confirming");
            const confirmRes = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ depositTxSignature, feeTxSignature }),
            });
            if (!confirmRes.ok) {
                const data = await confirmRes.json();
                throw new Error(data.error ?? "Failed to confirm order");
            }

            setTxStep("done");
            setDepositAmount("");
            onSuccess?.();
        } catch (err) {
            setError((err as Error).message ?? "Transaction failed");
            setTxStep("idle");
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, brokerPubkey, calc, selectedToken, amountNum, depositCurrency, connection, sendTransaction, onSuccess]);

    const stepLabel: Record<TxStep, string> = {
        idle: "Start DCA",
        creating_order: "Creating order…",
        awaiting_deposit: "Sign deposit TX…",
        awaiting_fee: "Sign fee TX…",
        confirming: "Confirming…",
        done: "✓ Active!",
    };

    if (!publicKey) {
        return (
            <div className="form-connect-prompt">
                <p className="form-connect-text">Connect your wallet to get started</p>
                <WalletMultiButton />
            </div>
        );
    }

    return (
        <div className="deposit-form">
            {/* Token Grid */}
            <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Choose a memecoin</label>
                </div>
                <div className="token-grid">
                    {tokens.length === 0 ? (
                        <div style={{ padding: '1rem', color: 'var(--muted)', gridColumn: '1 / -1', textAlign: 'center' }}>Loading tokens...</div>
                    ) : filteredTokens.length === 0 ? (
                        <div style={{ padding: '1rem', color: 'var(--muted)', gridColumn: '1 / -1', textAlign: 'center' }}>No tokens found</div>
                    ) : filteredTokens.map((token) => (
                        <button
                            key={token.mint}
                            className={`token-btn${selectedToken?.mint === token.mint ? " selected" : ""}`}
                            onClick={() => setSelectedToken(token)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {token.logoUrl && (
                                <img src={token.logoUrl} alt={token.symbol} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span className="token-symbol">{token.symbol}</span>
                                <span className="token-name" style={{ fontSize: '0.75rem', maxWidth: '80px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{token.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Currency Toggle */}
            <div className="form-section">
                <label className="form-label">Deposit currency</label>
                <div className="currency-toggle">
                    <button
                        className={`currency-btn${depositCurrency === "USDC" ? " active" : ""}`}
                        onClick={() => setDepositCurrency("USDC")}
                    >
                        USDC
                    </button>
                    <button
                        className={`currency-btn${depositCurrency === "SOL" ? " active" : ""}`}
                        onClick={() => setDepositCurrency("SOL")}
                    >
                        SOL
                    </button>
                </div>
            </div>

            {/* Amount Input */}
            <div className="form-section">
                <label className="form-label">
                    Deposit amount (USD){" "}
                    <span className="form-label-hint">Min $5 · Max $10,000</span>
                </label>
                <div className="amount-input-wrap">
                    <span className="amount-prefix">$</span>
                    <input
                        type="number"
                        className="amount-input"
                        placeholder="10"
                        min={5}
                        max={10000}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                    />
                </div>
            </div>

            {/* Fee Summary */}
            {calc && isValidAmount && (
                <div className="fee-summary">
                    <div className="fee-row">
                        <span>Daily buy</span>
                        <span>${calc.dailyAmount.toFixed(2)} of {selectedToken?.symbol}</span>
                    </div>
                    <div className="fee-row">
                        <span>Duration</span>
                        <span>{calc.totalDays} days</span>
                    </div>
                    <div className="fee-row">
                        <span>Broker fee (5%)</span>
                        <span>${calc.feeAmountUsd.toFixed(2)} ≈ {calc.feeAmountSol.toFixed(4)} SOL</span>
                    </div>
                    <div className="fee-row fee-total">
                        <span>Total cost</span>
                        <span>
                            ${(calc.depositAmount + calc.feeAmountUsd).toFixed(2)} + gas
                        </span>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && <div className="error-banner">{error}</div>}

            {/* Submit */}
            <button
                className="submit-btn"
                disabled={isLoading || !isValidAmount}
                onClick={handleSubmit}
            >
                {isLoading ? stepLabel[txStep] : txStep === "done" ? stepLabel.done : "Start DCA →"}
            </button>
        </div>
    );
}
