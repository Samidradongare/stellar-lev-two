import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { connectWallet as connectKit, disconnectWallet as disconnectKit, signTransaction, getPublicKey } from '../utils/walletKit';
import { HORIZON_URL } from '../utils/constants';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast Helpers
  const addToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch balance helper
  const fetchBalance = useCallback(async (address) => {
    if (!address) return;
    try {
      const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
      if (res.status === 404) {
        setBalance('0.0000');
        addToast('Connected! Your account is not yet funded on Testnet. Use Friendbot to fund it.', 'warning');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch account info');
      const data = await res.json();
      const nativeBalance = data.balances.find((b) => b.asset_type === 'native');
      if (nativeBalance) {
        setBalance(parseFloat(nativeBalance.balance).toFixed(4));
      } else {
        setBalance('0.0000');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0.0000');
    }
  }, [addToast]);

  // Connect wallet action
  const connect = async (id) => {
    setIsConnecting(true);
    try {
      const { publicKey: pubKey } = await connectKit(id);
      setPublicKey(pubKey);
      setWalletId(id);
      addToast(`Connected to ${id === 'freighter' ? 'Freighter' : id === 'xbull' ? 'xBull' : 'Albedo'}!`, 'success');
      await fetchBalance(pubKey);
    } catch (error) {
      console.error('Connection error:', error);
      addToast(error.message || 'Failed to connect wallet.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet action
  const disconnect = async () => {
    try {
      await disconnectKit();
      setPublicKey(null);
      setWalletId(null);
      setBalance(null);
      addToast('Wallet disconnected.', 'info');
    } catch (error) {
      addToast('Error disconnecting wallet.', 'error');
    }
  };

  // Refresh balance on demand or on mount
  useEffect(() => {
    if (publicKey) {
      fetchBalance(publicKey);
      const interval = setInterval(() => {
        fetchBalance(publicKey);
      }, 15000); // refresh every 15s
      return () => clearInterval(interval);
    }
  }, [publicKey, fetchBalance]);

  // Try auto-detecting wallet connection if public key is stored or available
  useEffect(() => {
    getPublicKey().then((pubKey) => {
      if (pubKey) {
        setPublicKey(pubKey);
        fetchBalance(pubKey);
      }
    }).catch(() => {});
  }, [fetchBalance]);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        walletId,
        balance,
        isConnecting,
        connectWallet: connect,
        disconnectWallet: disconnect,
        refreshBalance: () => fetchBalance(publicKey),
        signFn: signTransaction,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
