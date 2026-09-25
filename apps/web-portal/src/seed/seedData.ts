import { doc, setDoc, serverTimestamp, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db, isLiveFirebaseConfigured } from '../services/firebase';
import type { 
  UserProfile, 
  InventoryBatch, 
  BuyerBid, 
  TransporterRoute 
} from '../types';

export const SEED_USERS: UserProfile[] = [
  {
    uid: 'demo_farmer_uid',
    name: 'Ramesh Patel',
    email: 'ramesh.farmer@example.com',
    role: 'farmer',
    user_status: 'VERIFIED',
    location: {
      address: 'Navalgund Taluk, Hubballi Mandi Road, Dharwad District, Karnataka 580025',
      latitude: 15.3647,
      longitude: 75.1240,
    },
    trust_score: 4.8,
    completed_deals_count: 14,
    created_at: new Date().toISOString(),
  },
  {
    uid: 'farmer_2',
    name: 'Suresh Patil',
    email: 'suresh.patil@example.com',
    role: 'farmer',
    user_status: 'VERIFIED',
    location: {
      address: 'Gokak Road, Belagavi Rural, Karnataka 591307',
      latitude: 16.1689,
      longitude: 74.8256,
    },
    trust_score: 4.6,
    completed_deals_count: 9,
    created_at: new Date().toISOString(),
  },
  {
    uid: 'demo_buyer_uid',
    name: 'Pooja Agarwal (FreshMart Traders)',
    email: 'pooja.buyer@freshmart.in',
    role: 'wholesaler',
    user_status: 'VERIFIED',
    location: {
      address: 'Shop 42, Central APMC Yard, Belagavi, Karnataka 590001',
      latitude: 15.8497,
      longitude: 74.4977,
    },
    trust_score: 4.6,
    completed_deals_count: 28,
    created_at: new Date().toISOString(),
  },
  {
    uid: 'buyer_2',
    name: 'Vikas Shah (Reliance Agro Sourcing)',
    email: 'vikas.agro@reliance.in',
    role: 'wholesaler',
    user_status: 'PROVISIONAL',
    location: {
      address: 'Gate 2, Hubballi APMC Mandi, Amargol, Karnataka 580025',
      latitude: 15.3850,
      longitude: 75.1180,
    },
    trust_score: 3.5,
    completed_deals_count: 1,
    created_at: new Date().toISOString(),
  },
  {
    uid: 'demo_transporter_uid',
    name: 'Raju Gounder (Express Haulage)',
    email: 'raju.transporter@expresshaul.com',
    role: 'transporter',
    user_status: 'VERIFIED',
    location: {
      address: 'NH4 Bypass Logistics Corridor, Dharwad, Karnataka 580004',
      latitude: 15.4589,
      longitude: 75.0078,
    },
    trust_score: 4.9,
    completed_deals_count: 32,
    created_at: new Date().toISOString(),
  },
  {
    uid: 'transporter_2',
    name: 'Mahesh Transport Services',
    email: 'mahesh.logistics@gmail.com',
    role: 'transporter',
    user_status: 'VERIFIED',
    location: {
      address: 'Koppal Highway Freight Terminal, Karnataka 583231',
      latitude: 15.3456,
      longitude: 76.1543,
    },
    trust_score: 4.2,
    completed_deals_count: 12,
    created_at: new Date().toISOString(),
  },
];

export const SEED_BATCHES: InventoryBatch[] = [
  {
    batch_id: 'batch_tomato_01',
    farmer_id: 'demo_farmer_uid',
    farmer_name: 'Ramesh Patel',
    farmer_location: {
      address: 'Navalgund Taluk, Hubballi Mandi Road, Dharwad District, Karnataka 580025',
      latitude: 15.3647,
      longitude: 75.1240,
    },
    crop: 'Tomato',
    variety: 'Vaishali Red',
    quantity_qtl: 40,
    min_price_per_qtl: 2000,
    harvest_date: new Date(Date.now() - 3600000 * 24).toISOString().split('T')[0],
    status: 'LISTED_ACTIVE',
    ai_recommendations: null, // Initialized as null per Section 4/8
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    batch_id: 'batch_onion_02',
    farmer_id: 'demo_farmer_uid',
    farmer_name: 'Ramesh Patel',
    farmer_location: {
      address: 'Navalgund Taluk, Hubballi Mandi Road, Dharwad District, Karnataka 580025',
      latitude: 15.3647,
      longitude: 75.1240,
    },
    crop: 'Onion',
    variety: 'Nashik Red',
    quantity_qtl: 80,
    min_price_per_qtl: 2800,
    harvest_date: new Date().toISOString().split('T')[0],
    status: 'PENDING_SIMULATION',
    ai_recommendations: null,
    created_at: new Date().toISOString(),
  },
  {
    batch_id: 'batch_chilli_03',
    farmer_id: 'farmer_2',
    farmer_name: 'Suresh Patil',
    farmer_location: {
      address: 'Gokak Road, Belagavi Rural, Karnataka 591307',
      latitude: 16.1689,
      longitude: 74.8256,
    },
    crop: 'Green Chilli',
    variety: 'G4 Hot',
    quantity_qtl: 25,
    min_price_per_qtl: 3600,
    harvest_date: new Date().toISOString().split('T')[0],
    status: 'LISTED_ACTIVE',
    ai_recommendations: null,
    created_at: new Date().toISOString(),
  },
];

