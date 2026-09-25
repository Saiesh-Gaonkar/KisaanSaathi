import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBatches, useBids, useRoutes } from '../../hooks/useRealtime';
import { 
  acceptDeal, 
  publishBatchToMarketplace, 
  formatINR,
  isLiveFirebaseConfigured,
  auth
} from '../../services/firebase';
import { runSimulation, checkEngineHealth } from '../../services/aiSimulation';
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
  Info,
  MapPin,
  Zap,
  Loader2,
  Brain,
  ShieldCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

// Simulation progress stages for the animated loading sequence
const SIMULATION_STAGES = [
  { label: 'Connecting to CrewAI Engine', icon: Zap, duration: 2000 },
  { label: 'Agent 1: Market Intelligence Analyst scanning mandis & bids...', icon: TrendingUp, duration: 8000 },
  { label: 'Agent 2: Logistics & Risk Analyst computing routes & shrinkage...', icon: Truck, duration: 8000 },
  { label: 'Agent 3: Lead Economic Strategist ranking optimal channels...', icon: Brain, duration: 8000 },
  { label: 'Finalizing AI recommendations...', icon: ShieldCheck, duration: 3000 },
];

export const BatchDetailView: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { profile, user } = useAuth();
  
  const { batches } = useBatches();
  const { bids } = useBids(batchId);
  const { routes } = useRoutes();

  const [selectedBidId, setSelectedBidId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // AI Simulation states
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationStage, setSimulationStage] = useState(0);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationSuccess, setSimulationSuccess] = useState(false);
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  const batch = batches.find(b => b.batch_id === batchId);

  // Filter available routes
  const availableRoutes = routes.filter(r => r.status === 'AVAILABLE');
  // Filter open bids
  const openBids = bids.filter(b => b.status === 'OPEN');

  const selectedBid = bids.find(b => b.bid_id === selectedBidId);
  const selectedRoute = routes.find(r => r.route_id === selectedRouteId);

  // Check engine health on mount when batch is PENDING_SIMULATION
  useEffect(() => {
    if (batch?.status === 'PENDING_SIMULATION') {
      checkEngineHealth().then(setEngineOnline);
    }
  }, [batch?.status]);

  // Animate through simulation stages
  useEffect(() => {
    if (!simulationRunning) return;
    if (simulationStage >= SIMULATION_STAGES.length) return;

    const timer = setTimeout(() => {
      setSimulationStage(prev => Math.min(prev + 1, SIMULATION_STAGES.length - 1));
    }, SIMULATION_STAGES[simulationStage].duration);

    return () => clearTimeout(timer);
  }, [simulationRunning, simulationStage]);

  const handlePublish = async () => {
    if (batchId) {
      await publishBatchToMarketplace(batchId);
    }
  };

  const handleRunSimulation = async () => {
    if (!batchId || !user) return;
    
    setSimulationRunning(true);
    setSimulationStage(0);
    setSimulationError(null);
    setSimulationSuccess(false);

    try {
      // Get Firebase ID token (live mode) or use demo token
      let idToken = 'demo-token';
      if (isLiveFirebaseConfigured && auth?.currentUser) {
        idToken = await auth.currentUser.getIdToken();
      }

      const result = await runSimulation(batchId, idToken);
      
      // Show the final stage briefly
      setSimulationStage(SIMULATION_STAGES.length - 1);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSimulationSuccess(true);
      setSimulationRunning(false);

      // The batch data will auto-refresh via Firestore onSnapshot
      console.log('Simulation completed:', result);
    } catch (err: any) {
      console.error('Simulation failed:', err);
      setSimulationError(
        err.detail || err.message || 'Simulation failed. Please ensure the CrewAI engine is running.'
      );
      setSimulationRunning(false);
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSimulation}
              disabled={simulationRunning || engineOnline === false}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-200 transition-all flex items-center space-x-2"
            >
              {simulationRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{simulationRunning ? 'Running AI Simulation...' : 'Run AI Multi-Agent Simulation'}</span>
            </button>
            <button
              onClick={handlePublish}
              disabled={simulationRunning}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Skip AI (Publish Directly)</span>
            </button>
          </div>
        )}
      </div>

      {/* Batch Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-medium block">Total Harvest Volume</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{batch.quantity_qtl} Quintals</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Reserve Floor Price</span>
          <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">{formatINR(batch.min_price_per_qtl || 2000)} / qtl</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Harvest Timestamp</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{batch.harvest_date}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Registered Farmer</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{batch.farmer_name || profile?.name}</span>
          <span className="text-[10px] text-slate-400 flex items-center mt-0.5">
            <MapPin className="w-2.5 h-2.5 mr-0.5" />
            {batch.farmer_location?.latitude ? Number(batch.farmer_location.latitude).toFixed(4) : '15.3647'}° N, {batch.farmer_location?.longitude ? Number(batch.farmer_location.longitude).toFixed(4) : '75.1240'}° E
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Market Discovery Status</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
            {batch.status === 'LISTED_ACTIVE' ? 'Active on Wholesaler Board' : batch.status}
          </span>
        </div>
      </div>

      {/* AI SIMULATION PROGRESS PANEL — Visible only while simulation runs */}
      {simulationRunning && (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 rounded-2xl border border-violet-700/30 shadow-xl p-8 space-y-6">
          {/* Animated background effect */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-violet-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-indigo-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative z-10 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-violet-500/20 backdrop-blur">
              <Brain className="w-6 h-6 text-violet-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">CrewAI Multi-Agent Simulation in Progress</h3>
              <p className="text-xs text-violet-300/80">Sequential 3-agent pipeline processing your batch...</p>
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            {SIMULATION_STAGES.map((stage, idx) => {
              const StageIcon = stage.icon;
              const isActive = idx === simulationStage;
              const isComplete = idx < simulationStage;
              const isPending = idx > simulationStage;

              return (
                <div
                  key={idx}
                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-500 ${
                    isActive
                      ? 'bg-violet-500/20 border border-violet-500/30'
                      : isComplete
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${
                    isActive ? 'bg-violet-500/30' : isComplete ? 'bg-emerald-500/30' : 'bg-white/10'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-violet-300 animate-spin" />
                    ) : (
                      <StageIcon className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-violet-200' : isComplete ? 'text-emerald-300' : 'text-slate-500'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="relative z-10">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((simulationStage + 1) / SIMULATION_STAGES.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-violet-400/60 mt-2 text-center">
              This typically takes 30–60 seconds as three AI agents deliberate sequentially
            </p>
          </div>
        </div>
      )}

      {/* SIMULATION ERROR */}
      {simulationError && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2 animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-bold">Simulation Failed</h3>
          </div>
          <p className="text-xs text-red-800">{simulationError}</p>
          <button
            onClick={() => setSimulationError(null)}
            className="text-xs font-semibold text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SIMULATION SUCCESS TOAST */}
      {simulationSuccess && !simulationRunning && batch.status === 'LISTED_ACTIVE' && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold">AI Simulation Completed Successfully!</h3>
          </div>
          <p className="text-xs text-emerald-800">
            The 3-agent CrewAI pipeline has analyzed your batch and generated ranked recommendations below.
            Batch status has advanced to <span className="font-bold">LISTED_ACTIVE</span>.
          </p>
        </div>
      )}

      {/* Engine offline warning */}
      {batch.status === 'PENDING_SIMULATION' && engineOnline === false && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold">CrewAI Engine Offline</div>
            <p>
              The simulation backend at <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">localhost:8000</code> is not reachable.
              Start it with <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">uvicorn app.main:app --reload</code> in the <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">crewai-engine</code> directory.
            </p>
          </div>
        </div>
      )}

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
                {/* Rank & Channel Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    idx === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Rank #{rec.rank || idx + 1}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      rec.channel_type === 'DIRECT_BUYER'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rec.channel_type === 'DIRECT_BUYER' ? 'Direct Buyer' : 'APMC Mandi'}
                    </span>
                  </div>
                </div>

                {/* Channel Name */}
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-800">{rec.channel_name}</span>
                  {rec.delivery_term && (
                    <span className={`ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      rec.delivery_term === 'EX_FARM'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {rec.delivery_term === 'EX_FARM' ? 'Ex-Farm' : 'FOR Mandi'}
                    </span>
                  )}
                </div>

                {/* Net Realization */}
                <div className="mt-3">
                  <span className="text-xs text-slate-500 font-medium">Net Realization (Total):</span>
                  <div className="text-2xl font-black text-emerald-800 tracking-tight">
                    {formatINR(rec.net_realization)}
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Revenue:</span>
                    <span className="font-semibold text-emerald-700">{formatINR(rec.gross_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics Cost:</span>
                    <span className="text-red-600 font-medium">−{formatINR(rec.c_logistics)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mandi Cess & Fees:</span>
                    <span className="text-red-600 font-medium">−{formatINR(rec.c_mandi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transit Shrinkage:</span>
                    <span className="text-red-600 font-medium">−{formatINR(rec.c_shrinkage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trust Risk Penalty:</span>
                    <span className="text-amber-700 font-medium">−{formatINR(rec.p_trust)}</span>
                  </div>
                </div>

                {/* AI Rationale */}
                <div className="mt-3 pt-2 text-[11px] italic text-slate-500 border-t border-slate-100">
                  <span className="font-semibold not-italic text-slate-600">AI Rationale: </span>
                  "{rec.economic_rationale}"
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No Automated AI Recommendation Yet</div>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              {batch.status === 'PENDING_SIMULATION'
                ? 'Click "Run AI Multi-Agent Simulation" above to trigger the 3-agent CrewAI pipeline. It will analyze market prices, logistics costs, and rank optimal sales channels for you.'
                : 'You can make a manual decision below by pairing an open buyer bid with an available transporter!'}
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
                    (Run AI Simulation or Publish to Marketplace so wholesalers can view and bid!)
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

                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 text-slate-600">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Total Vehicle Fare:</span>
                          <span className="text-sm font-extrabold text-emerald-800">
                            {formatINR(route.total_vehicle_price || Math.round((route.distance_km || 95) * route.tariff_per_km + (route.cleaning_charge || 300) + (route.labour_charge || 600) + (route.maintenance_charge || 400)))}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                          <div>Vehicle: <span className="font-semibold text-slate-800">{route.vehicle_type}</span></div>
                          <div>Capacity: <span className="font-semibold text-slate-800">{route.capacity_qtl} qtl</span></div>
                          <div>Distance: <span className="font-semibold text-slate-800">{route.distance_km || 95} km</span></div>
                          <div>Base Rate: <span className="font-semibold text-slate-800">₹{route.tariff_per_km}/km</span></div>
                        </div>

                        {/* Itemized Surcharges Breakdown */}
                        <div className="pt-1.5 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] text-center">
                          <div className="p-1 rounded bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block text-[9px]">Cleaning</span>
                            <span className="font-semibold text-slate-700">{formatINR(route.cleaning_charge ?? 300)}</span>
                          </div>
                          <div className="p-1 rounded bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block text-[9px]">Labour</span>
                            <span className="font-semibold text-slate-700">{formatINR(route.labour_charge ?? 600)}</span>
                          </div>
                          <div className="p-1 rounded bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block text-[9px]">Maint.</span>
                            <span className="font-semibold text-slate-700">{formatINR(route.maintenance_charge ?? 400)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <div className="flex items-center text-amber-600 font-semibold">
                            <Star className="w-3 h-3 fill-amber-500 mr-1" />
                            {route.transporter_trust_snapshot.toFixed(1)}★ Safety
                          </div>
                          <span className="text-slate-400 text-[10px]">
                            {route.is_backhaul ? 'Backhaul Discounted' : 'Standard Headhaul'}
                          </span>
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
