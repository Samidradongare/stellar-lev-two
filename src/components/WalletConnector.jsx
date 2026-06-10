import React from 'react';
import { useWallet } from './WalletContext';
import { FREIGHTER_ID, XBULL_ID, ALBEDO_ID } from '@creit.tech/stellar-wallets-kit';
import { Shield, Puzzle, Flame, Wallet, LogOut, Check } from 'lucide-react';

/**
 * WalletConnector Component
 * Shows connection cards for Freighter, xBull, and Albedo wallets.
 * Once connected, shows active account status.
 */
export default function WalletConnector() {
  const { publicKey, walletId, isConnecting, connectWallet, disconnectWallet } = useWallet();

  const truncateKey = (key) => {
    if (!key) return '';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const wallets = [
    {
      id: FREIGHTER_ID,
      name: 'Freighter',
      description: 'Stellar browser extension wallet',
      color: 'from-blue-500/10 to-indigo-500/10 hover:border-blue-400',
      iconColor: 'text-blue-500',
      icon: <Puzzle className="w-8 h-8" aria-hidden="true" />,
    },
    {
      id: XBULL_ID,
      name: 'xBull',
      description: 'Powerful multi-platform wallet',
      color: 'from-orange-500/10 to-red-500/10 hover:border-orange-400',
      iconColor: 'text-orange-600',
      icon: <Flame className="w-8 h-8" aria-hidden="true" />,
    },
    {
      id: ALBEDO_ID,
      name: 'Albedo',
      description: 'Web-based single sign-on wallet',
      color: 'from-purple-500/10 to-pink-500/10 hover:border-purple-400',
      iconColor: 'text-purple-600',
      icon: <Shield className="w-8 h-8" aria-hidden="true" />,
    },
  ];

  if (publicKey) {
    const activeWallet = wallets.find(w => w.id === walletId) || { name: 'Connected Wallet', icon: <Wallet className="w-6 h-6" /> };
    return (
      <div className="flex items-center gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm animate-slide-up">
        <div className={`p-2 rounded-xl bg-slate-100 ${activeWallet.iconColor || 'text-slate-600'}`}>
          {activeWallet.icon}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{activeWallet.name}</span>
          <span className="text-sm font-mono font-bold text-slate-700 select-all" title={publicKey}>
            {truncateKey(publicKey)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="ml-2 p-2 bg-rose-50 text-rose-600 hover:bg-rose-100/80 hover:text-rose-700 transition-colors duration-250 rounded-xl"
          aria-label="Disconnect wallet"
          title="Disconnect Wallet"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {wallets.map((wallet) => (
        <div
          key={wallet.id}
          className={`relative flex flex-col justify-between p-5 rounded-3xl border border-slate-200/80 bg-gradient-to-br ${wallet.color} transition-all duration-300 shadow-sm hover:shadow-md group`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl bg-white shadow-sm border border-slate-100 ${wallet.iconColor}`}>
              {wallet.icon}
            </div>
            {isConnecting && walletId === wallet.id && (
              <span className="inline-flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight group-hover:text-slate-900 transition-colors">
              {wallet.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              {wallet.description}
            </p>
            <button
              onClick={() => connectWallet(wallet.id)}
              disabled={isConnecting}
              aria-label={`Connect using ${wallet.name}`}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-800 font-semibold text-sm border border-slate-200 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
            >
              {isConnecting && walletId === wallet.id ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
