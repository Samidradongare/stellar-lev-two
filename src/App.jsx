import React, { useState } from 'react';
import { useWallet } from './components/WalletContext';
import WalletConnector from './components/WalletConnector';
import PetList from './components/PetList';
import { CONTRACT_ID } from './utils/constants';
import { Sparkles, Info, CheckCircle, AlertTriangle, AlertOctagon, Heart, Calendar } from 'lucide-react';

export default function App() {
  const { toasts, removeToast } = useWallet();
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'adopted'

  const isDemoMode = CONTRACT_ID === 'YOUR_CONTRACT_ID_HERE' || !CONTRACT_ID;

  const truncateContract = (cid) => {
    if (!cid || cid === 'YOUR_CONTRACT_ID_HERE') return 'Demo Mock Mode';
    return `${cid.slice(0, 8)}...${cid.slice(-8)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream-50/60 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-inner z-50">
          <AlertTriangle className="w-4 h-4" />
          <span>Running in demo mode — connect a real contract to go live</span>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-2xl shadow-inner">
            <Heart className="w-7 h-7 fill-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              🐾 Stellar Pet Adoption
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Decentralized Shelters Network
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex justify-end">
          <WalletConnector />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        <section className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            Find Your New Best Friend
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Connecting verified shelters with loving adopters on the Stellar Testnet. Donate XLM to pets to support their shelter expenses, or finalize their adoption on-chain.
          </p>
        </section>

        {/* Filters and Control Panel */}
        <div className="flex justify-center border-b border-slate-200/80 pb-4">
          <nav className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl" aria-label="Tabs">
            {[
              { id: 'all', name: 'All Pets' },
              { id: 'available', name: 'Available' },
              { id: 'adopted', name: 'Adopted' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                aria-label={`Show ${tab.name}`}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  filter === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Pet Listing */}
        <section className="pb-12">
          <PetList filter={filter} />
        </section>
      </main>

      {/* Global Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-semibold">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>Built on Stellar Testnet &copy; {new Date().getFullYear()}</span>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 font-mono text-[10px]">
            <span className="text-slate-400 uppercase">Contract ID:</span>
            <span className="text-slate-600 font-bold select-all">{truncateContract(CONTRACT_ID)}</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification Portal */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-xl border text-xs font-semibold flex justify-between items-start gap-3 animate-toast ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-800'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-100 text-amber-800'
                : 'bg-white border-slate-150 text-slate-700'
            }`}
          >
            <div className="flex gap-2">
              {toast.type === 'success' && <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <AlertOctagon className="w-4.5 h-4.5 text-rose-600 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4.5 h-4.5 text-blue-600 shrink-0" />}
              <span className="leading-tight">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs focus:outline-none shrink-0"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
