import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import type { 
  UserProfile, 
  UserLocation,
  InventoryBatch, 
  BuyerBid, 
  TransporterRoute, 
  DealAndReview,
  UserRole
} from '../types';

// Check if valid Firebase configuration is supplied in .env
const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isLiveFirebaseConfigured = Boolean(envApiKey && envApiKey.trim() !== '' && !envApiKey.includes('YOUR_'));

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDGt2wbEVaBDDLYLrDxnaOi35gWul08OFs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kisaansaathi-28cec.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kisaansaathi-28cec',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kisaansaathi-28cec.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '350146630987',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:350146630987:web:ae00aa96e9b9ca4fda04ce',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-VSDGG1H78C',
};

// Initialize Firebase only if live credentials exist or app hasn't been initialized
let app: any;
let auth: any;
let db: any;
let analytics: any = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isLiveFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    }).catch(() => {
      // Analytics not supported in some environments (e.g. headless or iframe)
    });
  } catch (err) {
    console.warn('Firebase init warning:', err);
  }
}

export { app, auth, db, googleProvider, analytics };

// Helper to format currency in Indian format: ₹74,200
export const formatINR = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

// 4-digit random PIN generator
export const generateVerificationPin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/* -------------------------------------------------------------
 * LOCAL DEMO STATE STORE (Ensures instant demoability before .env is populated)
 * ------------------------------------------------------------- */
const STORAGE_PREFIX = 'kisaansaathi_local_';

const getLocalCollection = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalCollection = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(`kisaansaathi_update_${key}`));
  } catch (err) {
    console.error('Local storage write error:', err);
  }
};

/* -------------------------------------------------------------
 * AUTH SERVICE
 * ------------------------------------------------------------- */

export const signInWithGoogle = async (): Promise<any> => {
  if (isLiveFirebaseConfigured && auth && googleProvider) {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } else {
    // Demo fallback for instant testing without Firebase keys
    const demoUser = {
      uid: 'demo_farmer_uid',
      displayName: 'Ramesh Patel',
      email: 'ramesh.farmer@example.com',
      photoURL: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=60',
    };
    localStorage.setItem('kisaansaathi_demo_auth', JSON.stringify(demoUser));
    window.dispatchEvent(new CustomEvent('kisaansaathi_auth_change'));
    return demoUser;
  }
};

