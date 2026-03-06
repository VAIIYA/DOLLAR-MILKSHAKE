# MemeDCA — Full Build Prompt for AI IDE (Cursor / Windsurf / Antigravity)

## MISSION
Build a complete, production-ready NextJS 15 App Router project called **MemeDCA**.
It is a Solana memecoin Dollar Cost Averaging platform that works as follows:

1. User connects Phantom or Solflare wallet
2. User picks a memecoin (BONK, WIF, POPCAT, etc.) and deposits USDC or SOL
3. User also pays a 5% fee of the deposit amount in SOL (covers broker gas)
4. A broker wallet (controlled server-side) buys exactly $1 of that memecoin every 24 hours via Jupiter Exchange V6
5. The tokens are sent back to the user's wallet after each daily buy
6. This continues until the deposit is exhausted (e.g. $10 = 10 days of $1 buys)
7. A Vercel Cron Job triggers the daily buy logic at 12:00 UTC every day

The entire project must be GitHub-ready and deployable to Vercel with zero changes
— all secrets come from environment variables.

---

## TECH STACK
- Next.js 15, App Router, TypeScript strict mode
- Turso (SQLite edge DB) + Drizzle ORM for all persistence
- @solana/web3.js + @solana/spl-token for on-chain transactions
- Jupiter Exchange V6 REST API for swaps (https://quote-api.jup.ag/v6)
- @solana/wallet-adapter-react + @solana/wallet-adapter-react-ui (Phantom + Solflare)
- Plain CSS in globals.css — dark theme, no Tailwind, no CSS-in-JS
- Vercel Cron Jobs via vercel.json

---

## ENVIRONMENT VARIABLES
These are set in Vercel dashboard — never hardcode them. Use process.env:

```
TURSO_DATABASE_URL        # libsql://your-db.turso.io
TURSO_AUTH_TOKEN          # Turso auth token
BROKER_WALLET_PRIVATE_KEY # Base58-encoded broker wallet secret key
NEXT_PUBLIC_BROKER_WALLET_PUBKEY # Broker wallet public key (safe to expose)
NEXT_PUBLIC_SOLANA_RPC_URL       # Solana RPC endpoint
CRON_SECRET               # Random secret for cron job auth
NEXT_PUBLIC_APP_URL       # https://your-app.vercel.app
```

---

## COMPLETE FILE STRUCTURE TO CREATE
```
memedca/
├── vercel.json
├── next.config.js
├── tsconfig.json
├── drizzle.config.ts
├── package.json
├── .env.example
├── .gitignore
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   └── api/
    │       ├── deposits/
    │       │   └── route.ts          # POST — create order
    │       ├── orders/
    │       │   ├── route.ts          # GET  — list user orders
    │       │   └── [id]/
    │       │       └── route.ts      # GET + PATCH — get/confirm order
    │       └── cron/
    │           └── daily-buys/
    │               └── route.ts      # GET — Vercel cron, executes daily swaps
    ├── components/
    │   ├── wallet/
    │   │   └── WalletProvider.tsx    # Solana wallet adapter context
    │   └── ui/
    │       ├── DepositForm.tsx       # Token select + amount input + fee calc
    │       └── OrdersDashboard.tsx  # Active orders + buy history per user
    ├── lib/
    │   ├── db.ts                     # Turso + Drizzle singleton
    │   ├── schema.ts                 # All DB tables: users, orders, executions
    │   ├── jupiter.ts                # Jupiter V6 quote + swap + transfer helpers
    │   ├── fees.ts                   # Fee calc: 5% of deposit in SOL
    │   └── tokens.ts                 # Supported memecoins with mainnet mint addresses
    └── types/
        └── index.ts                  # Shared TypeScript types
```

---

## DATABASE SCHEMA (src/lib/schema.ts)
Use Drizzle ORM with sqlite-core. Create three tables:

### users
- id: text primaryKey (wallet pubkey)
- createdAt: text default now
- totalDeposited: real default 0
- totalFeesPaid: real default 0

### orders
- id: text primaryKey (crypto.randomUUID())
- userId: text FK → users.id
- tokenMint: text (e.g. BONK mint address)
- tokenSymbol: text (e.g. "BONK")
- tokenName: text
- depositMint: text (USDC or wrapped SOL mint)
- depositSymbol: text ("USDC" or "SOL")
- depositAmount: real (e.g. 10.00)
- depositTxSignature: text nullable
- feeAmount: real (5% of deposit)
- feeTxSignature: text nullable
- dailyAmount: real default 1.0 ($1 per day)
- totalDays: integer (depositAmount / dailyAmount)
- daysCompleted: integer default 0
- remainingBalance: real
- status: text enum ["pending_deposit","active","paused","completed","failed"]
- createdAt: text default now
- activatedAt: text nullable
- completedAt: text nullable
- nextBuyAt: text nullable (ISO string, when next $1 buy fires)

### executions
- id: text primaryKey
- orderId: text FK → orders.id
- userId: text
- inputMint: text (USDC)
- inputAmount: real (~1.00)
- outputMint: text (memecoin)
- outputAmount: real nullable (tokens received)
- outputAmountUi: text nullable (human readable)
- jupiterQuoteId: text nullable
- swapTxSignature: text nullable
- transferTxSignature: text nullable
- status: text enum ["pending","swapping","transferring","completed","failed"]
- errorMessage: text nullable
- dayNumber: integer (day 1, 2, 3...)
- executedAt: text default now

---

## SUPPORTED MEMECOINS (src/lib/tokens.ts)
Export USDC_MINT and SOL_MINT constants. Export MEMECOINS array with these tokens:
- BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263 (decimals: 5)
- WIF: EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm (decimals: 6)
- POPCAT: 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr (decimals: 9)
- MYRO: HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4 (decimals: 9)
- BOME: ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82 (decimals: 6)
- SAMO: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU (decimals: 9)
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
SOL_MINT  = "So11111111111111111111111111111111111111112"

---

## KEY BUSINESS LOGIC

### Fee Calculation (src/lib/fees.ts)
- FEE_PERCENT = 0.05 (5%)
- DAILY_BUY_AMOUNT_USD = 1.0
- calculateOrder(depositAmountUsd): returns { depositAmount, feePercent, feeAmountUsd, totalDays, dailyAmount }
- totalDays = Math.floor(depositAmountUsd / 1.0)
- Minimum deposit: $5. Maximum: $10,000
- The fee is paid separately in SOL (not deducted from deposit)

### Jupiter Swap (src/lib/jupiter.ts)
All functions are SERVER-SIDE ONLY (used in API routes, never in client components).
- getQuote(inputMint, outputMint, amountLamports, slippageBps=100): calls https://quote-api.jup.ag/v6/quote
- executeSwap(quote, brokerKeypair, connection): calls https://quote-api.jup.ag/v6/swap, deserializes VersionedTransaction, signs with broker keypair, sends + confirms
- getBrokerKeypair(): loads from process.env.BROKER_WALLET_PRIVATE_KEY using bs58.decode
- getConnection(): new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL, "confirmed")
- usdcToLamports(amount): Math.floor(amount * 1_000_000)
- After swap: transfer tokens from broker ATA to user ATA using createTransferInstruction + createAssociatedTokenAccountIdempotentInstruction

