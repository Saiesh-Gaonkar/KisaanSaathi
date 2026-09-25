import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBatches, useBids, useDeals } from '../../hooks/useRealtime';
import { 
  placeBuyerBid, 
  verifyScalePin, 
  submitDealReview, 
  formatINR 
} from '../../services/firebase';
import type { InventoryBatch, DealAndReview } from '../../types';
import { 
  Store, 
  Star, 
  CheckCircle2, 
  KeyRound,
  TrendingUp,
  Package,
  MapPin,
  Boxes,
  AlertCircle
} from 'lucide-react';

export const WholesalerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { batches, loading: batchesLoading } = useBatches();
  const { bids } = useBids();
  const { deals } = useDeals();

  const [wholesalerTab, setWholesalerTab] = useState<'exchange' | 'farmer_stock'>('exchange');
  const [selectedCrop, setSelectedCrop] = useState<string>('ALL');
  const [biddingBatch, setBiddingBatch] = useState<InventoryBatch | null>(null);
  const [offeredPrice, setOfferedPrice] = useState<number>(2200);
  const [deliveryTerm, setDeliveryTerm] = useState<'EX_FARM' | 'FOR_MANDI'>('EX_FARM');
  const [submittingBid, setSubmittingBid] = useState(false);

  // Delivery Scale PIN verification state
  const [scalePinInputs, setScalePinInputs] = useState<Record<string, string>>({});
  const [pinVerifying, setPinVerifying] = useState<Record<string, boolean>>({});
  const [pinError, setPinError] = useState<Record<string, string>>({});

  // Review states
  const [farmerRating, setFarmerRating] = useState<Record<string, number>>({});
  const [reviewedDeals, setReviewedDeals] = useState<Record<string, boolean>>({});

  // Filter batches with status == "LISTED_ACTIVE"
  const activeBatches = batches.filter(b => {
    const isListed = b.status === 'LISTED_ACTIVE';
    if (!isListed) return false;
    if (selectedCrop === 'ALL') return true;
    return b.crop.toLowerCase() === selectedCrop.toLowerCase();
  });

  // Filter my bids
  const myBids = bids.filter(b => b.buyer_id === profile?.uid);
  // Filter my deals
  const myDeals = deals.filter(d => d.buyer_id === profile?.uid);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !biddingBatch) return;
    try {
      setSubmittingBid(true);
      await placeBuyerBid(
        biddingBatch.batch_id,
        profile.uid,
        profile.name,
        profile.trust_score,
        Number(offeredPrice),
        deliveryTerm
      );
      setBiddingBatch(null);
    } catch (err) {
      console.error('Failed to place bid:', err);
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleVerifyScalePin = async (dealId: string) => {
    const pin = scalePinInputs[dealId];
    if (!pin || pin.length < 4) {
      setPinError(prev => ({ ...prev, [dealId]: 'Enter valid 4-digit PIN' }));
      return;
    }
    setPinVerifying(prev => ({ ...prev, [dealId]: true }));
    setPinError(prev => ({ ...prev, [dealId]: '' }));
    
    const ok = await verifyScalePin(dealId, pin);
    setPinVerifying(prev => ({ ...prev, [dealId]: false }));
    if (!ok) {
      setPinError(prev => ({ ...prev, [dealId]: 'Incorrect PIN. Verify with transporter.' }));
    }
  };

  const handleReviewSubmit = async (deal: DealAndReview) => {
    const rating = farmerRating[deal.deal_id] || 5;
    if (profile) {
      await submitDealReview(deal.deal_id, 'wholesaler', rating, deal.farmer_id);
      setReviewedDeals(prev => ({ ...prev, [deal.deal_id]: true }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <Store className="w-4 h-4" />
            <span>Wholesaler & Buyer Exchange</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            {profile?.name}
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Browse verified harvest inventory batches, place Ex-Farm or Mandi gate bids, and confirm delivery arrivals with the 2-step scale verification PIN.
          </p>
        </div>

        {/* Reputation Card */}
        <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-4 text-xs space-y-2 shrink-0">
          <div className="flex items-center justify-between space-x-4">
            <span className="text-blue-200">Buyer Rating:</span>
            <div className="flex items-center font-bold text-amber-300">
              <Star className="w-4 h-4 fill-amber-300 mr-1" />
              {profile?.trust_score.toFixed(1)} / 5.0
            </div>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span className="text-blue-200">Completed Trades:</span>
            <span className="font-bold text-white">{profile?.completed_deals_count} fulfilled</span>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span className="text-blue-200">Standing:</span>
            <span className="font-bold text-emerald-300 uppercase">{profile?.user_status}</span>
          </div>
        </div>
      </div>

      {/* ACTIVE DEALS / SCALE PIN VERIFICATION (IF ANY) */}
      {myDeals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Your Active Contracts & Delivery Confirmations</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Scale Weighing Protocol</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myDeals.map(deal => (
              <div 
                key={deal.deal_id}
                className={`p-5 rounded-2xl border ${
                  deal.status === 'FULFILLED' ? 'border-purple-200 bg-purple-50/20' : 'border-blue-200 bg-blue-50/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{deal.crop} ({deal.quantity_qtl} qtl)</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Farmer: <span className="font-semibold text-slate-800">{deal.farmer_name}</span> • Driver: <span className="font-semibold text-slate-800">{deal.transporter_name}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    deal.status === 'FULFILLED' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {deal.status}
                  </span>
                </div>

                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <span>Agreed Price per Quintal:</span>
                  <span className="text-base font-black text-emerald-700">{formatINR(deal.agreed_price_per_qtl)}/qtl</span>
                </div>

                {/* Step 3: Enter Delivery Scale PIN */}
                {deal.status !== 'FULFILLED' && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Verify Produce Delivery (Enter Scale PIN):
                    </span>
                    <p className="text-[11px] text-slate-500">
                      When transporter delivers cargo to your warehouse or mandi stall, enter the delivery PIN to confirm receipt.
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-digit PIN"
                        value={scalePinInputs[deal.deal_id] || ''}
                        onChange={(e) => setScalePinInputs(prev => ({ ...prev, [deal.deal_id]: e.target.value }))}
                        className="w-32 py-2 px-3 text-center tracking-widest font-mono font-bold text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                      />
                      <button
                        onClick={() => handleVerifyScalePin(deal.deal_id)}
                        disabled={pinVerifying[deal.deal_id]}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        {pinVerifying[deal.deal_id] ? 'Verifying...' : 'Verify Delivery'}
                      </button>
                    </div>
                    {pinError[deal.deal_id] && (
                      <div className="text-[11px] text-red-600 font-semibold">{pinError[deal.deal_id]}</div>
                    )}
                  </div>
                )}

                {/* Mutual Review Unlock once FULFILLED */}
                {deal.status === 'FULFILLED' && !reviewedDeals[deal.deal_id] && (
                  <div className="mt-4 pt-3 border-t border-purple-200 space-y-2">
                    <div className="text-xs font-bold text-purple-900">Rate Farmer's Produce Quality & Accuracy</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setFarmerRating(prev => ({ ...prev, [deal.deal_id]: star }))}
                            className="p-0.5"
                          >
                            <Star className={`w-4 h-4 ${
                              (farmerRating[deal.deal_id] || 5) >= star 
                                ? 'text-amber-500 fill-amber-400' 
                                : 'text-slate-300'
                            }`} />
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleReviewSubmit(deal)}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold"
                      >
                        Submit Review
                      </button>
                    </div>
                  </div>
                )}

                {reviewedDeals[deal.deal_id] && (
                  <div className="mt-3 text-xs text-emerald-700 font-semibold flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Produce review logged.
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
          onClick={() => setWholesalerTab('exchange')}
          className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            wholesalerTab === 'exchange'
              ? 'border-blue-600 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Active Produce Marketplace</span>
          <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
            {activeBatches.length} Live Batches
          </span>
        </button>

        <button
          onClick={() => setWholesalerTab('farmer_stock')}
          className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            wholesalerTab === 'farmer_stock'
              ? 'border-blue-600 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Farmer Available Stock & Farm Directory</span>
          <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {batches.length} Farm Lots
          </span>
        </button>
      </div>

      {/* VIEW 1: ACTIVE MARKETPLACE (LISTED_ACTIVE BATCHES) */}
      {wholesalerTab === 'exchange' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Crop Batches for Direct Bidding</h2>
              <p className="text-xs text-slate-500">Only batches with status LISTED_ACTIVE appear in this exchange.</p>
            </div>

            {/* Crop Filter Pill Buttons */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              {['ALL', 'Tomato', 'Onion', 'Green Chilli', 'Potato'].map(cropName => (
                <button
                  key={cropName}
                  onClick={() => setSelectedCrop(cropName)}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    selectedCrop.toLowerCase() === cropName.toLowerCase()
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {cropName}
                </button>
              ))}
            </div>
          </div>

          {batchesLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading live marketplace...</div>
          ) : activeBatches.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No Active Crops in this Category</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Batches will show up here once farmers register and publish them to LISTED_ACTIVE. (You can switch to Farmer persona to publish!)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBatches.map(batch => (
                <div 
                  key={batch.batch_id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {batch.crop}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1">{batch.variety}</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        LIVE
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Available Lot:</span>
                        <span className="font-bold text-slate-900">{batch.quantity_qtl} Quintals</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Min Floor Price:</span>
                        <span className="font-bold text-emerald-700">{formatINR(batch.min_price_per_qtl || 2000)} / qtl</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Harvest Date:</span>
                        <span>{batch.harvest_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Farmer:</span>
                        <span className="font-semibold text-slate-800">{batch.farmer_name || 'Farmer'}</span>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-500 flex items-center">
                        <MapPin className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                        <span className="truncate">
                          {batch.farmer_location?.address ? batch.farmer_location.address.slice(0, 30) + '...' : 'Hubballi Mandi'} ({batch.farmer_location?.latitude ? batch.farmer_location.latitude.toFixed(4) : '15.3647'}° N, {batch.farmer_location?.longitude ? batch.farmer_location.longitude.toFixed(4) : '75.1240'}° E)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setBiddingBatch(batch);
                        setOfferedPrice(batch.min_price_per_qtl || 2200);
                      }}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>Place Bid on Batch</span>
                      <TrendingUp className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: FARMER AVAILABLE STOCK DIRECTORY */}
      {wholesalerTab === 'farmer_stock' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Farmer Farmgate Stock & Available Inventory</h2>
            <p className="text-xs text-slate-500">
              Browse current farm inventory stock available directly from registered farmers with verified GPS locations and reservation floor prices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map(batch => (
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
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">{batch.variety}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      batch.status === 'LISTED_ACTIVE' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {batch.status === 'LISTED_ACTIVE' ? 'LISTED ACTIVE' : 'FARM STOCK'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Available Stock:</span>
                      <span className="font-extrabold text-slate-900">{batch.quantity_qtl} Quintals</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min Reservation Price:</span>
                      <span className="font-bold text-emerald-700">{formatINR(batch.min_price_per_qtl || 2000)} / qtl</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Lot Valuation:</span>
                      <span className="font-semibold text-slate-800">{formatINR((batch.quantity_qtl || 0) * (batch.min_price_per_qtl || 2000))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Farmer:</span>
                      <span className="font-semibold text-slate-800">{batch.farmer_name || 'Farmer'}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="text-[11px] font-medium text-slate-700 flex items-start">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 mt-0.5 shrink-0" />
                        <span>{batch.farmer_location?.address || 'Navalgund Taluk, Hubballi, Karnataka'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 pl-4">
                        GPS: {batch.farmer_location?.latitude ? batch.farmer_location.latitude.toFixed(6) : '15.364700'}° N, {batch.farmer_location?.longitude ? batch.farmer_location.longitude.toFixed(6) : '75.124000'}° E
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setBiddingBatch(batch);
                      setOfferedPrice(batch.min_price_per_qtl || 2200);
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Bid on Farmer Stock</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY BIDS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">My Submitted Bids</h3>
          <span className="text-xs font-semibold text-slate-500">
            {myBids.length} {myBids.length === 1 ? 'Bid' : 'Bids'}
          </span>
        </div>

        {myBids.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            You haven't submitted any bids yet. Choose an active harvest batch above to place an offer.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBids.map(bid => (
              <div key={bid.bid_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">
                    {formatINR(bid.offered_price_per_qtl)} / qtl
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    bid.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                    bid.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {bid.status}
                  </span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Delivery Term:</span>
                  <span className="font-semibold text-slate-800">
                    {bid.delivery_term === 'EX_FARM' ? 'Ex-Farm (Pickup)' : 'FOR Mandi (Delivered)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bid Modal */}
      {biddingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Submit Bid</h3>
                <p className="text-xs text-slate-500">
                  {biddingBatch.crop} • {biddingBatch.variety} ({biddingBatch.quantity_qtl} qtl)
                </p>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center">
                  <MapPin className="w-3 h-3 mr-0.5" />
                  <span>
                    Farm: {biddingBatch.farmer_location?.latitude ? biddingBatch.farmer_location.latitude.toFixed(4) : '15.3647'}° N, {biddingBatch.farmer_location?.longitude ? biddingBatch.farmer_location.longitude.toFixed(4) : '75.1240'}° E
                  </span>
                </div>
              </div>
              <button
                onClick={() => setBiddingBatch(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Minimum Floor Price Indicator */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Farmer Minimum Floor Price:</span>
              <span className="font-extrabold text-emerald-700">{formatINR(biddingBatch.min_price_per_qtl || 2000)} / qtl</span>
            </div>

            {offeredPrice < (biddingBatch.min_price_per_qtl || 0) && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Notice: Your offered price (₹{offeredPrice}) is below the farmer's reservation floor ({formatINR(biddingBatch.min_price_per_qtl)}/qtl). AI matchmaking may deprioritize or reject this bid.
                </span>
              </div>
            )}

            <form onSubmit={handlePlaceBid} className="space-y-4">
              
              {/* Price Per Quintal */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Offered Price (₹ / Quintal)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(Number(e.target.value))}
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Delivery Term Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery Term</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryTerm('EX_FARM')}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                      deliveryTerm === 'EX_FARM' 
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div>Ex-Farm</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Buyer handles transport</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryTerm('FOR_MANDI')}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                      deliveryTerm === 'FOR_MANDI' 
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div>FOR Mandi</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Delivered to Mandi Gate</div>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBiddingBatch(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBid}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  {submittingBid ? 'Submitting...' : 'Submit Bid'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
