# 🐾 Stellar Pet Adoption Tracker

Stellar Pet Adoption Tracker is a decentralized, secure, and transparent web application connecting pet shelters with loving adopters on the Stellar Testnet using Soroban smart contracts.

---

## 🚀 Tech Stack

*   **Frontend**: React 18 (Vite, Javascript)
*   **Styling**: Tailwind CSS
*   **Wallet Integration**: `@stellar/stellar-wallets-kit` (Freighter, xBull, Albedo)
*   **Blockchain SDK**: `@stellar/stellar-sdk`
*   **Smart Contract Environment**: Soroban (Rust)

---

## ✨ Features

*   **Wallet Integration Dashboard**: Supports connecting Freighter, xBull, and Albedo wallets with automatic testnet balance tracking.
*   **Interactive Pet Catalog**: Browse a beautiful, mobile-responsive grid of pets listed by shelters.
*   **Live Donation System**: Support shelter pets by donating XLM directly. Includes pre-set buttons, real-time balance validation, and automated transaction updates.
*   **On-Chain Adoption registry**: Shelters can register verified adoptions on-chain, updating the metadata status.
*   **Real-time Ledger Sync**: Intercepts Soroban events to dynamically animate count-up donation numbers and status changes without requiring page reloads.
*   **Hybrid Offline Mock Mode**: Works out of the box in Demo Mode when no contract address is set, storing updates locally inside `localStorage` with identical transaction timers.

---

## 📁 Project Structure

```
stellar-pet-adoption/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── WalletContext.jsx
│   │   ├── WalletConnector.jsx
│   │   ├── PetList.jsx
│   │   ├── PetCard.jsx
│   │   ├── DonateModal.jsx
│   │   ├── AdoptionModal.jsx
│   │   └── TransactionStatus.jsx
│   ├── hooks/
│   │   └── usePetEvents.js
│   └── utils/
│       ├── constants.js
│       ├── walletKit.js
│       └── contractClient.js
├── contract/
│   ├── src/
│   │   └── lib.rs
│   └── Cargo.toml
├── .env.example
├── .env
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── index.html
├── package.json
└── README.md
```

---

## 🛠️ Setup Instructions

### 1. Prerequisites
Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Rust & Cargo](https://doc.rust-lang.org/cargo/) (for contract modification)
*   [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup#install-the-soroban-cli)

### 2. Installation
1. Clone this repository to your local machine:
   ```bash
   git clone <repository-url>
   cd stellar-pet-adoption
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

### 3. Environment Config
Copy the example environment file and name it `.env`:
```bash
cp .env.example .env
```
By default, `VITE_CONTRACT_ID` is set to `YOUR_CONTRACT_ID_HERE`. The application will launch in **Demo Mode** with fully functional mocks. To switch to live mode, replace it with your compiled contract ID.

### 4. Running the App
Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📝 Contract Deployment Instructions

We have provided a fully automated deployment script that checks for Rust, installs compile targets, compiles the contract, deploys it to Stellar Testnet, and configures the environment file.

### Option A: Fully Automated (Recommended)
Simply run the script in PowerShell:
```powershell
./scripts/deploy.ps1
```

### Option B: Manual CLI Steps
To manually deploy using the `stellar` CLI:

1.  **Configure Network and Identity**:
    ```bash
    stellar network add --global testnet \
      --rpc-url https://soroban-testnet.stellar.org:443 \
      --network-passphrase "Test SDF Network ; September 2015"
    
    stellar keys generate --global alice --network testnet
    ```
2.  **Build the Contract**:
    ```bash
    cd contract
    stellar contract build
    ```
    This builds the `.wasm` file under `target/wasm32-unknown-unknown/release/stellar_pet_adoption.wasm`.

3.  **Deploy to Testnet**:
    ```bash
    stellar contract deploy \
      --wasm target/wasm32-unknown-unknown/release/stellar_pet_adoption.wasm \
      --source alice \
      --network testnet
    ```
    *Record the contract ID returned.*

4.  **Initialize the Contract** (Optional, sets XLM Native Token Address):
    ```bash
    # Testnet XLM contract: CDLZFC3SYJYDZT7K67VZ75HPJGWAM3QFA2J7NHM3F5N2W67N4XAN4MTT
    stellar contract invoke \
      --id <YOUR_CONTRACT_ID> \
      --source alice \
      --network testnet \
      -- \
      initialize \
      --token_address CDLZFC3SYJYDZT7K67VZ75HPJGWAM3QFA2J7NHM3F5N2W67N4XAN4MTT
    ```

5.  **Configure Frontend**:
    Add the contract address to your `.env` file:
    ```env
    VITE_CONTRACT_ID=CDA...YOUR_CONTRACT_ID_HERE
    ```

---

## 🔗 Live Addresses (Placeholders)

*   **Deployed Contract Address**: `YOUR_CONTRACT_ID_HERE` *(Update after deploying)*
*   **Stellar Expert testnet transaction registry**: [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)
*   **Live App Demo URL**: `https://your-stellar-pet-adoption.vercel.app` *(Update after hosting)*

---

## 📸 Screenshots

*(Add your screenshot images to these paths)*
*   **Dashboard view**: `./screenshots/dashboard.png`
*   **Connected Wallet**: `

      Screenshot 2026-06-11 023839.png
*   
*   **Donation flow**: `./screenshots/donation_modal.png`
*   **Adoption completed**: `./screenshots/adoption_completed.png`

---

## 📋 Level 2 Requirements Checklist

- [x] **React 18 & Vite Setup**: Implemented lightweight boilerplate configuration.
- [x] **Tailwind CSS Styling**: Curated a professional, responsive layout utilizing warm cream backgrounds, emerald primary accents, and purple states.
- [x] **Stellar Wallet Integration**: Supporting Freighter, xBull, and Albedo via `@stellar/stellar-wallets-kit`.
- [x] **Live Balances**: Horizon account balance tracking on wallet connection.
- [x] **Event Streams**: Listens to Soroban events to trigger donation count-up and adoption badge transitions.
- [x] **Interactive Modals**: Multi-error banners, input boundary checks, and transaction receipt links to stellar.expert.
- [x] **Interactive Mocks**: Full-scale Demo mode using local storage to verify features without requiring contract deployment.
