import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from './WalletContext';
import { donateToPet } from '../utils/contractClient';
import TransactionStatus from './TransactionStatus';
import { X, AlertTriangle, Wallet } from 'lucide-react';
import { HORIZON_URL } from '../utils/constants';

/**
 * DonateModal Component
 * Modal overlay containing amount selector, validation, wallet info, and txn tracker.
 * @param {Object} props
 * @param {Object} props.pet - Pet object
 * @param {Function} props.onClose - Close action
 * @param {Function} props.onSuccess - Action on success
 */
export default function DonateModal({ pet, onClose, onSuccess }) {
  const { publicKey, balance, signFn, refreshBalance } = useWallet();
  const [amount, setAmount] = useState('5');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const modalRef = useRef(null);

  // Focus trapping and Esc key listener
  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll('button, input');
      if (focusable.length > 0) focusable[1]?.focus(); // focus amount input or first button
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validateAndSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Wallet not connected error
    if (!publicKey) {
      setError('No wallet connected. Please connect Freighter, xBull, or Albedo first.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1 || numAmount > 1000) {
      setError('Donation amount must be between 1 and 1000 XLM.');
      return;
    }

    setSubmitting(true);

    try {
      // 2. Fetch fresh balance to check insufficient funds
      let latestBalance = 0;
      try {
        const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
        if (res.status === 404) {
          throw new Error('Unfunded');
        }
        if (res.ok) {
          const data = await res.json();
          const native = data.balances.find(b => b.asset_type === 'native');
          latestBalance = native ? parseFloat(native.balance) : 0;
        }
      } catch (err) {
        latestBalance = parseFloat(balance || '0');
      }

      // Check balance: require amount + a small network fee buffer (0.1 XLM)
      if (latestBalance < (numAmount + 0.1)) {
        setError(`Insufficient XLM balance. You need at least ${numAmount} XLM plus fees.`);
        setSubmitting(false);
        return;
      }

      // 3. Build & sign
      const result = await donateToPet(pet.id, amount, publicKey, signFn);
      
      if (!result.success) {
        // If contractClient returned failure, see if transaction was rejected
        if (result.error?.includes('reject') || result.error?.includes('cancel') || result.error?.includes('User declined')) {
          setError('Transaction was rejected. Please approve the transaction in your wallet.');
        } else {
          setError(result.error || 'Transaction failed. Please try again.');
        }
        setSubmitting(false);
      } else {
        setTxHash(result.hash);
      }
    } catch (err) {
      console.error('Donation submission error:', err);
      // Catch when signTransaction throws or user cancels
      if (err.message?.includes('User declined') || err.message?.includes('reject') || err.message?.includes('cancel')) {
        setError('Transaction was rejected. Please approve the transaction in your wallet.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      setSubmitting(false);
    }
  };

  const handleTransactionComplete = () => {
    refreshBalance();
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden animate-slide-up flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="relative flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <img
              src={pet.photo_url}
              alt={pet.name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-slate-800">Donate to {pet.name}</h2>
              <p className="text-xs text-slate-500 font-medium">Support {pet.breed}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-medium animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!txHash ? (
            <form onSubmit={validateAndSubmit} className="space-y-4">
              {/* Wallet Info */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                <div className="flex items-center gap-1.5 font-medium">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span>Wallet Balance:</span>
                </div>
                <span className="font-bold text-slate-700 font-mono">
                  {publicKey ? `${balance || '0.0000'} XLM` : 'Not Connected'}
                </span>
              </div>

              {/* Amount Inputs */}
              <div>
                <label htmlFor="donation-amount" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Donation Amount (XLM)
                </label>
                <div className="relative">
                  <input
                    id="donation-amount"
                    type="number"
                    min="1"
                    max="1000"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-4 pr-16 py-3.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-emerald-500 rounded-2xl text-base font-bold text-slate-800 transition-all duration-200 focus:outline-none"
                    placeholder="Enter amount"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    XLM
                  </span>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {['1', '5', '10', '25'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    disabled={submitting}
                    aria-label={`Select ${val} XLM`}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all duration-200 ${
                      amount === val
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {val} XLM
                  </button>
                ))}
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={submitting}
                aria-label="Confirm Donation"
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Preparing Transaction...
                  </>
                ) : (
                  'Confirm Donation'
                )}
              </button>
            </form>
          ) : (
            <div className="pt-2 animate-slide-up">
              <TransactionStatus hash={txHash} onComplete={handleTransactionComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
