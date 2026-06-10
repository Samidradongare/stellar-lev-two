import { useEffect, useRef } from 'react';
import { rpc, scValToNative } from '@stellar/stellar-sdk';
import { CONTRACT_ID, RPC_URL } from '../utils/constants';

const isMockMode = CONTRACT_ID === 'YOUR_CONTRACT_ID_HERE' || !CONTRACT_ID;

/**
 * Custom React hook that polls for Soroban pet adoption tracker events.
 * @param {Object} params
 * @param {Function} params.onDonation - Callback when a donation is made
 * @param {Function} params.onAdoption - Callback when a pet is adopted
 */
export function usePetEvents({ onDonation, onAdoption }) {
  const lastLedgerRef = useRef(null);

  useEffect(() => {
    if (isMockMode) {
      // In mock/demo mode, listen to custom events dispatched locally by contractClient.js
      const handleMockDonation = (event) => {
        if (onDonation && event.detail) {
          onDonation(event.detail);
        }
      };

      const handleMockAdoption = (event) => {
        if (onAdoption && event.detail) {
          onAdoption(event.detail);
        }
      };

      window.addEventListener('stellar-donation-event', handleMockDonation);
      window.addEventListener('stellar-adoption-event', handleMockAdoption);

      return () => {
        window.removeEventListener('stellar-donation-event', handleMockDonation);
        window.removeEventListener('stellar-adoption-event', handleMockAdoption);
      };
    }

    // Live Mode Event Polling
    const server = new rpc.Server(RPC_URL);
    let intervalId = null;

    const initLedger = async () => {
      try {
        const latest = await server.getLatestLedger();
        lastLedgerRef.current = latest.sequence;
      } catch (err) {
        console.warn('Failed to retrieve initial ledger sequence, defaulting to recent ledger:', err);
        lastLedgerRef.current = 100000; // safe fallback number if ledger API fails
      }
    };

    const poll = async () => {
      if (!lastLedgerRef.current) return;
      try {
        const eventsResponse = await server.getEvents({
          startLedger: lastLedgerRef.current,
          filters: [
            {
              type: 'contract',
              contractIds: [CONTRACT_ID]
            }
          ],
          limit: 50
        });

        if (eventsResponse && eventsResponse.events && eventsResponse.events.length > 0) {
          for (const ev of eventsResponse.events) {
            // Extract the event name from topics
            let eventName = '';
            try {
              if (ev.topic && ev.topic.length > 0) {
                const firstTopic = scValToNative(ev.topic[0]);
                eventName = String(firstTopic);
              }
            } catch (err) {
              console.error('Failed to parse event topic:', err);
            }

            // Parse values based on event types
            try {
              const val = scValToNative(ev.value);
              if (eventName === 'donation_received' || eventName === 'donation') {
                if (onDonation) {
                  onDonation({
                    petId: Number(val.pet_id),
                    donor: val.donor,
                    amount: Number(val.amount) / 10000000 // Convert stroops to XLM
                  });
                }
              } else if (eventName === 'pet_adopted' || eventName === 'adoption') {
                if (onAdoption) {
                  onAdoption({
                    petId: Number(val.pet_id),
                    newOwner: val.adopter,
                    date: Number(val.adoption_date)
                  });
                }
              }
            } catch (err) {
              console.error('Failed to parse event value payload:', err);
            }
          }

          // Move the pointer to the latest ledger processed
          if (eventsResponse.latestLedger) {
            lastLedgerRef.current = eventsResponse.latestLedger;
          }
        }
      } catch (error) {
        console.error('Error polling contract events from RPC:', error);
      }
    };

    initLedger().then(() => {
      intervalId = setInterval(poll, 5000);
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [onDonation, onAdoption]);
}