export const signUpWithEmail = async (
  email: string, 
  password: string, 
  displayName?: string
): Promise<any> => {
  if (isLiveFirebaseConfigured && auth) {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && res.user) {
      try {
        await updateProfile(res.user, { displayName });
      } catch (err) {
        console.warn('Could not update profile displayName:', err);
      }
    }
    return res.user;
  } else {
    const demoUser = {
      uid: 'user_' + Date.now(),
      displayName: displayName || email.split('@')[0],
      email: email,
    };
    localStorage.setItem('kisaansaathi_demo_auth', JSON.stringify(demoUser));
    window.dispatchEvent(new CustomEvent('kisaansaathi_auth_change'));
    return demoUser;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<any> => {
  if (isLiveFirebaseConfigured && auth) {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  } else {
    const demoUser = {
      uid: 'demo_farmer_uid',
      displayName: email.split('@')[0],
      email: email,
    };
    localStorage.setItem('kisaansaathi_demo_auth', JSON.stringify(demoUser));
    window.dispatchEvent(new CustomEvent('kisaansaathi_auth_change'));
    return demoUser;
  }
};

export const switchDemoUser = (role: UserRole): UserProfile => {
  const demoUsers: Record<UserRole, UserProfile> = {
    farmer: {
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
    wholesaler: {
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
    transporter: {
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
  };

  const selected = demoUsers[role];
  localStorage.setItem('kisaansaathi_demo_auth', JSON.stringify({
    uid: selected.uid,
    displayName: selected.name,
    email: selected.email,
  }));
  localStorage.setItem('kisaansaathi_demo_profile', JSON.stringify(selected));

  // Save to local users collection as well
  const users = getLocalCollection<UserProfile>('users');
  const filtered = users.filter(u => u.uid !== selected.uid);
  filtered.push(selected);
  saveLocalCollection('users', filtered);

  window.dispatchEvent(new CustomEvent('kisaansaathi_auth_change'));
  return selected;
};

export const logOut = async (): Promise<void> => {
  if (isLiveFirebaseConfigured && auth) {
    await fbSignOut(auth);
  }
  localStorage.removeItem('kisaansaathi_demo_auth');
  localStorage.removeItem('kisaansaathi_demo_profile');
  window.dispatchEvent(new CustomEvent('kisaansaathi_auth_change'));
};

/* -------------------------------------------------------------
 * PROFILE SERVICE
 * ------------------------------------------------------------- */

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (isLiveFirebaseConfigured && db) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } else {
    const saved = localStorage.getItem('kisaansaathi_demo_profile');
    if (saved) {
      const p = JSON.parse(saved);
      if (p.uid === uid) return p;
    }
    const users = getLocalCollection<UserProfile>('users');
    return users.find(u => u.uid === uid) || null;
  }
};

export const createUserProfile = async (
  uid: string, 
  name: string, 
  email: string, 
  role: UserRole, 
  location: UserLocation
): Promise<UserProfile> => {
  const profile: UserProfile = {
    uid,
    name,
    email,
    role,
    user_status: 'PROVISIONAL',
    location,
    trust_score: 3.5,
    completed_deals_count: 0,
    created_at: isLiveFirebaseConfigured ? serverTimestamp() : new Date().toISOString(),
  };

  if (isLiveFirebaseConfigured && db) {
    await setDoc(doc(db, 'users', uid), profile);
  } else {
    const users = getLocalCollection<UserProfile>('users');
    const updated = users.filter(u => u.uid !== uid);
    updated.push(profile);
    saveLocalCollection('users', updated);
    localStorage.setItem('kisaansaathi_demo_profile', JSON.stringify(profile));
  }
  return profile;
};

/* -------------------------------------------------------------
 * INVENTORY BATCHES SERVICE
 * ------------------------------------------------------------- */

export const registerHarvestBatch = async (
  farmerId: string,
  farmerName: string,
  crop: string,
  variety: string,
  quantityQtl: number,
  minPricePerQtl: number,
  harvestDateStr: string,
  farmerLocation?: UserLocation
): Promise<string> => {
  const batchId = 'batch_' + Date.now();
  const batchData: InventoryBatch = {
    batch_id: batchId,
    farmer_id: farmerId,
    farmer_name: farmerName,
    farmer_location: farmerLocation,
    crop,
    variety,
    quantity_qtl: quantityQtl,
    min_price_per_qtl: minPricePerQtl,
    harvest_date: harvestDateStr,
    status: 'PENDING_SIMULATION', // advanced immediately from DRAFT per spec
    ai_recommendations: null, // Always null at creation per Section 4/8
    created_at: isLiveFirebaseConfigured ? serverTimestamp() : new Date().toISOString(),
  };

  if (isLiveFirebaseConfigured && db) {
    await setDoc(doc(db, 'inventory_batches', batchId), batchData);
  } else {
    const batches = getLocalCollection<InventoryBatch>('inventory_batches');
    batches.unshift(batchData);
    saveLocalCollection('inventory_batches', batches);
  }
  return batchId;
};

export const publishBatchToMarketplace = async (batchId: string): Promise<void> => {
  if (isLiveFirebaseConfigured && db) {
    await updateDoc(doc(db, 'inventory_batches', batchId), {
      status: 'LISTED_ACTIVE'
    });
  } else {
    const batches = getLocalCollection<InventoryBatch>('inventory_batches');
    const updated = batches.map(b => b.batch_id === batchId ? { ...b, status: 'LISTED_ACTIVE' as const } : b);
    saveLocalCollection('inventory_batches', updated);
  }
};

/* -------------------------------------------------------------
 * BUYER BIDS SERVICE
 * ------------------------------------------------------------- */

export const placeBuyerBid = async (
  batchId: string,
  buyerId: string,
  buyerName: string,
  buyerTrust: number,
  pricePerQtl: number,
  deliveryTerm: 'EX_FARM' | 'FOR_MANDI'
): Promise<string> => {
  const bidId = 'bid_' + Date.now();
  const bidData: BuyerBid = {
    bid_id: bidId,
    batch_id: batchId,
    buyer_id: buyerId,
    buyer_name: buyerName,
    offered_price_per_qtl: pricePerQtl,
    delivery_term: deliveryTerm,
    buyer_trust_snapshot: buyerTrust || 3.5,
    status: 'OPEN',
    created_at: isLiveFirebaseConfigured ? serverTimestamp() : new Date().toISOString(),
  };

  if (isLiveFirebaseConfigured && db) {
    await setDoc(doc(db, 'buyer_bids', bidId), bidData);
  } else {
    const bids = getLocalCollection<BuyerBid>('buyer_bids');
    bids.unshift(bidData);
    saveLocalCollection('buyer_bids', bids);
  }
  return bidId;
};

/* -------------------------------------------------------------
 * TRANSPORTER ROUTES SERVICE
 * ------------------------------------------------------------- */

export const declareTransporterRoute = async (
  transporterId: string,
  transporterName: string,
  transporterTrust: number,
  vehicleType: string,
  capacityQtl: number,
  origin: string,
  destination: string,
  distanceKm: number,
  isBackhaul: boolean,
  tariffPerKm: number,
  cleaningCharge: number = 300,
  labourCharge: number = 600,
  maintenanceCharge: number = 400
): Promise<string> => {
  const routeId = 'route_' + Date.now();
  const totalVehiclePrice = Number(
    ((tariffPerKm * distanceKm) + cleaningCharge + labourCharge + maintenanceCharge).toFixed(0)
  );

  const routeData: TransporterRoute = {
    route_id: routeId,
    transporter_id: transporterId,
    transporter_name: transporterName,
    vehicle_type: vehicleType,
    capacity_qtl: capacityQtl,
    origin,
    destination,
    distance_km: distanceKm,
    is_backhaul: isBackhaul,
    tariff_per_km: tariffPerKm,
    cleaning_charge: cleaningCharge,
    labour_charge: labourCharge,
    maintenance_charge: maintenanceCharge,
    total_vehicle_price: totalVehiclePrice,
    transporter_trust_snapshot: transporterTrust || 3.5,
    status: 'AVAILABLE',
    created_at: isLiveFirebaseConfigured ? serverTimestamp() : new Date().toISOString(),
  };

  if (isLiveFirebaseConfigured && db) {
    await setDoc(doc(db, 'transporter_routes', routeId), routeData);
  } else {
    const routes = getLocalCollection<TransporterRoute>('transporter_routes');
    routes.unshift(routeData);
    saveLocalCollection('transporter_routes', routes);
  }
  return routeId;
};

/* -------------------------------------------------------------
 * BOOKING & DEAL LIFECYCLE SERVICE
 * ------------------------------------------------------------- */

export const acceptDeal = async (
  batch: InventoryBatch,
  chosenBid: BuyerBid,
  chosenRoute: TransporterRoute
): Promise<string> => {
  const dealId = 'deal_' + Date.now();
  const farmgateOtp = generateVerificationPin();
  const scaleOtp = generateVerificationPin();

  const dealData: DealAndReview = {
    deal_id: dealId,
    batch_id: batch.batch_id,
    crop: batch.crop,
    quantity_qtl: batch.quantity_qtl,
    farmer_id: batch.farmer_id,
    farmer_name: batch.farmer_name,
    buyer_id: chosenBid.buyer_id,
    buyer_name: chosenBid.buyer_name,
    transporter_id: chosenRoute.transporter_id,
    transporter_name: chosenRoute.transporter_name,
    agreed_price_per_qtl: chosenBid.offered_price_per_qtl,
    status: 'MATCHED',
    verification_pins: {
      farmgate_otp: farmgateOtp,
      scale_otp: scaleOtp,
      farmgate_verified: false,
      scale_verified: false,
    },
    ratings: null,
    created_at: isLiveFirebaseConfigured ? serverTimestamp() : new Date().toISOString(),
    fulfilled_at: null,
  };

  if (isLiveFirebaseConfigured && db) {
    // 1. Create deal
    await setDoc(doc(db, 'deals_and_reviews', dealId), dealData);
    // 2. Set batch status
    await updateDoc(doc(db, 'inventory_batches', batch.batch_id), {
      status: 'MATCHED_IN_TRANSIT'
    });
    // 3. Set chosen bid to ACCEPTED
    await updateDoc(doc(db, 'buyer_bids', chosenBid.bid_id), {
      status: 'ACCEPTED'
    });
    // 4. Set chosen route to CLAIMED
    await updateDoc(doc(db, 'transporter_routes', chosenRoute.route_id), {
      status: 'CLAIMED'
    });
  } else {
    const deals = getLocalCollection<DealAndReview>('deals_and_reviews');
    deals.unshift(dealData);
    saveLocalCollection('deals_and_reviews', deals);

    // Update batch
    const batches = getLocalCollection<InventoryBatch>('inventory_batches');
    saveLocalCollection('inventory_batches', batches.map(b => 
      b.batch_id === batch.batch_id ? { ...b, status: 'MATCHED_IN_TRANSIT' as const } : b
    ));

    // Update bids
    const bids = getLocalCollection<BuyerBid>('buyer_bids');
    saveLocalCollection('buyer_bids', bids.map(bid => {
      if (bid.bid_id === chosenBid.bid_id) return { ...bid, status: 'ACCEPTED' as const };
      if (bid.batch_id === batch.batch_id) return { ...bid, status: 'REJECTED' as const };
      return bid;
    }));

    // Update route
    const routes = getLocalCollection<TransporterRoute>('transporter_routes');
    saveLocalCollection('transporter_routes', routes.map(r => 
      r.route_id === chosenRoute.route_id ? { ...r, status: 'CLAIMED' as const } : r
    ));
  }

  return dealId;
};

// Step 2: Transporter verifies Farmgate PIN
export const verifyFarmgatePin = async (dealId: string, enteredPin: string): Promise<boolean> => {
  if (isLiveFirebaseConfigured && db) {
    const dealDoc = await getDoc(doc(db, 'deals_and_reviews', dealId));
    if (!dealDoc.exists()) return false;
    const deal = dealDoc.data() as DealAndReview;
    if (deal.verification_pins.farmgate_otp === enteredPin.trim()) {
      await updateDoc(doc(db, 'deals_and_reviews', dealId), {
        'verification_pins.farmgate_verified': true,
        status: 'PICKUP_VERIFIED',
      });
      return true;
    }
    return false;
  } else {
    const deals = getLocalCollection<DealAndReview>('deals_and_reviews');
    const deal = deals.find(d => d.deal_id === dealId);
    if (!deal) return false;
    if (deal.verification_pins.farmgate_otp === enteredPin.trim()) {
      deal.verification_pins.farmgate_verified = true;
      deal.status = 'PICKUP_VERIFIED';
      saveLocalCollection('deals_and_reviews', deals);
      return true;
    }
    return false;
  }
};

// Step 3: Wholesaler verifies Delivery Scale PIN
export const verifyScalePin = async (dealId: string, enteredPin: string): Promise<boolean> => {
  if (isLiveFirebaseConfigured && db) {
    const dealDoc = await getDoc(doc(db, 'deals_and_reviews', dealId));
    if (!dealDoc.exists()) return false;
    const deal = dealDoc.data() as DealAndReview;
    if (deal.verification_pins.scale_otp === enteredPin.trim()) {
      const isFulfilled = deal.verification_pins.farmgate_verified;
      const updates: any = {
        'verification_pins.scale_verified': true,
      };
      if (isFulfilled) {
        updates.status = 'FULFILLED';
        updates.fulfilled_at = serverTimestamp();
        // also set batch to FULFILLED
        await updateDoc(doc(db, 'inventory_batches', deal.batch_id), {
          status: 'FULFILLED',
        });
      }
      await updateDoc(doc(db, 'deals_and_reviews', dealId), updates);
      return true;
    }
    return false;
  } else {
    const deals = getLocalCollection<DealAndReview>('deals_and_reviews');
    const deal = deals.find(d => d.deal_id === dealId);
    if (!deal) return false;
    if (deal.verification_pins.scale_otp === enteredPin.trim()) {
      deal.verification_pins.scale_verified = true;
      if (deal.verification_pins.farmgate_verified) {
        deal.status = 'FULFILLED';
        deal.fulfilled_at = new Date().toISOString();
        // Update batch
        const batches = getLocalCollection<InventoryBatch>('inventory_batches');
        saveLocalCollection('inventory_batches', batches.map(b => 
          b.batch_id === deal.batch_id ? { ...b, status: 'FULFILLED' as const } : b
        ));
      }
      saveLocalCollection('deals_and_reviews', deals);
      return true;
    }
    return false;
  }
};

// Step 5: Mutual reviews and trust score updates
export const submitDealReview = async (
  dealId: string,
  reviewerRole: UserRole,
  rating: number,
  targetUserId: string
): Promise<void> => {
  const ratingKeyMap: Record<UserRole, string> = {
    farmer: 'farmer_to_buyer',
    wholesaler: 'buyer_to_farmer',
    transporter: 'transporter_to_farmer',
  };

  const field = `ratings.${ratingKeyMap[reviewerRole]}`;

  if (isLiveFirebaseConfigured && db) {
    await updateDoc(doc(db, 'deals_and_reviews', dealId), {
      [field]: rating,
    });
    // Update target user's trust score & completed deals
    const userDoc = await getDoc(doc(db, 'users', targetUserId));
    if (userDoc.exists()) {
      const u = userDoc.data() as UserProfile;
      const count = u.completed_deals_count || 0;
      const currentTrust = u.trust_score || 3.5;
      const newTrust = Number(((currentTrust * count + rating) / (count + 1)).toFixed(1));
      await updateDoc(doc(db, 'users', targetUserId), {
        trust_score: newTrust,
        completed_deals_count: count + 1,
        user_status: count + 1 >= 3 ? 'VERIFIED' : u.user_status,
      });
    }
  } else {
    const deals = getLocalCollection<DealAndReview>('deals_and_reviews');
    const deal = deals.find(d => d.deal_id === dealId);
    if (deal) {
      if (!deal.ratings) {
        deal.ratings = {
          farmer_to_buyer: null,
          farmer_to_transporter: null,
          buyer_to_farmer: null,
          transporter_to_farmer: null,
        };
      }
      (deal.ratings as any)[ratingKeyMap[reviewerRole]] = rating;
      saveLocalCollection('deals_and_reviews', deals);
    }

    // Update target user
    const users = getLocalCollection<UserProfile>('users');
    const u = users.find(x => x.uid === targetUserId);
    if (u) {
      const count = u.completed_deals_count || 0;
      const currentTrust = u.trust_score || 3.5;
      u.trust_score = Number(((currentTrust * count + rating) / (count + 1)).toFixed(1));
      u.completed_deals_count = count + 1;
      if (u.completed_deals_count >= 3) {
        u.user_status = 'VERIFIED';
      }
      saveLocalCollection('users', users);
    }
  }
};
