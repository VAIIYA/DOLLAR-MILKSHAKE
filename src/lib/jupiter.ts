import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    VersionedTransaction,
} from "@solana/web3.js";
import {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction,
    createAssociatedTokenAccountIdempotentInstruction,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";

// ─── Connection & Keypair ────────────────────────────────────────────────────

export function getConnection(): Connection {
    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!rpc) throw new Error("NEXT_PUBLIC_SOLANA_RPC_URL not set");
    return new Connection(rpc, "confirmed");
}

export function getBrokerKeypair(): Keypair {
    const raw = process.env.BROKER_WALLET_PRIVATE_KEY;
    if (!raw) throw new Error("BROKER_WALLET_PRIVATE_KEY not set");
    const secretKey = bs58.decode(raw);
    return Keypair.fromSecretKey(secretKey);
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────

/** Convert a USD amount into USDC lamports (6 decimals) */
export function usdcToLamports(amountUsd: number): number {
    return Math.floor(amountUsd * 1_000_000);
}

/** Convert raw USDC lamports to human-readable amount */
export function lamportsToUsdc(lamports: number): number {
    return lamports / 1_000_000;
}

// ─── Jupiter Quote ────────────────────────────────────────────────────────────

export interface JupiterQuote {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export async function getQuote(
    inputMint: string,
    outputMint: string,
    amountLamports: number,
    slippageBps = 100
): Promise<JupiterQuote> {
    const url = new URL("https://quote-api.jup.ag/v6/quote");
    url.searchParams.set("inputMint", inputMint);
    url.searchParams.set("outputMint", outputMint);
    url.searchParams.set("amount", String(amountLamports));
    url.searchParams.set("slippageBps", String(slippageBps));

    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Jupiter quote failed: ${res.status} ${text}`);
    }
    return res.json();
}

// ─── Jupiter Swap ─────────────────────────────────────────────────────────────

export interface SwapResult {
    swapTxSignature: string;
    outputAmount: number;
    outputAmountUi: string;
}

export async function executeSwap(
    quote: JupiterQuote,
    brokerKeypair: Keypair,
    connection: Connection
): Promise<SwapResult> {
    // Request swap transaction from Jupiter
    const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: brokerKeypair.publicKey.toBase58(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: "auto",
        }),
    });

    if (!swapRes.ok) {
        const text = await swapRes.text();
        throw new Error(`Jupiter swap request failed: ${swapRes.status} ${text}`);
    }

    const { swapTransaction } = await swapRes.json();

    // Deserialize and sign the versioned transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([brokerKeypair]);

    // Send and confirm
    const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        {
            skipPreflight: false,
            maxRetries: 3,
        }
    );

    await connection.confirmTransaction(signature, "confirmed");

    const outputAmount = Number(quote.outAmount ?? 0);
    const outputDecimals = Number(quote.outputMint?.decimals ?? 9);
    const outputAmountUi = (outputAmount / 10 ** outputDecimals).toFixed(6);

    return {
        swapTxSignature: signature,
        outputAmount,
        outputAmountUi,
    };
}

// ─── Token Transfer ───────────────────────────────────────────────────────────

export interface TransferResult {
    transferTxSignature: string;
}

/**
 * Transfer tokens from broker ATA to user ATA.
 * Creates the user's ATA idempotently if it doesn't exist (broker pays for it).
 */
export async function transferTokensToUser(
    tokenMint: PublicKey,
    userWallet: PublicKey,
    brokerKeypair: Keypair,
    connection: Connection,
    rawAmount: number
): Promise<TransferResult> {
    const mintPubkey = tokenMint;
    const brokerAta = getAssociatedTokenAddressSync(
        mintPubkey,
        brokerKeypair.publicKey
    );
    const userAta = getAssociatedTokenAddressSync(mintPubkey, userWallet);

    const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

    const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: brokerKeypair.publicKey,
    });

    // Create user ATA if needed (idempotent — no-op if already exists)
    transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
            brokerKeypair.publicKey, // payer
            userAta,
            userWallet,
            mintPubkey
        )
    );

    // Transfer tokens
    transaction.add(
        createTransferInstruction(
            brokerAta,
            userAta,
            brokerKeypair.publicKey,
            rawAmount
        )
    );

    transaction.sign(brokerKeypair);

    const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, maxRetries: 3 }
    );

    await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
    );

    return { transferTxSignature: signature };
}