### Deposit Flow (client-side in DepositForm.tsx)
1. User fills form (token, amount, currency)
2. POST /api/deposits → creates order with status "pending_deposit", returns orderId
3. Client sends deposit TX to broker wallet (USDC SPL transfer or SOL SystemProgram.transfer)
4. Client sends fee TX in SOL to broker wallet (5% of deposit, rough SOL/USD conversion at ~$150/SOL)
5. Wait for both TXs to confirm
6. PATCH /api/orders/[orderId] with { depositTxSignature, feeTxSignature } → status becomes "active"
7. Show success, refresh dashboard

### Daily Cron Engine (src/app/api/cron/daily-buys/route.ts)
This is the most critical file. It runs every 24h via Vercel Cron.
Security: check Authorization header = "Bearer " + process.env.CRON_SECRET

Logic:
1. Query all orders WHERE status = "active" AND nextBuyAt <= now (use drizzle `and`, `lte`)
2. Load broker keypair and connection once (outside loop)
3. For each order:
   a. Insert execution record with status "swapping"
   b. getQuote(USDC_MINT, order.tokenMint, usdcToLamports(order.dailyAmount))
   c. executeSwap(quote, brokerKeypair, connection) → gets swapTxSignature + outputAmount
   d. Update execution status to "transferring", save swapTxSignature
   e. Transfer tokens from broker ATA to user ATA → transferTxSignature
   f. Update execution to "completed"
   g. Increment order.daysCompleted, decrement remainingBalance
   h. If daysCompleted >= totalDays: set status "completed", completedAt = now
   i. Else: set nextBuyAt = now + 24 hours
   j. On any error: mark execution "failed" with errorMessage, advance nextBuyAt by 24h (retry tomorrow), don't fail the whole order
4. Return JSON summary { processed, succeeded, failed, errors[] }

---

## API ROUTES

