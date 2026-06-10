# Stellar Pet Adoption - Deployment Automation Script
# Run this script in PowerShell to build, deploy, and configure your Soroban smart contract.

$ErrorActionPreference = "Stop"

Write-Host "🐾 Starting Stellar Pet Adoption deployment automation..." -ForegroundColor Green

# 1. Check/Install Rust
if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ Rust compiler (cargo) not found. Setting up Rust..." -ForegroundColor Yellow
    $rustupPath = "$env:TEMP\rustup-init.exe"
    Write-Host "📥 Downloading rustup-init..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustupPath
    Write-Host "⚙️ Launching Rust Installer. Please follow the prompts to complete default installation..." -ForegroundColor Yellow
    Start-Process -FilePath $rustupPath -ArgumentList "-y" -Wait
    Remove-Item $rustupPath -ErrorAction SilentlyContinue
    
    # Reload path environment variables
    $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
        Write-Error "Failed to install Rust. Please install Rust manually from https://rustup.rs/ and restart your terminal."
    }
}
Write-Host "✓ Rust is installed." -ForegroundColor Green

# 2. Add Wasm compilation target
Write-Host "⚙️ Adding wasm32 compilation target..." -ForegroundColor Gray
rustup target add wasm32-unknown-unknown

# 3. Build Contract
Write-Host "🔨 Compiling smart contract to WASM..." -ForegroundColor Gray
Set-Location -Path "contract"
stellar contract build
Set-Location -Path ".."
Write-Host "✓ Contract WASM generated successfully." -ForegroundColor Green

# 4. Configure network in Stellar CLI
Write-Host "🌐 Registering Testnet network configurations..." -ForegroundColor Gray
stellar network add --global testnet `
  --rpc-url "https://soroban-testnet.stellar.org:443" `
  --network-passphrase "Test SDF Network ; September 2015" `
  -o allow-replace

# 5. Generate deployer identity
Write-Host "🔑 Creating deployer identity..." -ForegroundColor Gray
stellar keys generate --global deployer --network testnet -o allow-replace
$deployerPubKey = stellar keys address deployer
Write-Host "✓ Identity 'deployer' ready. Public Address: $deployerPubKey" -ForegroundColor Green

# 6. Deploy WASM
Write-Host "🚀 Deploying WASM contract to Stellar Testnet..." -ForegroundColor Yellow
$wasmPath = "contract/target/wasm32-unknown-unknown/release/stellar_pet_adoption.wasm"
$contractId = (stellar contract deploy --wasm $wasmPath --source deployer --network testnet).Trim()
Write-Host "✓ Contract deployed! Contract ID: $contractId" -ForegroundColor Green

# 7. Initialize contract with Native Token (XLM)
Write-Host "⚙️ Initializing contract on-chain..." -ForegroundColor Gray
# Testnet Native XLM Token Address
$nativeTokenAddress = "CDLZFC3SYJYDZT7K67VZ75HPJGWAM3QFA2J7NHM3F5N2W67N4XAN4MTT"

stellar contract invoke `
  --id $contractId `
  --source deployer `
  --network testnet `
  -- `
  initialize `
  --token_address $nativeTokenAddress

Write-Host "✓ Contract initialized with Native Token address." -ForegroundColor Green

# 8. Update environment configuration file
Write-Host "📝 Updating environment variables..." -ForegroundColor Gray
$envContent = "VITE_CONTRACT_ID=$contractId"
Set-Content -Path ".env" -Value $envContent
Write-Host "✓ .env updated with: VITE_CONTRACT_ID=$contractId" -ForegroundColor Green

Write-Host "`n🎉 Automated deployment finished! Start your dev server to see the live app:" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host "`nStellar Explorer Contract link:" -ForegroundColor Gray
Write-Host "   https://stellar.expert/explorer/testnet/contract/$contractId" -ForegroundColor Cyan
