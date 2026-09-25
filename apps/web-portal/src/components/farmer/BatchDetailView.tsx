import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBatches, useBids, useRoutes } from '../../hooks/useRealtime';
import { 
  acceptDeal, 
  publishBatchToMarketplace, 
  formatINR 
} from '../../services/firebase';
import { 
  ArrowLeft, 
  Sparkles, 
  Store, 
  Truck, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  ChevronRight,
  Info
} from 'lucide-react';

export const BatchDetailView: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { profile } = useAuth();
  
  const { batches } = useBatches();
  const { bids } = useBids(batchId);
  const { routes } = useRoutes();

  const [selectedBidId, setSelectedBidId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const batch = batches.find(b => b.batch_id === batchId);

  // Filter available routes
  const availableRoutes = routes.filter(r => r.status === 'AVAILABLE');
  // Filter open bids
  const openBids = bids.filter(b => b.status === 'OPEN');

  const selectedBid = bids.find(b => b.bid_id === selectedBidId);
  const selectedRoute = routes.find(r => r.route_id === selectedRouteId);

  const handlePublish = async () => {
    if (batchId) {
      await publishBatchToMarketplace(batchId);
    }
  };

  const handleConfirmDeal = async () => {
    if (!batch || !selectedBid || !selectedRoute) return;
    try {
      setBookingInProgress(true);
      const dealId = await acceptDeal(batch, selectedBid, selectedRoute);
      setBookingSuccess(dealId);
    } catch (err) {
      console.error('Error accepting deal:', err);
    } finally {
      setBookingInProgress(false);
    }
  };

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Harvest Batch Not Found</h2>
        <p className="text-sm text-slate-500">The batch ID may be invalid or loading from Firestore.</p>
        <Link to="/farmer" className="inline-flex items-center text-emerald-600 font-semibold text-sm hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  const isMatchedOrFulfilled = batch.status === 'MATCHED_IN_TRANSIT' || batch.status === 'FULFILLED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/farmer" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Harvest Inventory
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {batch.crop} — {batch.variety}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {batch.status}
            </span>
          </div>
        </div>

        {batch.status === 'PENDING_SIMULATION' && (
          <button
            onClick={handlePublish}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish to Marketplace (Skip AI Simulation)</span>
          </button>
        )}
      </div>

      {/* Batch Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-medium block">Total Harvest Volume</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{batch.quantity_qtl} Quintals</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Harvest Timestamp</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{batch.harvest_date}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Registered Farmer</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{batch.farmer_name || profile?.name}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Market Discovery Status</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
            {batch.status === 'LISTED_ACTIVE' ? 'Active on Wholesaler Board' : batch.status}
          </span>
        </div>
      </div>

      {/* SECTION 1: AI RECOMMENDATIONS (Rendered if present, empty state if null) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">AI Co-Pilot Economic Advisory Cards</h2>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            CrewAI Decision Engine
          </span>
        </div>

        {batch.ai_recommendations && batch.ai_recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batch.ai_recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className={`p-5 rounded-2xl border transition-all ${
                  idx === 0 
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30' 
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    idx === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Rank #{rec.rank || idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{rec.channel}</span>
                </div>

                <div className="mt-3">
                  <span className="text-xs text-slate-500 font-medium">Estimated Net Realization:</span>
                  <div className="text-2xl font-black text-emerald-800 tracking-tight">
                    {formatINR(rec.net_realization)}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Bid:</span>
                    <span className="font-semibold">{formatINR(rec.gross_price_per_qtl)}/qtl</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics Deduction:</span>
                    <span className="text-red-600">-{formatINR(rec.estimated_freight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mandi Cess & Labor:</span>
                    <span className="text-red-600">-{formatINR(rec.estimated_mandi_fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transit Decay & Shrinkage:</span>
                    <span className="text-red-600">-{formatINR(rec.estimated_shrinkage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trust Risk Penalty:</span>
                    <span className="text-amber-700">-{formatINR(rec.trust_risk_penalty)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-[11px] italic text-slate-500 border-t border-slate-100">
                  "{rec.economic_rationale}"
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No Automated AI Recommendation Yet</div>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              In Phase 1, multi-agent reasoning is isolated. You can make an immediate manual decision below by pairing an open buyer bid with an available transporter!
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: RAW MARKET DATA (MANUAL BOOKING ENGINE) */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Manual Booking Desk: Select Bid & Matching Freight
          </h2>
          <p className="text-xs text-slate-500">
            Pair an open wholesaler offer with an available backhaul transport route to lock in the deal and initiate the 2-step PIN handshake.
          </p>
        </div>

        {/* Success Notice if just booked */}
        {bookingSuccess && (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2 animate-fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-base font-extrabold">Deal Successfully Created & Locked!</h3>
            </div>
            <p className="text-xs text-emerald-800">
              The batch has transitioned to <span className="font-bold">MATCHED_IN_TRANSIT</span>. Head back to your dashboard to view your 2-step PIN verification handshake codes to hand over to the transporter.
            </p>
            <div className="pt-2">
              <Link to="/farmer" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-block">
                View Handshake PINs in Dashboard
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* COLUMN 1: Open Buyer Bids */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Step 1: Select Wholesaler Bid</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {openBids.length} {openBids.length === 1 ? 'Open Bid' : 'Open Bids'}
              </span>
            </div>

            {openBids.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No open bids submitted on this batch yet.
                {batch.status === 'PENDING_SIMULATION' && (
                  <div className="mt-2 text-amber-700 font-medium">
                    (Click "Publish to Marketplace" above so wholesalers can view and bid!)
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {openBids.map(bid => {
                  const isSelected = selectedBidId === bid.bid_id;
                  return (
                    <div
                      key={bid.bid_id}
                      onClick={() => !isMatchedOrFulfilled && setSelectedBidId(bid.bid_id)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="selected_bid"
                            checked={isSelected}
                            onChange={() => setSelectedBidId(bid.bid_id)}
                            disabled={isMatchedOrFulfilled}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-bold text-slate-900 text-sm">
                            {formatINR(bid.offered_price_per_qtl)} / qtl
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                          bid.delivery_term === 'EX_FARM' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {bid.delivery_term === 'EX_FARM' ? 'Ex-Farm (Pickup)' : 'FOR Mandi (Delivered)'}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600">
                        <div>Buyer: <span className="font-semibold text-slate-800">{bid.buyer_name || 'Wholesaler'}</span></div>
                        <div className="flex items-center text-amber-600 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" />
                          {bid.buyer_trust_snapshot.toFixed(1)}★
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMN 2: Available Transporter Routes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Step 2: Select Freight Route</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {availableRoutes.length} Available
              </span>
            </div>

            {availableRoutes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active transporter routes declared yet.
              </div>
            ) : (
              <div className="space-y-3">
                {availableRoutes.map(route => {
                  const isSelected = selectedRouteId === route.route_id;
                  return (
                    <div
                      key={route.route_id}
                      onClick={() => !isMatchedOrFulfilled && setSelectedRouteId(route.route_id)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="selected_route"
                            checked={isSelected}
                            onChange={() => setSelectedRouteId(route.route_id)}
                            disabled={isMatchedOrFulfilled}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="font-bold text-slate-900">
                            {route.origin} <span className="text-slate-400">→</span> {route.destination}
                          </span>
                        </div>
                        {route.is_backhaul && (
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-green-100 text-green-800">
                            Backhaul Discount
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-slate-600">
                        <div>Vehicle: <span className="font-semibold text-slate-800">{route.vehicle_type}</span></div>
                        <div>Capacity: <span className="font-semibold text-slate-800">{route.capacity_qtl} qtl</span></div>
                        <div>Rate: <span className="font-semibold text-slate-800">₹{route.tariff_per_km}/km</span></div>
                        <div className="flex items-center text-amber-600 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" />
                          {route.transporter_trust_snapshot.toFixed(1)}★ Trust
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Action Confirm Button */}
        {!isMatchedOrFulfilled && (
          <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold">Ready to Match & Book?</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedBid && selectedRoute 
                  ? `Pairing ${selectedBid.buyer_name} with ${selectedRoute.transporter_name} at ${formatINR(selectedBid.offered_price_per_qtl)}/qtl`
                  : 'Please pick one buyer bid and one transporter route to proceed.'}
              </p>
            </div>

            <button
              onClick={handleConfirmDeal}
              disabled={!selectedBidId || !selectedRouteId || bookingInProgress}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center space-x-2 shrink-0"
            >
              <span>{bookingInProgress ? 'Creating Deal...' : 'Accept Offer & Form Deal'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
