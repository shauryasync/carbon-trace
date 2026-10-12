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

For deployment to Sepolia, copy `.env.example` to `.env` in the repository
root and fill in `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY`. Do not commit
`.env` or put real credentials in `.env.example`.

To run the web app locally:

```powershell
cd web
copy .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The web app
does not currently require environment variables, so its `.env.example` is
intentionally empty apart from an explanatory comment.
