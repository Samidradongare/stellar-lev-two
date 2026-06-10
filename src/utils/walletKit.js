import { StellarWalletsKit, WalletNetwork, FREIGHTER_ID, XBULL_ID, ALBEDO_ID } from '@creit.tech/stellar-wallets-kit';

export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: await import('@creit.tech/stellar-wallets-kit').then(m => [
    new m.FreighterModule(),
    new m.xBullModule(),
    new m.AlbedoModule(),
  ])
});

let activePublicKey = null;

/**
 * Connects to a specific wallet.
 * @param {string} walletId
 * @returns {Promise<{ publicKey: string }>}
 */
export async function connectWallet(walletId) {
  try {
    kit.setWallet(walletId);
    const { address } = await kit.getAddress();
    activePublicKey = address;
    return { publicKey: address };
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
}

/**
 * Disconnects the wallet by clearing local state.
 * @returns {Promise<{ success: boolean }>}
 */
export async function disconnectWallet() {
  activePublicKey = null;
  return { success: true };
}

/**
 * Signs a transaction XDR using the connected wallet.
 * @param {string} xdr
 * @returns {Promise<string>} signed XDR
 */
export async function signTransaction(xdr) {
  try {
    const { signedTxXdr } = await kit.sign({
      xdr,
    });
    return signedTxXdr;
  } catch (error) {
    console.error('Wallet signing error:', error);
    throw error;
  }
}

/**
 * Gets the current connected public key.
 * @returns {Promise<string|null>}
 */
export async function getPublicKey() {
  if (activePublicKey) return activePublicKey;
  try {
    const { address } = await kit.getAddress();
    activePublicKey = address;
    return address;
  } catch (e) {
    return null;
  }
}
