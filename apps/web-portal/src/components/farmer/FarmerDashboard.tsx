import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBatches, useDeals } from '../../hooks/useRealtime';
import { 
  registerHarvestBatch, 
  publishBatchToMarketplace,
  formatINR,
  submitDealReview
} from '../../services/firebase';
import type { BatchStatus, DealAndReview } from '../../types';
import { 
  Sprout, 
  Plus, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Star,
  Send,
  Sparkles,
  KeyRound,
  Boxes,
  Warehouse,
  MapPin,
  AlertTriangle
} from 'lucide-react';

export const FarmerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { batches, loading: batchesLoading } = useBatches();
  const { deals } = useDeals();

  const [activeTab, setActiveTab] = useState<'batches' | 'inventory'>('batches');
  const [showModal, setShowModal] = useState(false);
  const [crop, setCrop] = useState('Tomato');
  const [variety, setVariety] = useState('Vaishali Red');
  const [quantity, setQuantity] = useState<number>(40);
  const [minPricePerQtl, setMinPricePerQtl] = useState<number>(2100);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateError, setDateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review states for completed deals
  const [reviewRatings, setReviewRatings] = useState<Record<string, { buyer: number; transporter: number }>>({});
  const [reviewSubmitted, setReviewSubmitted] = useState<Record<string, boolean>>({});

  // 2-Day Relaxation limits
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const minHarvestDate = twoDaysAgo.toISOString().split('T')[0];
  const maxHarvestDate = tomorrow.toISOString().split('T')[0];

  // Filter farmer's own batches
  const myBatches = batches.filter(b => b.farmer_id === profile?.uid);
  const myDeals = deals.filter(d => d.farmer_id === profile?.uid);

  const handleRegisterHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Validate 2-day relaxation rule
    const selectedDate = new Date(harvestDate);
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    const diffTime = todayZero.getTime() - selectedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 2) {
      setDateError('Freshness Rule: Harvest registration only permits up to 2 days relaxation (48 hours). Older produce cannot be certified for fresh transit.');
      return;
    }
    setDateError('');

    try {
      setIsSubmitting(true);
      await registerHarvestBatch(
        profile.uid,
        profile.name,
        crop,
        variety,
        Number(quantity),
        Number(minPricePerQtl),
        harvestDate,
        profile.location
      );
      setShowModal(false);
      // Reset form
      setQuantity(40);
      setMinPricePerQtl(2100);
    } catch (err) {
      console.error('Failed to register batch:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (batchId: string) => {
    await publishBatchToMarketplace(batchId);
  };

  const handleRateSubmit = async (deal: DealAndReview) => {
    const ratings = reviewRatings[deal.deal_id] || { buyer: 5, transporter: 5 };
    if (profile) {
      await submitDealReview(deal.deal_id, 'farmer', ratings.buyer, deal.buyer_id);
      setReviewSubmitted(prev => ({ ...prev, [deal.deal_id]: true }));
    }
  };

  const getStatusBadge = (status: BatchStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">DRAFT</span>;
      case 'PENDING_SIMULATION':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
            <Clock className="w-3 h-3 animate-spin mr-1 text-amber-600" />
            <span>PENDING SIMULATION</span>
          </span>
        );
      case 'LISTED_ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
            <span>LISTED ACTIVE</span>
          </span>
        );
      case 'MATCHED_IN_TRANSIT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 flex items-center space-x-1">
            <Truck className="w-3 h-3 mr-1 text-blue-600" />
            <span>MATCHED IN TRANSIT</span>
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 mr-1 text-purple-600" />
            <span>FULFILLED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
            <Sprout className="w-4 h-4" />
            <span>Farmer Operations Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            Namaste, {profile?.name}
          </h1>
          <p className="text-emerald-100 text-sm mt-1 max-w-xl">
            Register your harvest batches, review transparent buyer bids, match verified backhaul transport, and track physical delivery PIN handshakes.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center space-x-2 shrink-0 group"
        >
          <Plus className="w-4 h-4 text-emerald-600 group-hover:rotate-90 transition-transform" />
          <span>Register Harvest Batch</span>
        </button>
      </div>

      {/* Active Deals / Handshake PINs (If Any) */}
      {myDeals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Active Deals & Handshake Verification PINs</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Digital Handshake Protocol</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myDeals.map(deal => (
              <div 
                key={deal.deal_id} 
                className={`p-5 rounded-2xl border transition-all ${
                  deal.status === 'FULFILLED' 
                    ? 'border-purple-200 bg-purple-50/30' 
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">{deal.crop} ({deal.quantity_qtl} Quintals)</span>
                    <div className="text-xs text-slate-500 mt-0.5">Agreed Price: <span className="font-semibold text-emerald-700">{formatINR(deal.agreed_price_per_qtl)}/qtl</span></div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    deal.status === 'FULFILLED' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {deal.status}
                  </span>
                </div>

                {/* Handshake PIN Boxes */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200/60">
                  
                  {/* Farmgate PIN */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">1. Farmgate Pickup PIN</span>
                    <div className="text-lg font-mono font-extrabold text-slate-900 tracking-widest mt-0.5">
                      {deal.verification_pins.farmgate_otp}
                    </div>
                    <div className="text-[10px] mt-1 flex items-center space-x-1">
                      {deal.verification_pins.farmgate_verified ? (
                        <span className="text-emerald-600 font-bold flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Verified by Driver
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Give to driver at farm</span>
                      )}
                    </div>
                  </div>

                  {/* Scale PIN */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">2. Delivery Scale PIN</span>
                    <div className="text-lg font-mono font-extrabold text-slate-900 tracking-widest mt-0.5">
                      {deal.verification_pins.scale_otp}
                    </div>
                    <div className="text-[10px] mt-1 flex items-center space-x-1">
                      {deal.verification_pins.scale_verified ? (
                        <span className="text-emerald-600 font-bold flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Verified at Mandi
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Auto-unlocked at weighing</span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Counterparties */}
                <div className="mt-3 text-xs text-slate-600 flex justify-between items-center">
                  <div>Buyer: <span className="font-semibold text-slate-800">{deal.buyer_name || 'Wholesaler'}</span></div>
                  <div>Transporter: <span className="font-semibold text-slate-800">{deal.transporter_name || 'Carrier'}</span></div>
                </div>

                {/* Rating Prompt if Fulfilled */}
                {deal.status === 'FULFILLED' && !reviewSubmitted[deal.deal_id] && (
                  <div className="mt-4 pt-3 border-t border-purple-200">
                    <div className="text-xs font-bold text-purple-900 mb-2">Leave Trade Review (Unlocks Trust Score)</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-1 text-xs">
                        <span>Rate Buyer:</span>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setReviewRatings(prev => ({
                              ...prev,
                              [deal.deal_id]: { ...prev[deal.deal_id], buyer: star }
                            }))}
                            className="p-0.5"
                          >
                            <Star className={`w-4 h-4 ${
                              (reviewRatings[deal.deal_id]?.buyer || 5) >= star 
                                ? 'text-amber-500 fill-amber-400' 
                                : 'text-slate-300'
                            }`} />
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleRateSubmit(deal)}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold"
                      >
                        Submit Rating
                      </button>
                    </div>
                  </div>
                )}

                {reviewSubmitted[deal.deal_id] && (
                  <div className="mt-3 text-xs text-emerald-700 font-semibold flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Thank you! Trust score updated.
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('batches')}
          className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'batches'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Active Market Batches & Handshakes</span>
          <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {myBatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>My Farm Inventory & Available Stock</span>
          <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            Live Stock
          </span>
        </button>
      </div>

      {/* VIEW 1: ACTIVE MARKET BATCHES */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Harvest Batches</h2>
              <p className="text-xs text-slate-500">Click any batch to inspect open bids, available freight routes, and complete bookings.</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              {myBatches.length} {myBatches.length === 1 ? 'Batch' : 'Batches'}
            </span>
          </div>

        {batchesLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading harvest inventory...</div>
        ) : myBatches.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Sprout className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Harvest Batches Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Register your harvested crop to get discovered by verified buyers and transporters.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
            >
              Register First Batch
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myBatches.map(batch => (
              <div 
                key={batch.batch_id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {batch.crop}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">{batch.variety}</h3>
                    </div>
                    {getStatusBadge(batch.status)}
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Harvest Volume:</span>
                      <span className="font-bold text-slate-900">{batch.quantity_qtl} Quintals</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Harvest Date:</span>
                      <span>{batch.harvest_date}</span>
                    </div>
                  </div>

                  {/* Recommendation snippet if present */}
                  {batch.ai_recommendations && batch.ai_recommendations.length > 0 ? (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
                      <div className="font-bold text-emerald-900 flex items-center">
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        AI Advisory Ready
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Top Net Realization: <span className="font-bold">{formatINR(batch.ai_recommendations[0].net_realization)}</span>
                      </div>
                    </div>
                  ) : batch.status === 'PENDING_SIMULATION' ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                      <div className="text-amber-800 text-[11px]">
                        Simulation pending. In Phase 1, you can publish directly to the marketplace to accept buyer bids!
                      </div>
                      <button
                        onClick={() => handlePublish(batch.batch_id)}
                        className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish to Marketplace</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/farmer/batch/${batch.batch_id}`}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <span>View Batch & Book Deals</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* VIEW 2: FARM WAREHOUSE INVENTORY & STOCK LEDGER */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Farm Location & Silo Address Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Warehouse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Farm Storage & Warehouse Coordinates</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {profile?.location?.address || 'Navalgund Taluk, Hubballi Mandi Road, Karnataka'}
                </p>
                <div className="flex items-center space-x-3 mt-1 text-[11px] font-mono text-emerald-700">
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    Lat: {profile?.location?.latitude ? Number(profile.location.latitude).toFixed(6) : '15.364700'}° N
                  </span>
                  <span>•</span>
                  <span>
                    Lng: {profile?.location?.longitude ? Number(profile.location.longitude).toFixed(6) : '75.124000'}° E
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2 shrink-0 self-start md:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Harvest to Inventory</span>
            </button>
          </div>

          {/* Stock Summary Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 text-xs font-medium block">Total Farm Stock</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {myBatches.reduce((acc, b) => acc + (b.quantity_qtl || 0), 0)} <span className="text-xs font-bold text-slate-500">qtl</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                {myBatches.length} Registered Lots
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 text-xs font-medium block">Estimated Asset Value</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {formatINR(myBatches.reduce((acc, b) => acc + ((b.quantity_qtl || 0) * (b.min_price_per_qtl || 2000)), 0))}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Calculated at Floor Reserve
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 text-xs font-medium block">Active on Wholesaler Board</span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {myBatches.filter(b => b.status === 'LISTED_ACTIVE').reduce((acc, b) => acc + (b.quantity_qtl || 0), 0)} <span className="text-xs font-bold text-slate-500">qtl</span>
              </div>
              <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
                Visible to all buyers
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-slate-400 text-xs font-medium block">In Storage / Silo</span>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {myBatches.filter(b => b.status === 'PENDING_SIMULATION' || b.status === 'DRAFT').reduce((acc, b) => acc + (b.quantity_qtl || 0), 0)} <span className="text-xs font-bold text-slate-500">qtl</span>
              </div>
              <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
                Ready to be published
              </span>
            </div>
          </div>

          {/* Stock Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Farm Stock Ledger</h3>
                <p className="text-xs text-slate-500">All harvested produce currently stored on-farm and available for trade</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {myBatches.length} Stock Lots
              </span>
            </div>

            {myBatches.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No crops in inventory. Click "Add Harvest to Inventory" above to record newly harvested produce.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-6">Crop & Variety</th>
                      <th className="py-3 px-4">Available Stock</th>
                      <th className="py-3 px-4">Min Reservation Price</th>
                      <th className="py-3 px-4">Est. Lot Value</th>
                      <th className="py-3 px-4">Harvest Date</th>
                      <th className="py-3 px-4">Market Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myBatches.map(batch => (
                      <tr key={batch.batch_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{batch.crop}</div>
                          <div className="text-[11px] text-slate-400">{batch.variety}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {batch.quantity_qtl} qtl
                        </td>
                        <td className="py-4 px-4 font-bold text-emerald-700">
                          {formatINR(batch.min_price_per_qtl || 2000)} / qtl
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800">
                          {formatINR((batch.quantity_qtl || 0) * (batch.min_price_per_qtl || 2000))}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium text-slate-700">{batch.harvest_date}</span>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(batch.status)}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          {batch.status === 'PENDING_SIMULATION' && (
                            <button
                              onClick={() => handlePublish(batch.batch_id)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Publish to Board
                            </button>
                          )}
                          <Link
                            to={`/farmer/batch/${batch.batch_id}`}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-[11px] inline-block transition-colors"
                          >
                            Inspect Bids
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Register Harvest Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Register New Harvest</h3>
                <p className="text-xs text-slate-500">Creates batch with initial status PENDING_SIMULATION</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {dateError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{dateError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterHarvest} className="space-y-4">
              
              {/* Crop Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Crop Commodity</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                >
                  <option value="Tomato">Tomato (Perishable)</option>
                  <option value="Onion">Onion (Semi-Perishable)</option>
                  <option value="Green Chilli">Green Chilli (Perishable)</option>
                  <option value="Potato">Potato (Storable)</option>
                  <option value="Garlic">Garlic</option>
                  <option value="Ginger">Ginger</option>
                </select>
              </div>

              {/* Variety */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Crop Variety / Grade</label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="e.g. Vaishali Red / Grade A"
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Harvest Quantity (Quintals)</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Minimum Reservation Price Per Quintal */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Minimum Reservation Price (₹ / Quintal)</label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Floor Price
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={minPricePerQtl}
                    onChange={(e) => setMinPricePerQtl(Number(e.target.value))}
                    required
                    placeholder="e.g. 2100"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Floor reservation: Wholesaler bids lower than this floor will be flagged/penalized.
                </p>
              </div>

              {/* Harvest Date with 2-day relaxation rule */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Harvest Date</label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    2-Day Backdating Limit
                  </span>
                </div>
                <input
                  type="date"
                  min={minHarvestDate}
                  max={maxHarvestDate}
                  value={harvestDate}
                  onChange={(e) => {
                    setHarvestDate(e.target.value);
                    setDateError('');
                  }}
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-500">
                  Relaxation rule: Harvest date can only be backdated up to 2 days (48 hours) to ensure produce shelf-life integrity.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  {isSubmitting ? 'Registering...' : 'Register Batch'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
