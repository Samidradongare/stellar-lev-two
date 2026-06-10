#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, symbol_short, Symbol};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Pet {
    pub id: u32,
    pub name: String,
    pub breed: String,
    pub age: u32,
    pub description: String,
    pub photo_url: String,
    pub shelter_address: Address,
    pub donation_total: i128,  // in stroops
    pub is_adopted: bool,
    pub adopted_by: Option<Address>,
    pub adoption_date: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct DonationRecord {
    pub donor: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Pet(u32),
    PetCount,
    DonationHistory(u32),
    TokenAddress,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    PetNotFound = 1,
    AlreadyAdopted = 2,
    InvalidAmount = 3,
    NotAuthorized = 4,
}

pub mod events {
    use super::*;

    pub fn donation_received(env: &Env, pet_id: u32, donor: Address, amount: i128) {
        env.events().publish(
            (Symbol::new(env, "donation_received"), pet_id),
            DonationRecord {
                donor,
                amount,
                timestamp: env.ledger().timestamp(),
            }
        );
    }

    pub fn pet_adopted(env: &Env, pet_id: u32, adopter: Address, adoption_date: u64) {
        env.events().publish(
            (Symbol::new(env, "pet_adopted"), pet_id),
            (adopter, adoption_date)
        );
    }

    pub fn pet_added(env: &Env, pet_id: u32, shelter: Address) {
        env.events().publish(
            (Symbol::new(env, "pet_added"), pet_id),
            shelter
        );
    }
}

#[contract]
pub struct PetAdoptionTrackerContract;

#[contractimpl]
impl PetAdoptionTrackerContract {
    /// Initializes the contract with the native token (XLM) address.
    pub fn initialize(env: Env, token_address: Address) {
        if env.storage().persistent().has(&DataKey::TokenAddress) {
            panic!("Already initialized");
        }
        env.storage().persistent().set(&DataKey::TokenAddress, &token_address);
    }

    /// Adds a new pet to the tracker directory.
    pub fn add_pet(
        env: Env,
        name: String,
        breed: String,
        age: u32,
        description: String,
        photo_url: String,
        shelter: Address,
    ) -> u32 {
        shelter.require_auth();

        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::PetCount)
            .unwrap_or(0);
        count += 1;

        let pet = Pet {
            id: count,
            name,
            breed,
            age,
            description,
            photo_url,
            shelter_address: shelter.clone(),
            donation_total: 0,
            is_adopted: false,
            adopted_by: None,
            adoption_date: None,
        };

        env.storage().persistent().set(&DataKey::Pet(count), &pet);
        env.storage().persistent().set(&DataKey::PetCount, &count);

        events::pet_added(&env, count, shelter);

        count
    }

    /// Submits a donation to support a specific pet.
    pub fn donate_pet(env: Env, pet_id: u32, donor: Address, amount: i128) -> Result<(), Error> {
        donor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Pet(pet_id);
        if !env.storage().persistent().has(&key) {
            return Err(Error::PetNotFound);
        }

        let mut pet: Pet = env.storage().persistent().get(&key).unwrap();
        if pet.is_adopted {
            return Err(Error::AlreadyAdopted);
        }

        // 1. Update donation total on-chain
        pet.donation_total += amount;
        env.storage().persistent().set(&key, &pet);

        // 2. Add donation record to history
        let history_key = DataKey::DonationHistory(pet_id);
        let mut history: Vec<DonationRecord> = env
            .storage()
            .persistent()
            .get(&history_key)
            .unwrap_or_else(|| Vec::new(&env));
        
        let record = DonationRecord {
            donor: donor.clone(),
            amount,
            timestamp: env.ledger().timestamp(),
        };
        history.push_back(record);
        env.storage().persistent().set(&history_key, &history);

        // 3. Execute XLM transfer from donor to shelter if native token is initialized
        if env.storage().persistent().has(&DataKey::TokenAddress) {
            let token_address: Address = env.storage().persistent().get(&DataKey::TokenAddress).unwrap();
            let token_client = soroban_sdk::token::Client::new(&env, &token_address);
            token_client.transfer(&donor, &pet.shelter_address, &amount);
        }

        // 4. Emit event
        events::donation_received(&env, pet_id, donor, amount);

        Ok(())
    }

    /// Marks a pet as adopted.
    pub fn adopt_pet(env: Env, pet_id: u32, adopter: Address, shelter: Address) -> Result<(), Error> {
        shelter.require_auth();

        let key = DataKey::Pet(pet_id);
        if !env.storage().persistent().has(&key) {
            return Err(Error::PetNotFound);
        }

        let mut pet: Pet = env.storage().persistent().get(&key).unwrap();
        if pet.is_adopted {
            return Err(Error::AlreadyAdopted);
        }

        if pet.shelter_address != shelter {
            return Err(Error::NotAuthorized);
        }

        let timestamp = env.ledger().timestamp();
        pet.is_adopted = true;
        pet.adopted_by = Some(adopter.clone());
        pet.adoption_date = Some(timestamp);

        env.storage().persistent().set(&key, &pet);

        events::pet_adopted(&env, pet_id, adopter, timestamp);

        Ok(())
    }

    /// Retrieves a single pet by ID.
    pub fn get_pet(env: Env, pet_id: u32) -> Pet {
        let key = DataKey::Pet(pet_id);
        if !env.storage().persistent().has(&key) {
            panic!("Pet not found");
        }
        env.storage().persistent().get(&key).unwrap()
    }

    /// Retrieves all pets stored in the directory.
    pub fn get_all_pets(env: Env) -> Vec<Pet> {
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::PetCount)
            .unwrap_or(0);

        let mut pets = Vec::new(&env);
        for i in 1..=count {
            let key = DataKey::Pet(i);
            if env.storage().persistent().has(&key) {
                let pet: Pet = env.storage().persistent().get(&key).unwrap();
                pets.push_back(pet);
            }
        }
        pets
    }

    /// Retrieves the list of donation records for a specific pet.
    pub fn get_donation_history(env: Env, pet_id: u32) -> Vec<DonationRecord> {
        let history_key = DataKey::DonationHistory(pet_id);
        env.storage()
            .persistent()
            .get(&history_key)
            .unwrap_or_else(|| Vec::new(&env))
    }
}
