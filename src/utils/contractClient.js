import { rpc, Contract, TransactionBuilder, Horizon, BASE_FEE, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk';
import { CONTRACT_ID, HORIZON_URL, RPC_URL, NETWORK_PASSPHRASE, MOCK_PETS } from './constants';

const isMockMode = CONTRACT_ID === 'YOUR_CONTRACT_ID_HERE' || !CONTRACT_ID;

// Helper to initialize local storage mock data
function initMockData() {
  if (!localStorage.getItem('stellar_pets')) {
    localStorage.setItem('stellar_pets', JSON.stringify(MOCK_PETS));
  }
}

/**
 * Fetches all pets.
 * Falls back to MOCK_PETS from local storage on error or in mock mode.
 * @returns {Promise<Array>}
 */
export async function getAllPets() {
  initMockData();
  if (isMockMode) {
    return JSON.parse(localStorage.getItem('stellar_pets'));
  }

  try {
    const server = new rpc.Server(RPC_URL);
    const contract = new Contract(CONTRACT_ID);
    
    // Simulate with a dummy account
    const dummyAccount = new Horizon.Server(HORIZON_URL)
      .loadAccount('GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZAOS0CFD74VRMH1A')
      .catch(() => {
        // Return a mock sequence object if Horizon call fails or account doesn't exist
        return {
          sequenceNumber: () => '0',
          sequence: '0',
          accountId: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZAOS0CFD74VRMH1A'
        };
      });

    const account = await dummyAccount;
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(contract.call('get_all_pets'))
    .setTimeout(30)
    .build();

    const sim = await server.simulateTransaction(tx);
    if (sim.error) throw new Error(sim.error);
    if (!sim.results || sim.results.length === 0) throw new Error('No simulation results');
    
    const resultVal = xdr.ScVal.fromXDR(sim.results[0].xdr, 'base64');
    const nativeVal = scValToNative(resultVal);

    // Format native contract Pet structure into UI shape
    return nativeVal.map(pet => ({
      id: Number(pet.id),
      name: pet.name,
      breed: pet.breed,
      age: Number(pet.age),
      description: pet.description,
      photo_url: pet.photo_url,
      shelter_address: pet.shelter_address,
      donation_total: (Number(pet.donation_total) / 10000000).toString(),
      is_adopted: pet.is_adopted,
      adopted_by: pet.adopted_by || null,
      adoption_date: pet.adoption_date ? Number(pet.adoption_date) : null
    }));
  } catch (error) {
    console.warn('getAllPets failed, falling back to mock data:', error);
    return JSON.parse(localStorage.getItem('stellar_pets'));
  }
}

/**
 * Fetches a single pet by ID.
 * @param {number|string} petId
 * @returns {Promise<Object>}
 */
export async function getPet(petId) {
  initMockData();
  const pets = await getAllPets();
  const pet = pets.find(p => p.id === Number(petId));
  if (!pet) throw new Error(`Pet with ID ${petId} not found`);
  return pet;
}

/**
 * Submits a donation transaction to Soroban or simulates it in mock mode.
 * @param {number|string} petId
 * @param {string|number} amountInXlm
 * @param {string} senderPublicKey
 * @param {Function} signFn
 * @returns {Promise<{ success: boolean, hash?: string, error?: string }>}
 */
export async function donateToPet(petId, amountInXlm, senderPublicKey, signFn) {
  initMockData();
  if (isMockMode) {
    try {
      // Simulate network latency
      await new Promise(r => setTimeout(r, 2000));
      const pets = JSON.parse(localStorage.getItem('stellar_pets'));
      const petIndex = pets.findIndex(p => p.id === Number(petId));
      if (petIndex === -1) throw new Error('Pet not found');

      const updatedPets = [...pets];
      const prevTotal = parseFloat(updatedPets[petIndex].donation_total || '0');
      updatedPets[petIndex].donation_total = (prevTotal + parseFloat(amountInXlm)).toFixed(2);
      localStorage.setItem('stellar_pets', JSON.stringify(updatedPets));

      // Append to donation history
      const historyKey = `stellar_donation_history_${petId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      history.unshift({
        donor: senderPublicKey,
        amount: parseFloat(amountInXlm).toFixed(2),
        timestamp: Math.floor(Date.now() / 1000)
      });
      localStorage.setItem(historyKey, JSON.stringify(history));

      // Dispatch a storage event so other components or tabs receive the update
      window.dispatchEvent(new CustomEvent('stellar-donation-event', {
        detail: { petId: Number(petId), donor: senderPublicKey, amount: parseFloat(amountInXlm) }
      }));

      return { success: true, hash: 'mock_tx_' + Math.random().toString(36).substring(2, 15) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  try {
    const server = new rpc.Server(RPC_URL);
    const horizon = new Horizon.Server(HORIZON_URL);
    
    // 1. Fetch account sequence
    const account = await horizon.loadAccount(senderPublicKey);
    
    // 2. Build donation transaction (1 XLM = 10,000,000 Stroops)
    const amountStroops = BigInt(Math.round(parseFloat(amountInXlm) * 10000000));
    const contract = new Contract(CONTRACT_ID);
    
    const args = [
      nativeToScVal(Number(petId), { type: 'u32' }),
      nativeToScVal(senderPublicKey, { type: 'address' }),
      nativeToScVal(amountStroops, { type: 'i128' })
    ];

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(contract.call('donate_pet', ...args))
    .setTimeout(30)
    .build();

    // 3. Prepare transaction (simulate, append footprint, adjust fees)
    tx = await server.prepareTransaction(tx);

    // 4. Sign transaction
    const signedXdr = await signFn(tx.toXDR());
    
    // 5. Submit to RPC
    const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
    if (response.status === 'ERROR') {
      throw new Error(response.errorResultXdr || 'Transaction submission failed');
    }

    return { success: true, hash: response.hash };
  } catch (error) {
    console.error('donateToPet failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Marks a pet as adopted.
 * @param {number|string} petId
 * @param {string} adopterAddress
 * @param {string} shelterPublicKey
 * @param {Function} signFn
 * @returns {Promise<{ success: boolean, hash?: string, error?: string }>}
 */
export async function markPetAdopted(petId, adopterAddress, shelterPublicKey, signFn) {
  initMockData();
  if (isMockMode) {
    try {
      await new Promise(r => setTimeout(r, 2000));
      const pets = JSON.parse(localStorage.getItem('stellar_pets'));
      const petIndex = pets.findIndex(p => p.id === Number(petId));
      if (petIndex === -1) throw new Error('Pet not found');

      const updatedPets = [...pets];
      updatedPets[petIndex].is_adopted = true;
      updatedPets[petIndex].adopted_by = adopterAddress;
      updatedPets[petIndex].adoption_date = Math.floor(Date.now() / 1000);
      localStorage.setItem('stellar_pets', JSON.stringify(updatedPets));

      window.dispatchEvent(new CustomEvent('stellar-adoption-event', {
        detail: { petId: Number(petId), newOwner: adopterAddress, date: Math.floor(Date.now() / 1000) }
      }));

      return { success: true, hash: 'mock_tx_' + Math.random().toString(36).substring(2, 15) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  try {
    const server = new rpc.Server(RPC_URL);
    const horizon = new Horizon.Server(HORIZON_URL);
    
    const account = await horizon.loadAccount(shelterPublicKey);
    const contract = new Contract(CONTRACT_ID);
    
    const args = [
      nativeToScVal(Number(petId), { type: 'u32' }),
      nativeToScVal(adopterAddress, { type: 'address' }),
      nativeToScVal(shelterPublicKey, { type: 'address' })
    ];

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(contract.call('adopt_pet', ...args))
    .setTimeout(30)
    .build();

    tx = await server.prepareTransaction(tx);
    const signedXdr = await signFn(tx.toXDR());
    
    const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
    if (response.status === 'ERROR') {
      throw new Error(response.errorResultXdr || 'Transaction submission failed');
    }

    return { success: true, hash: response.hash };
  } catch (error) {
    console.error('markPetAdopted failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Fetches donation history for a specific pet.
 * @param {number|string} petId
 * @returns {Promise<Array>}
 */
export async function getDonationHistory(petId) {
  initMockData();
  if (isMockMode) {
    const historyKey = `stellar_donation_history_${petId}`;
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  }

  try {
    const server = new rpc.Server(RPC_URL);
    const contract = new Contract(CONTRACT_ID);
    
    const dummyAccount = await new Horizon.Server(HORIZON_URL)
      .loadAccount('GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZAOS0CFD74VRMH1A')
      .catch(() => ({
        sequenceNumber: () => '0',
        sequence: '0',
        accountId: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZAOS0CFD74VRMH1A'
      }));

    const tx = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(contract.call('get_donation_history', nativeToScVal(Number(petId), { type: 'u32' })))
    .setTimeout(30)
    .build();

    const sim = await server.simulateTransaction(tx);
    if (sim.error) throw new Error(sim.error);
    if (!sim.results || sim.results.length === 0) throw new Error('No simulation results');
    
    const resultVal = xdr.ScVal.fromXDR(sim.results[0].xdr, 'base64');
    const nativeVal = scValToNative(resultVal);

    return nativeVal.map(record => ({
      donor: record.donor,
      amount: (Number(record.amount) / 10000000).toString(),
      timestamp: Number(record.timestamp)
    }));
  } catch (error) {
    console.warn(`getDonationHistory failed for pet ${petId}, using mock:`, error);
    const historyKey = `stellar_donation_history_${petId}`;
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  }
}
