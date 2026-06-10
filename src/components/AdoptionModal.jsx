import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from './WalletContext';
import { markPetAdopted } from '../utils/contractClient';
import TransactionStatus from './TransactionStatus';
import { StrKey } from '@stellar/stellar-sdk';
import { X, AlertTriangle, CheckCircle, ExternalLink, Calendar, User, HeartHandshake } from 'lucide-react';

/**
 * AdoptionModal Component
 * Allows shelters to register pet adoptions on-chain, and tracks transaction receipts.
 * @param {Object} props
 * @param {Object} props.pet - Pet object
 * @param {Function} props.onClose - Close action
 * @param {Function} props.onSuccess - Action on success
 */
export default function AdoptionModal({ pet, onClose, onSuccess }) {
  const { publicKey, signFn, refreshBalance } = useWallet();
  const [adopterAddress, setAdopterAddress] = useState('');
  const [adopterName, setAdopterName] = useState(''); // display only
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [adoptionComplete, setAdoptionComplete] = useState(false);

  const modalRef = useRef(null);

  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll('button, input');
      if (focusable.length > 0) focusable[1]?.focus(); // focus address input
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

    // Validate Adopter Address using SDK
    let isValid = false;
    try {
      isValid = StrKey.isValidEd25519PublicKey(adopterAddress);
    } catch (err) {
      isValid = false;
    }

    if (!isValid) {
      setError("Invalid Stellar address. Must start with 'G' and contain 56 characters.");
      return;
    }

    if (!adopterName.trim()) {
      setError("Please specify the adopter's name.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await markPetAdopted(pet.id, adopterAddress, publicKey, signFn);
      
      if (!result.success) {
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
      console.error('Adoption registration error:', err);
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
    setAdoptionComplete(true);
  };

  const truncateKey = (key) => {
    if (!key) return '';
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
  };

  const handleFinished = () => {
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden animate-slide-up flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adopt-modal-title"
      >
        {/* Header */}
        <div className="relative flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-6 h-6 text-purple-600" />
            <div>
              <h2 id="adopt-modal-title" className="text-lg font-bold text-slate-800">Finalize Adoption</h2>
              <p className="text-xs text-slate-500 font-medium">Marking {pet.name} as adopted</p>
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
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-medium animate-shake animate-duration-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!txHash && (
            <form onSubmit={validateAndSubmit} className="space-y-4">
              {/* Adopter Name (Display Only / local metadata) */}
              <div>
                <label htmlFor="adopter-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Adopter's Name
                </label>
                <input
                  id="adopter-name"
                  type="text"
                  value={adopterName}
                  onChange={(e) => setAdopterName(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-purple-500 rounded-2xl text-sm font-semibold text-slate-800 transition-all duration-200 focus:outline-none"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              {/* Adopter Stellar Address (On-chain) */}
              <div>
                <label htmlFor="adopter-address" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Adopter's Stellar Public Address
                </label>
                <input
                  id="adopter-address"
                  type="text"
                  value={adopterAddress}
                  onChange={(e) => setAdopterAddress(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-purple-500 rounded-2xl text-sm font-mono font-medium text-slate-800 transition-all duration-200 focus:outline-none placeholder:font-sans placeholder:text-slate-400"
                  placeholder="G..."
                  required
                />
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={submitting}
                aria-label="Confirm Adoption"
                className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing Transaction...
                  </>
                ) : (
                  'Confirm Adoption'
                )}
              </button>
            </form>
          )}

          {txHash && !adoptionComplete && (
            <div className="pt-2 animate-slide-up">
              <TransactionStatus hash={txHash} onComplete={handleTransactionComplete} />
            </div>
          )}

          {adoptionComplete && (
            <div className="text-center py-4 space-y-5 animate-slide-up">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <CheckCircle className="w-10 h-10 stroke-[2]" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-800">
                  🎉 {pet.name} Has Been Adopted!
                </h3>
                <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
                  Adoption Registered On-Chain
                </p>
              </div>

              <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs text-slate-600 text-left space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">New Owner:</span>
                  <span className="font-mono font-bold text-slate-800 select-all" title={adopterAddress}>
                    {truncateKey(adopterAddress)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Adopter Name:</span>
                  <span className="font-bold text-slate-800">{adopterName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Adoption Date:</span>
                  <span className="font-bold text-slate-800">
                    {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-purple-100/50 pt-2.5">
                  <span className="font-semibold text-slate-500">NFT Metadata:</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold tracking-tight">
                    Adopted ✓
                  </span>
                </div>
              </div>

              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline transition-colors mt-2"
              >
                View Transaction on Explorer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleFinished}
                aria-label="Done"
                className="w-full mt-4 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
              >
                Close Receipt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