export const SEED_BIDS: BuyerBid[] = [
  {
    bid_id: 'bid_01',
    batch_id: 'batch_tomato_01',
    buyer_id: 'demo_buyer_uid',
    buyer_name: 'Pooja Agarwal (FreshMart Traders)',
    offered_price_per_qtl: 2150,
    delivery_term: 'EX_FARM',
    buyer_trust_snapshot: 4.6,
    status: 'OPEN',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    bid_id: 'bid_02',
    batch_id: 'batch_tomato_01',
    buyer_id: 'buyer_2',
    buyer_name: 'Vikas Shah (Reliance Agro Sourcing)',
    offered_price_per_qtl: 2300,
    delivery_term: 'FOR_MANDI',
    buyer_trust_snapshot: 3.5,
    status: 'OPEN',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    bid_id: 'bid_03',
    batch_id: 'batch_chilli_03',
    buyer_id: 'demo_buyer_uid',
    buyer_name: 'Pooja Agarwal (FreshMart Traders)',
    offered_price_per_qtl: 3800,
    delivery_term: 'EX_FARM',
    buyer_trust_snapshot: 4.6,
    status: 'OPEN',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const SEED_ROUTES: TransporterRoute[] = [
  {
    route_id: 'route_01',
    transporter_id: 'demo_transporter_uid',
    transporter_name: 'Raju Gounder (Express Haulage)',
    vehicle_type: 'Tata 407 (3.5T)',
    capacity_qtl: 45,
    origin: 'Hubballi',
    destination: 'Belagavi APMC',
    distance_km: 95,
    is_backhaul: true,
    tariff_per_km: 14.5,
    cleaning_charge: 300,
    labour_charge: 600,
    maintenance_charge: 400,
    total_vehicle_price: 2678, // (95 * 14.5) + 300 + 600 + 400 = 1377.5 + 1300 = 2677.5 ~ 2678
    transporter_trust_snapshot: 4.9,
    status: 'AVAILABLE',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    route_id: 'route_02',
    transporter_id: 'transporter_2',
    transporter_name: 'Mahesh Transport Services',
    vehicle_type: 'Mahindra Bolero Pickup (1.7T)',
    capacity_qtl: 20,
    origin: 'Dharwad',
    destination: 'Hubballi Mandi',
    distance_km: 22,
    is_backhaul: false,
    tariff_per_km: 18.0,
    cleaning_charge: 250,
    labour_charge: 450,
    maintenance_charge: 300,
    total_vehicle_price: 1396, // (22 * 18) + 250 + 450 + 300 = 396 + 1000 = 1396
    transporter_trust_snapshot: 4.2,
    status: 'AVAILABLE',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

export const seedDatabase = async () => {
  // Always populate local demo storage so demo exploration works instantly
  localStorage.setItem('kisaansaathi_local_users', JSON.stringify(SEED_USERS));
  localStorage.setItem('kisaansaathi_local_inventory_batches', JSON.stringify(SEED_BATCHES));
  localStorage.setItem('kisaansaathi_local_buyer_bids', JSON.stringify(SEED_BIDS));
  localStorage.setItem('kisaansaathi_local_transporter_routes', JSON.stringify(SEED_ROUTES));

  window.dispatchEvent(new CustomEvent('kisaansaathi_update_inventory_batches'));
  window.dispatchEvent(new CustomEvent('kisaansaathi_update_buyer_bids'));
  window.dispatchEvent(new CustomEvent('kisaansaathi_update_transporter_routes'));

  if (isLiveFirebaseConfigured && db) {
    try {
      for (const u of SEED_USERS) {
        await setDoc(doc(db, 'users', u.uid), { ...u, created_at: serverTimestamp() });
      }
      for (const b of SEED_BATCHES) {
        await setDoc(doc(db, 'inventory_batches', b.batch_id), { ...b, created_at: serverTimestamp() });
      }
      for (const bid of SEED_BIDS) {
        await setDoc(doc(db, 'buyer_bids', bid.bid_id), { ...bid, created_at: serverTimestamp() });
      }
      for (const r of SEED_ROUTES) {
        await setDoc(doc(db, 'transporter_routes', r.route_id), { ...r, created_at: serverTimestamp() });
      }
      console.log('Live Firestore seeded successfully!');
      return true;
    } catch (e) {
      console.warn('Seeding live Firestore skipped or restricted by security rules (local demo storage ready):', e);
      return true;
    }
  }

  return true;
};

/**
 * Wipe/clean all demo data from Firestore and local storage.
 * Leaves the database completely pristine for live user tests.
 */
export const cleanDatabase = async (): Promise<boolean> => {
  if (isLiveFirebaseConfigured && db) {
    try {
      const collectionsToClean = ['inventory_batches', 'buyer_bids', 'transporter_routes', 'deals_and_reviews'];
      for (const collName of collectionsToClean) {
        const snap = await getDocs(collection(db, collName));
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      }
      console.log('Live Firestore demo data cleaned successfully!');
    } catch (e) {
      console.error('Cleaning live Firestore failed:', e);
    }
  }

  // Clear local storage demo collections
  localStorage.setItem('kisaansaathi_local_inventory_batches', JSON.stringify([]));
  localStorage.setItem('kisaansaathi_local_buyer_bids', JSON.stringify([]));
  localStorage.setItem('kisaansaathi_local_transporter_routes', JSON.stringify([]));
  localStorage.setItem('kisaansaathi_local_deals_and_reviews', JSON.stringify([]));

  window.dispatchEvent(new CustomEvent('kisaansaathi_update_inventory_batches'));
  window.dispatchEvent(new CustomEvent('kisaansaathi_update_buyer_bids'));
  window.dispatchEvent(new CustomEvent('kisaansaathi_update_transporter_routes'));
  window.dispatchEvent(new CustomEvent('kisaansaathi_update_deals_and_reviews'));
  return true;
};

// Auto-seed disabled so the portal always starts fresh and clean
export const checkAndAutoSeedLocal = () => {
  // Deliberately no-op to keep database clean per user request
};