### POST /api/deposits
Body: { userWallet, tokenMint, tokenSymbol, tokenName, depositAmountUsd, depositMint, depositSymbol }
- Validate amount (min $5, max $10,000)
- Upsert user record
- Create order with status "pending_deposit"
- Return: { orderId, totalDays, dailyAmount, feeAmount, nextBuyAt }

### PATCH /api/orders/[id]
Body: { depositTxSignature, feeTxSignature? }
- Find order by id, set status "active", save tx signatures, set activatedAt

### GET /api/orders/[id]
- Return single order

### GET /api/orders?wallet=<pubkey>
- Return all orders for wallet, each with nested executions array (ordered by dayNumber)

---

## UI COMPONENTS

### WalletProvider.tsx
"use client" wrapper around ConnectionProvider + WalletProvider + WalletModalProvider.
Import "@solana/wallet-adapter-react-ui/styles.css".
Use WalletAdapterNetwork.Mainnet. Wallets: [PhantomWalletAdapter, SolflareWalletAdapter].
endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(network)

### DepositForm.tsx ("use client")
Uses useWallet() and useConnection() hooks.
State: selectedToken, depositAmount (string), depositCurrency ("USDC"|"SOL"), isLoading, error, txStep
UI sections:
1. If no wallet: show centered WalletMultiButton with a prompt
2. Token grid: map MEMECOINS to clickable buttons (show symbol + name), highlight selected
3. Currency toggle: USDC / SOL buttons
4. Amount input: number, min=5, max=10000
5. Fee summary box (only show if valid amount): shows daily amount, duration in days, broker fee, total
6. Error banner (red) if error state is set
7. Submit button: disabled while loading or invalid, shows txStep text during processing
Props: onSuccess?: () => void  (called after full deposit + confirm flow)

### OrdersDashboard.tsx ("use client")
Uses useWallet(). Fetches GET /api/orders?wallet=... on mount when wallet connected.
For each order:
- Header row: token badge, "X/day × Y days", status pill with color dot
- Progress bar (daysCompleted/totalDays as %)  
- Stats row: deposited, remaining balance, fee paid
- Expandable execution history table (click header to toggle): day#, tokens received, status, Solscan link
Empty state and loading state handled gracefully.

### page.tsx (Server Component)
Import WalletMultiButton — NOTE: wrap in a "use client" sub-component or use dynamic import with ssr:false.
Layout:
- Sticky navbar: logo "🚀 MemeDCA" on left, WalletMultiButton on right
- Hero: big heading "Dollar Cost Average into Memecoins", subtitle, 3-step how-it-works cards
- DepositForm section (max-width 700px centered)
- OrdersDashboard section (max-width 700px centered)

### layout.tsx
Wraps children in SolanaWalletProvider. Metadata: title "MemeDCA", description.
Import globals.css.

---

## STYLING (globals.css)
Dark theme with CSS variables:
--bg: #0a0a0f, --surface: #13131a, --surface2: #1a1a24, --border: #2a2a3a
--accent: #7c3aed (purple), --accent2: #06b6d4 (cyan), --green: #22c55e
--text: #e2e8f0, --muted: #64748b, --danger: #ef4444

