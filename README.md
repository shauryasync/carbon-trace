# carbon-trace

## Collaborators

- Satyam
- Shaurya
- Lalit

## Setup

Install Node.js, then clone the repository and install the root dependencies:

```powershell
git clone https://github.com/shauryasync/carbon-trace.git
cd carbon-trace
npm install
```

The Hardhat tests run with:

```powershell
npx hardhat test
```

For deployment to Sepolia, put `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in
`.env.local` or `.env` in the repository root. Hardhat loads `.env.local`
first, then `.env` as a fallback. Do not commit either file or put real
credentials in `.env.example`.

To run the web app locally:

```powershell
cd web
copy .env.example .env.local
# Add your MongoDB connection string to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The web app
loads `web/.env.local` automatically when started with Next.js. Set
`MONGODB_URI` there for the API's MongoDB-backed endpoints. The contract address
and Sepolia RPC URL are optional; defaults are provided by the app.
