import React, { useState, useEffect } from 'react';
import { getAllPets } from '../utils/contractClient';
import PetCard from './PetCard';
import { usePetEvents } from '../hooks/usePetEvents';
import { useWallet } from './WalletContext';
import { Rabbit, Search } from 'lucide-react';

/**
 * PetList Component
 * Fetches all pets, handles filter state, displays a premium shimmer loading state,
 * and updates listing state reactively on real-time donation/adoption contract events.
 * @param {Object} props
 * @param {string} props.filter - Filter mode: 'all' | 'available' | 'adopted'
 */
export default function PetList({ filter }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useWallet();

  // Fetch pets from smart contract / mock database
  const fetchPets = async () => {
    try {
      setLoading(true);
      const data = await getAllPets();
      setPets(data);
    } catch (error) {
      console.error('Failed to load pets:', error);
      addToast('Error loading pet directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  // Listen to real-time events on the ledger
  usePetEvents({
    onDonation: ({ petId, donor, amount }) => {
      setPets((prevPets) =>
        prevPets.map((pet) => {
          if (pet.id === Number(petId)) {
            const currentTotal = parseFloat(pet.donation_total || '0');
            return {
              ...pet,
              donation_total: (currentTotal + amount).toFixed(2),
            };
          }
          return pet;
        })
      );
    },
    onAdoption: ({ petId, newOwner, date }) => {
      setPets((prevPets) =>
        prevPets.map((pet) => {
          if (pet.id === Number(petId)) {
            return {
              ...pet,
              is_adopted: true,
              adopted_by: newOwner,
              adoption_date: date,
            };
          }
          return pet;
        })
      );
    },
  });

  const filteredPets = pets.filter((pet) => {
    if (filter === 'available') return !pet.is_adopted;
    if (filter === 'adopted') return pet.is_adopted;
    return true;
  });

  // Shimmer Card component for loading state
  const SkeletonCard = () => (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
      <div className="h-[200px] bg-slate-200" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-1/3 bg-slate-200 rounded-md" />
          <div className="h-4.5 w-1/4 bg-slate-200 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-200 rounded-md" />
          <div className="h-4 w-5/6 bg-slate-200 rounded-md" />
        </div>
        <div className="h-8 w-1/2 bg-slate-200 rounded-md" />
        <div className="h-11 w-full bg-slate-200 rounded-xl mt-6" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (filteredPets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-slate-200/70 shadow-sm w-full animate-slide-up">
        <div className="p-4 bg-cream-100 text-slate-400 rounded-full mb-4">
          <Rabbit className="w-12 h-12 stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">No Pets Found</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-sm">
          We couldn't find any pets matching this category. Please check back later or update your filter settings.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
      {filteredPets.map((pet) => (
        <PetCard key={pet.id} pet={pet} onUpdate={fetchPets} />
      ))}
    </div>
  );
}