Key visual elements:
- Gradient text on hero heading: linear-gradient(135deg, #7c3aed, #06b6d4)
- Token buttons: surface2 bg, highlight with accent border + rgba bg when selected
- Fee summary box: subtle purple tinted border + background
- Progress bar fill: linear-gradient(90deg, var(--accent), var(--accent2))
- Deposit button: linear-gradient(135deg, var(--accent), #9333ea)
- Status colors: active=#22c55e, completed=#3b82f6, pending_deposit=#f59e0b, failed=#ef4444
- Responsive: mobile breakpoint at 600px

---

## CONFIGURATION FILES

### package.json — key dependencies:
```json
{
  "dependencies": {
    "@jup-ag/api": "^6.0.0",
    "@libsql/client": "^0.14.0",
    "@solana/spl-token": "^0.4.9",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-phantom": "^0.9.24",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-solflare": "^0.6.28",
    "@solana/web3.js": "^1.95.8",
    "bs58": "^6.0.0",
    "drizzle-orm": "^0.39.1",
    "next": "15.1.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.4",
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### next.config.js
Add webpack fallback: fs, net, tls all false (required for wallet adapters in browser).

### vercel.json
```json
{ "crons": [{ "path": "/api/cron/daily-buys", "schedule": "0 12 * * *" }] }
```

### drizzle.config.ts
dialect: "turso", schema: "./src/lib/schema.ts", out: "./drizzle"
dbCredentials: { url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! }

### .env.example
```
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token
BROKER_WALLET_PRIVATE_KEY=your-base58-encoded-private-key
NEXT_PUBLIC_BROKER_WALLET_PUBKEY=your-broker-wallet-public-key
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
CRON_SECRET=your-random-secret-generate-with-openssl-rand-hex-32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### .gitignore
Include: .env, .env.local, broker-wallet.json, node_modules/, .next/, drizzle/

---

## CRITICAL IMPLEMENTATION NOTES

1. **No hardcoded secrets ever.** All keys from process.env only.

2. **Broker wallet is SERVER-SIDE ONLY.** BROKER_WALLET_PRIVATE_KEY must never appear in client components
   or any file imported client-side. Only use in /api routes and cron route.

3. **NEXT_PUBLIC_BROKER_WALLET_PUBKEY is safe to expose** — it's needed client-side for the deposit
   transaction destination address.

4. **WalletMultiButton must be client-side.** In page.tsx (server component), import it dynamically:
   ```ts
   const WalletMultiButton = dynamic(
     () => import('@solana/wallet-adapter-react-ui').then(m => m.WalletMultiButton),
     { ssr: false }
   );
   ```
   Or wrap the navbar in its own "use client" component.

5. **Cron security:** Always verify Authorization header in /api/cron/daily-buys:
   ```ts
   if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

6. **ATA creation:** When transferring tokens to user, use createAssociatedTokenAccountIdempotentInstruction
   so you don't fail if the user already has a token account. The broker wallet pays for ATA creation.

7. **Error handling in cron:** Wrap each order in try/catch. On failure, mark execution failed, schedule
   retry for next day. Never let one failed order break the whole batch.

8. **Token account for broker:** The broker wallet needs its own USDC ATA and an ATA for each memecoin
   it will receive during swaps. Jupiter handles this via wrapAndUnwrapSol:true and the swap instruction.

9. **db.ts singleton:** Use globalThis pattern to avoid creating multiple connections during Next.js hot reload.

10. **Deposit amount is USD value, not token amount.** Users deposit $10 worth of USDC (10 USDC) or
    $10 worth of SOL. The daily buy is always $1 USD worth of the memecoin.

11. **Fee conversion:** Fee is 5% of deposit in USD, paid in SOL. Use rough price (~$150/SOL) for the fee
    TX amount calculation. In a production version, integrate a price oracle.

12. **All timestamps stored as ISO strings** in SQLite (Turso doesn't have native datetime type).
    Use new Date().toISOString() consistently.

13. **Progress tracking:** After each successful daily buy:
    - daysCompleted += 1
    - remainingBalance -= dailyAmount
    - nextBuyAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    - If daysCompleted >= totalDays: status = "completed"

---

## AFTER BUILDING: DEPLOYMENT CHECKLIST

1. `git init && git add . && git commit -m "init" && git push` to GitHub
2. Connect repo to Vercel
3. Add ALL environment variables in Vercel dashboard (Settings → Environment Variables):
   - TURSO_DATABASE_URL
   - TURSO_AUTH_TOKEN
   - BROKER_WALLET_PRIVATE_KEY
   - NEXT_PUBLIC_BROKER_WALLET_PUBKEY
   - NEXT_PUBLIC_SOLANA_RPC_URL
   - CRON_SECRET
   - NEXT_PUBLIC_APP_URL
4. Run `npm run db:push` locally with Turso credentials to create tables
5. Fund broker wallet with SOL (for gas) and USDC (for swaps)
6. Vercel auto-detects vercel.json cron and runs daily at 12:00 UTC

---

## WHAT TO BUILD — FINAL INSTRUCTION

Please build the COMPLETE project described above with ALL files.
Do not skip any file. Do not use placeholder comments like "// implement this".
Write fully working, production-quality TypeScript code for every file.
The app should compile with `npm run build` and deploy to Vercel without errors.

Start by creating the project structure, then implement files in this order:
1. package.json, tsconfig.json, next.config.js, vercel.json, drizzle.config.ts, .env.example, .gitignore
2. src/lib/schema.ts
3. src/lib/db.ts
4. src/lib/tokens.ts
5. src/lib/fees.ts
6. src/lib/jupiter.ts
7. src/types/index.ts
8. src/app/api/deposits/route.ts
9. src/app/api/orders/route.ts
10. src/app/api/orders/[id]/route.ts
11. src/app/api/cron/daily-buys/route.ts
12. src/components/wallet/WalletProvider.tsx
13. src/components/ui/DepositForm.tsx
14. src/components/ui/OrdersDashboard.tsx
15. src/app/globals.css
16. src/app/layout.tsx
17. src/app/page.tsx
