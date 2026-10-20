# 🌱 Carbon Trace

Carbon Trace is a prototype registry for recording, transferring, and looking up
carbon-credit serial ranges on the Ethereum Sepolia testnet. It combines an
on-chain registry with a web app for company profiles, listings, and public
serial lookups.

> **Prototype notice:** Carbon Trace does not verify real-world carbon removal
or certify credits. Project names, vintage, and supporting evidence are
user-supplied. An on-chain record proves what was recorded on-chain; it does not
prove that a climate claim is true.

## ✨ What you can do

- **Register a batch** by recording a project ID, serial range, and
  evidence-file fingerprint on Sepolia. Vintage is issuer-reported app
  metadata, not an on-chain field.
- **Look up a serial** on the public Verify page without signing in.
- **List and buy ranges** of credits using Sepolia ETH through MetaMask.
- **View a dashboard** with a company's registered batches and transfer
  activity.

The evidence file is hashed in your browser; the file itself is not uploaded to
the blockchain. Only its fingerprint is recorded.

## 🧭 Pages

| Page | URL | What it is for |
| --- | --- | --- |
| Home | `/` | Project overview and navigation |
| Login | `/login` | Sign in with a wallet |
| Sign up | `/signup` | Create a company profile with a wallet |
| Register | `/register` | Register a batch and its serial range |
| Verify | `/verify` | Publicly look up a serial |
| Dashboard | `/dashboard` | View company batches and transfer activity |
| Buy | `/buy` | Browse and buy active listings |
| Sell | `/sell` | List eligible credits for sale |
| Limitations | `/limitations` | Review prototype and contract limitations |

## 👤 Using the app

1. Open the deployed app or run it locally using the instructions below.
2. Install and unlock [MetaMask](https://metamask.io/) in your browser.
3. Choose **Sepolia** in MetaMask and use Sepolia test ETH for transactions.
   Test ETH has no monetary value; obtain it from a Sepolia faucet if needed.
4. Sign up with your wallet and provide a company name when prompted. Returning
   users can sign in with the same wallet.
5. Register a batch, look up serials, view your dashboard, or browse listings.
   Registering, buying, and selling require a wallet transaction and incur
   Sepolia network gas fees.

For trades, use the same wallet address to sign in and transact in MetaMask.
Never enter or share your wallet recovery phrase or private key with this app.

## 🛠️ Run locally

### Requirements

- Node.js **20.9 or newer** and npm
- A MongoDB database for authentication profiles and app indexing
- MetaMask for wallet login and transactions
- A Sepolia wallet with test ETH for on-chain actions

Clone the repository and install the contract/tooling dependencies:

```powershell
git clone https://github.com/shauryasync/carbon-trace.git
cd carbon-trace
npm install
```

Create `web/.env.local` and set the required web-app values:

```dotenv
MONGODB_URI=your-mongodb-connection-string
AUTH_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

Generate a suitable `AUTH_SECRET` locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app also supports these optional settings:

```dotenv
# Defaults to the deployed address in web/lib/abi/CarbonRegistry.json
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Defaults to a public Sepolia RPC endpoint
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://your-sepolia-rpc-url
```

Keep `.env.local` private and never commit credentials, private keys, or
connection strings. Restart the development server after changing environment
variables.

Install web dependencies and start the app:

```powershell
cd web
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## 🔗 Contract deployment (optional)

The web app has a default Sepolia contract address and does not require you to
deploy a new contract for local use. To deploy your own instance, set these in
the repository-root `.env.local`:

```dotenv
SEPOLIA_RPC_URL=https://your-sepolia-rpc-url
DEPLOYER_PRIVATE_KEY=your-sepolia-deployer-private-key
```

Use a dedicated test wallet funded only with Sepolia ETH. Never use a
mainnet-funded account or commit this file. Then deploy:

```powershell
npx hardhat run scripts/deploy.js --network sepolia
```

The script writes the new contract address and ABI to
`web/lib/abi/CarbonRegistry.json`, which the web app uses by default. If you
deploy from another environment, configure
`NEXT_PUBLIC_CONTRACT_ADDRESS` in the web app instead.

## 🧪 Tests and checks

From the repository root, run the smart-contract tests:

```powershell
npx hardhat test
```

From `web/`, run the available frontend checks:

```powershell
npm run lint
npm run build
```

## ⚠️ Important limitations

- This is a **Sepolia testnet prototype**, not a production marketplace.
- The app does not independently validate projects, removal claims, vintages,
  or uploaded evidence. Company and project details are user-supplied.
- Only an evidence fingerprint is stored on-chain; the fingerprint does not
  establish that the underlying document is authentic or accurate.
- The contract supports retirement, but the current web app does not provide a
  retirement action. The contract itself has no ownership check for retirement,
  and a retired credit can still be listed and sold.
- Listings are not locked: multiple listings can claim the same serials, and
  only the first successful buyer can complete the transfer.
- A wallet cannot buy serials that overlap ranges it already holds. This check
  runs in the app immediately; the smart-contract check applies after deploying
  the updated contract. Existing holdings are not changed automatically.
- The contract's serial-range overlap check is intended for prototype scale.
- The app's database index may take time to reflect on-chain activity. The
  blockchain remains the record for transactions.
- Review the in-app Limitations page (`/limitations`) before using the
  prototype.
- Do not rely on Carbon Trace records for regulatory, financial, or
  environmental claims.

## 👥 Contributors

- Satyam
- Shaurya
- Lalit
