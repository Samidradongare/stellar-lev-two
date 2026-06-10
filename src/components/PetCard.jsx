import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from './WalletContext';
import { getDonationHistory } from '../utils/contractClient';
import DonateModal from './DonateModal';
import AdoptionModal from './AdoptionModal';
import { Heart, Calendar, User, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

// Sub-component for animating donation count using requestAnimationFrame
function AnimatedCounter({ value }) {
  const [displayVal, setDisplayVal] = useState(0);
  const prevValRef = useRef(0);

  useEffect(() => {
    const startVal = prevValRef.current;
    const endVal = parseFloat(value || '0');
    if (startVal === endVal) {
      setDisplayVal(endVal);
      return;
    }

    const duration = 800; // 800ms
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutQuad formula
      const easeProgress = progress * (2 - progress);
      const currentVal = startVal + (endVal - startVal) * easeProgress;
      
      setDisplayVal(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValRef.current = endVal;
        setDisplayVal(endVal);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      prevValRef.current = endVal;
    };
  }, [value]);

  return <span className="font-bold tabular-nums">{displayVal.toFixed(2)} XLM</span>;
}

/**
 * PetCard Component
 * Displays pet photo, description, interactive counters, collapsible history, and action buttons.
 * @param {Object} props
 * @param {Object} props.pet - Pet object details
 * @param {Function} props.onUpdate - Callback to trigger refresh on list parent
 */
export default function PetCard({ pet, onUpdate }) {
  const { publicKey } = useWallet();
  const [descExpanded, setDescExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Modals state
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showAdoptModal, setShowAdoptModal] = useState(false);

  // Check if current connected user is the shelter for this pet
  const isShelter = publicKey && publicKey.toUpperCase() === pet.shelter_address.toUpperCase();

  const handleToggleHistory = async () => {
    if (!showHistory) {
      try {
        setLoadingHistory(true);
        const data = await getDonationHistory(pet.id);
        setHistory(data.slice(0, 5)); // show last 5
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
    setShowHistory(!showHistory);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const truncateKey = (key) => {
    if (!key) return '';
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
  };

  return (
    <div className="flex flex-col bg-white rounded-3xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative group">
      
      {/* Photo Container */}
      <div className="h-[200px] w-full relative overflow-hidden bg-slate-100">
        <img
          src={pet.photo_url}
          alt={pet.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            pet.is_adopted ? 'grayscale opacity-75' : ''
          }`}
        />
        {/* Status Badge */}
        <div className="absolute top-4 left-4 z-10">
          {pet.is_adopted ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-600 text-white shadow-sm">
              Adopted ✓
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-sm">
              Available
            </span>
          )}
        </div>
      </div>

      {/* Details Body */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">{pet.name}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {pet.breed} &bull; {pet.age} {pet.age === 1 ? 'year' : 'years'} old
              </p>
            </div>
            
            {/* Donation Counter Display */}
            <div className="text-right flex flex-col">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Donations</span>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-1 justify-end">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <AnimatedCounter value={pet.donation_total} />
              </div>
            </div>
          </div>

          {/* Description Paragraph (Truncated) */}
          <div className="mt-3 text-sm text-slate-600 leading-relaxed">
            <p>
              {descExpanded ? pet.description : `${pet.description.slice(0, 85)}${pet.description.length > 85 ? '...' : ''}`}
              {pet.description.length > 85 && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 ml-1.5 focus:outline-none"
                  aria-label={descExpanded ? 'Collapse description' : 'Expand description'}
                >
                  {descExpanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </p>
          </div>

          {/* Adopted Details Section */}
          {pet.is_adopted && (
            <div className="mt-4 p-3 bg-purple-50 rounded-2xl border border-purple-100/50 text-xs text-purple-800 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">Adopter:</span>
                <span className="font-mono font-bold select-all" title={pet.adopted_by}>{truncateKey(pet.adopted_by)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date:</span>
                <span>{formatDate(pet.adoption_date)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="mt-6 space-y-3">
          {/* Main Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowDonateModal(true)}
              disabled={pet.is_adopted}
              aria-label={`Donate to ${pet.name}`}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed hover:shadow active:scale-[0.98]"
            >
              <Heart className="w-4.5 h-4.5 fill-current" />
              Donate ♥
            </button>

            {isShelter && !pet.is_adopted && (
              <button
                onClick={() => setShowAdoptModal(true)}
                aria-label={`Mark ${pet.name} as adopted`}
                className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-sm hover:shadow active:scale-[0.98]"
              >
                Mark as Adopted
              </button>
            )}
          </div>

          {/* Donation History Collapsible Toggle */}
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={handleToggleHistory}
              className="w-full flex justify-between items-center text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors py-1 focus:outline-none"
              aria-expanded={showHistory}
              aria-label="Toggle donation history"
            >
              <span>Recent Donors</span>
              {showHistory ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {showHistory && (
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1 animate-slide-up">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-4 text-slate-400 text-xs gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-3 text-slate-400 text-xs">
                    No donations yet. Be the first!
                  </div>
                ) : (
                  history.map((record, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <span className="font-mono text-slate-600" title={record.donor}>
                        {truncateKey(record.donor)}
                      </span>
                      <span className="font-bold text-slate-700">{record.amount} XLM</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render Modals when triggered */}
      {showDonateModal && (
        <DonateModal
          pet={pet}
          onClose={() => setShowDonateModal(false)}
          onSuccess={() => {
            setShowDonateModal(false);
            onUpdate();
          }}
        />
      )}

      {showAdoptModal && (
        <AdoptionModal
          pet={pet}
          onClose={() => setShowAdoptModal(false)}
          onSuccess={() => {
            setShowAdoptModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
