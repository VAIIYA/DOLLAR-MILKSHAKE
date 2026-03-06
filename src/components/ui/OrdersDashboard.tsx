"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { OrderWithExecutions } from "@/types/index";

const STATUS_COLORS: Record<string, string> = {
    active: "var(--green)",
    completed: "#3b82f6",
    pending_deposit: "#f59e0b",
    paused: "#f59e0b",
    failed: "var(--danger)",
};

const EXEC_STATUS_COLORS: Record<string, string> = {
    completed: "var(--green)",
    failed: "var(--danger)",
    pending: "var(--muted)",
    swapping: "#f59e0b",
    transferring: "#f59e0b",
};

function solscanLink(sig: string | null) {
    if (!sig) return null;
    return `https://solscan.io/tx/${sig}`;
}

function OrderCard({ order }: { order: OrderWithExecutions }) {
    const [expanded, setExpanded] = useState(false);
    const progress =
        order.totalDays > 0
            ? Math.round((order.daysCompleted / order.totalDays) * 100)
            : 0;
    const statusColor = STATUS_COLORS[order.status] ?? "var(--muted)";

    return (
        <div className="order-card">
            {/* Header */}
            <div
                className="order-header"
                onClick={() => setExpanded((v) => !v)}
                style={{ cursor: "pointer" }}
            >
                <div className="order-header-left">
                    <span className="token-badge">{order.tokenSymbol}</span>
                    <span className="order-schedule">
                        ${order.dailyAmount}/day × {order.totalDays} days
                    </span>
                </div>
                <div className="order-header-right">
                    <span
                        className="status-pill"
                        style={{ borderColor: statusColor, color: statusColor }}
                    >
                        <span
                            className="status-dot"
                            style={{ background: statusColor }}
                        />
                        {order.status.replace("_", " ")}
                    </span>
                    <span className="expand-icon">{expanded ? "▲" : "▼"}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-track">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="progress-label">
                {order.daysCompleted}/{order.totalDays} days completed ({progress}%)
            </div>

            {/* Stats Row */}
            <div className="order-stats">
                <div className="stat">
                    <span className="stat-label">Deposited</span>
                    <span className="stat-value">
                        ${order.depositAmount.toFixed(2)} {order.depositSymbol}
                    </span>
                </div>
                <div className="stat">
                    <span className="stat-label">Remaining</span>
                    <span className="stat-value">${order.remainingBalance.toFixed(2)}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Fee paid</span>
                    <span className="stat-value">${order.feeAmount.toFixed(2)}</span>
                </div>
            </div>

            {/* Execution History */}
            {expanded && (
                <div className="execution-table-wrap">
                    <table className="execution-table">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Received</th>
                                <th>Status</th>
                                <th>Tx</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.executions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>
                                        No buys yet
                                    </td>
                                </tr>
                            ) : (
                                order.executions.map((ex) => {
                                    const execColor = EXEC_STATUS_COLORS[ex.status] ?? "var(--muted)";
                                    const txLink = solscanLink(ex.transferTxSignature ?? ex.swapTxSignature);
                                    return (
                                        <tr key={ex.id}>
                                            <td>#{ex.dayNumber}</td>
                                            <td>
                                                {ex.outputAmountUi
                                                    ? `${ex.outputAmountUi} ${order.tokenSymbol}`
                                                    : "—"}
                                            </td>
                                            <td style={{ color: execColor }}>{ex.status}</td>
                                            <td>
                                                {txLink ? (
                                                    <a
                                                        href={txLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="solscan-link"
                                                    >
                                                        View ↗
                                                    </a>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

interface OrdersDashboardProps {
    refreshSignal?: number;
    profileAddress?: string;
}

export default function OrdersDashboard({ refreshSignal, profileAddress }: OrdersDashboardProps) {
    const { publicKey } = useWallet();
    const [orders, setOrders] = useState<OrderWithExecutions[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addressToFetch = profileAddress || publicKey?.toBase58();

    const fetchOrders = useCallback(async () => {
        if (!addressToFetch) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/orders?wallet=${addressToFetch}`);
            if (!res.ok) throw new Error("Failed to load orders");
            const data = await res.json();
            setOrders(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [addressToFetch]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders, refreshSignal]);

    if (!addressToFetch) return null;

    const activeOrders = orders.filter((o) => o.status === "active" || o.status === "pending_deposit");
    const completedOrders = orders.filter((o) => o.status !== "active" && o.status !== "pending_deposit");

    return (
        <section className="dashboard-section">
            <div className="dashboard-header">
                <h2 className="section-title">Your DCA Orders</h2>
                <button className="refresh-btn" onClick={fetchOrders} disabled={loading}>
                    {loading ? "⟳" : "↻ Refresh"}
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {loading && orders.length === 0 ? (
                <div className="loading-state">Loading orders…</div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <p>No active orders yet.</p>
                    {!profileAddress && (
                        <p className="empty-sub">Make your first deposit above to start DCAing.</p>
                    )}
                </div>
            ) : (
                <div className="orders-sections">
                    {activeOrders.length > 0 && (
                        <div className="orders-list" style={{ marginBottom: "2rem" }}>
                            <h3 style={{ marginBottom: "1rem", color: "var(--foreground)", fontSize: "1.1rem" }}>Open Orders</h3>
                            {activeOrders.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    )}
                    {completedOrders.length > 0 && (
                        <div className="orders-list">
                            <h3 style={{ marginBottom: "1rem", color: "var(--foreground)", fontSize: "1.1rem" }}>Completed / Other Orders</h3>
                            {completedOrders.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
