import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { HORIZON_URL } from '../utils/constants';

/**
 * TransactionStatus Component
 * Displays progress spinner, success checkmark, or error symbol by polling Horizon Testnet.
 * @param {Object} props
 * @param {string} props.hash - Transaction Hash
 * @param {Function} props.onComplete - Success callback
 */
export default function TransactionStatus({ hash, onComplete }) {
  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'fail'
  const [errorMsg, setErrorMsg] = useState(null);

  const truncateHash = (str) => {
    if (!str) return '';
    return `${str.slice(0, 8)}...${str.slice(-8)}`;
  };

  useEffect(() => {
    if (!hash) return;

    // Demo Mode: Mock transaction simulation
    if (hash.startsWith('mock_tx_')) {
      const timer = setTimeout(() => {
        setStatus('success');
        if (onComplete) {
          // Delay call slightly to let the animation show
          setTimeout(onComplete, 800);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Live Mode: Poll Horizon
    let isMounted = true;
    let timeoutId = null;

    const checkTransaction = async () => {
      try {
        const response = await fetch(`${HORIZON_URL}/transactions/${hash}`);
        
        if (response.status === 200) {
          const data = await response.json();
          if (data.successful) {
            if (isMounted) {
              setStatus('success');
              if (onComplete) {
                setTimeout(onComplete, 800);
              }
            }
            return; // Stop polling
          } else {
            if (isMounted) {
              setStatus('fail');
              setErrorMsg('Transaction was unsuccessful on-chain.');
            }
            return; // Stop polling
          }
        } else if (response.status === 404) {
          // 404 means Horizon hasn't seen it yet (pending)
          // Keep polling
        } else {
          // Other status codes indicate Horizon or network issues
          const data = await response.json().catch(() => ({}));
          if (isMounted) {
            setStatus('fail');
            setErrorMsg(data.title || 'An error occurred during submission.');
          }
          return; // Stop polling
        }
      } catch (err) {
        console.error('Error polling transaction:', err);
      }

      // Schedule next poll in 3 seconds
      if (isMounted) {
        timeoutId = setTimeout(checkTransaction, 3000);
      }
    };

    // Begin polling
    timeoutId = setTimeout(checkTransaction, 1000);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hash, onComplete]);

  return (
    <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col items-center text-center space-y-4 animate-slide-up">
      {status === 'pending' && (
        <>
          <div className="relative">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-700">TX</div>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-700">Transaction pending...</h4>
            <p className="text-[11px] font-mono text-slate-400 select-all" title={hash}>
              Hash: {truncateHash(hash)}
            </p>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="w-10 h-10 text-emerald-600 stroke-[2] animate-pulse-ring rounded-full" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-800">Transaction confirmed!</h4>
            <p className="text-[11px] text-slate-400">Ledger validation complete</p>
          </div>
          {hash && !hash.startsWith('mock_tx_') && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              View on Explorer
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </>
      )}

      {status === 'fail' && (
        <>
          <XCircle className="w-10 h-10 text-rose-600 stroke-[2]" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-800">Transaction failed</h4>
            <p className="text-xs text-rose-600/85 font-medium">{errorMsg || 'An error occurred.'}</p>
          </div>
          {hash && !hash.startsWith('mock_tx_') && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-colors"
            >
              View details on Explorer
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </>
      )}
    </div>
  );
}
