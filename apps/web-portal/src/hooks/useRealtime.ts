import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { db, isLiveFirebaseConfigured } from '../services/firebase';
import type { 
  InventoryBatch, 
  BuyerBid, 
  TransporterRoute, 
  DealAndReview 
} from '../types';

const STORAGE_PREFIX = 'kisaansaathi_local_';

const getLocal = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useBatches = () => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocal = () => {
      setBatches(getLocal<InventoryBatch>('inventory_batches'));
      setLoading(false);
    };

    if (isLiveFirebaseConfigured && db) {
      const q = query(collection(db, 'inventory_batches'), orderBy('created_at', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => doc.data() as InventoryBatch);
        setBatches(list);
        setLoading(false);
      }, (err) => {
        console.warn('Batches onSnapshot error (using local demo data):', err.message);
        loadLocal();
      });

      window.addEventListener('kisaansaathi_update_inventory_batches', loadLocal);
      return () => {
        unsubscribe();
        window.removeEventListener('kisaansaathi_update_inventory_batches', loadLocal);
      };
    } else {
      loadLocal();
      window.addEventListener('kisaansaathi_update_inventory_batches', loadLocal);
      return () => window.removeEventListener('kisaansaathi_update_inventory_batches', loadLocal);
    }
  }, []);

  return { batches, loading };
};

export const useBids = (batchId?: string) => {
  const [bids, setBids] = useState<BuyerBid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocal = () => {
      const all = getLocal<BuyerBid>('buyer_bids');
      setBids(batchId ? all.filter(b => b.batch_id === batchId) : all);
      setLoading(false);
    };

    if (isLiveFirebaseConfigured && db) {
      let q = query(collection(db, 'buyer_bids'), orderBy('created_at', 'desc'));
      if (batchId) {
        q = query(collection(db, 'buyer_bids'), where('batch_id', '==', batchId));
      }
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => doc.data() as BuyerBid);
        setBids(list);
        setLoading(false);
      }, (err) => {
        console.warn('Bids onSnapshot error (using local demo data):', err.message);
        loadLocal();
      });

      window.addEventListener('kisaansaathi_update_buyer_bids', loadLocal);
      return () => {
        unsubscribe();
        window.removeEventListener('kisaansaathi_update_buyer_bids', loadLocal);
      };
    } else {
      loadLocal();
      window.addEventListener('kisaansaathi_update_buyer_bids', loadLocal);
      return () => window.removeEventListener('kisaansaathi_update_buyer_bids', loadLocal);
    }
  }, [batchId]);

  return { bids, loading };
};

export const useRoutes = () => {
  const [routes, setRoutes] = useState<TransporterRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocal = () => {
      setRoutes(getLocal<TransporterRoute>('transporter_routes'));
      setLoading(false);
    };

    if (isLiveFirebaseConfigured && db) {
      const q = query(collection(db, 'transporter_routes'), orderBy('created_at', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => doc.data() as TransporterRoute);
        setRoutes(list);
        setLoading(false);
      }, (err) => {
        console.warn('Routes onSnapshot error (using local demo data):', err.message);
        loadLocal();
      });

      window.addEventListener('kisaansaathi_update_transporter_routes', loadLocal);
      return () => {
        unsubscribe();
        window.removeEventListener('kisaansaathi_update_transporter_routes', loadLocal);
      };
    } else {
      loadLocal();
      window.addEventListener('kisaansaathi_update_transporter_routes', loadLocal);
      return () => window.removeEventListener('kisaansaathi_update_transporter_routes', loadLocal);
    }
  }, []);

  return { routes, loading };
};

export const useDeals = () => {
  const [deals, setDeals] = useState<DealAndReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocal = () => {
      setDeals(getLocal<DealAndReview>('deals_and_reviews'));
      setLoading(false);
    };

    if (isLiveFirebaseConfigured && db) {
      const q = query(collection(db, 'deals_and_reviews'), orderBy('created_at', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => doc.data() as DealAndReview);
        setDeals(list);
        setLoading(false);
      }, (err) => {
        console.warn('Deals onSnapshot error (using local demo data):', err.message);
        loadLocal();
      });

      window.addEventListener('kisaansaathi_update_deals_and_reviews', loadLocal);
      return () => {
        unsubscribe();
        window.removeEventListener('kisaansaathi_update_deals_and_reviews', loadLocal);
      };
    } else {
      loadLocal();
      window.addEventListener('kisaansaathi_update_deals_and_reviews', loadLocal);
      return () => window.removeEventListener('kisaansaathi_update_deals_and_reviews', loadLocal);
    }
  }, []);

  return { deals, loading };
};
