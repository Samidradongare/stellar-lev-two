export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'YOUR_CONTRACT_ID_HERE';

// Mock pet data for demo (used when contract is not yet deployed)
export const MOCK_PETS = [
  {
    id: 1,
    name: 'Luna',
    breed: 'Golden Retriever',
    age: 2,
    description: 'Friendly and loves to play fetch. Great with kids!',
    photo_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
    shelter_address: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZAOS0CFD74VRMH1A',
    donation_total: '15.5',
    is_adopted: false,
    adopted_by: null,
    adoption_date: null
  },
  {
    id: 2,
    name: 'Max',
    breed: 'German Shepherd',
    age: 3,
    description: 'Loyal, intelligent, and well-trained. Perfect guard dog.',
    photo_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400',
    shelter_address: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZAOS0CFD74VRMH1A',
    donation_total: '8.2',
    is_adopted: false,
    adopted_by: null,
    adoption_date: null
  },
  {
    id: 3,
    name: 'Bella',
    breed: 'Persian Cat',
    age: 1,
    description: 'Quiet, affectionate, and loves to cuddle. Indoor cat.',
    photo_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
    shelter_address: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZAOS0CFD74VRMH1A',
    donation_total: '22.0',
    is_adopted: true,
    adopted_by: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    adoption_date: 1749513600
  }
];
