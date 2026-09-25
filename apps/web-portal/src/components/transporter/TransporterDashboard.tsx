import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRoutes, useDeals } from '../../hooks/useRealtime';
import { 
  declareTransporterRoute, 
  verifyFarmgatePin,
  formatINR 
} from '../../services/firebase';
import { 
  Truck, 
  Plus, 
  Star, 
  CheckCircle2, 
  KeyRound
} from 'lucide-react';

export const TransporterDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { routes, loading: routesLoading } = useRoutes();
  const { deals } = useDeals();

  const [showModal, setShowModal] = useState(false);
  const [vehicleType, setVehicleType] = useState('Tata 407 (3.5T)');
  const [capacity, setCapacity] = useState<number>(35);
  const [origin, setOrigin] = useState('Hubballi');
  const [destination, setDestination] = useState('Belagavi APMC');
  const [distanceKm, setDistanceKm] = useState<number>(95);
  const [tariff, setTariff] = useState<number>(14.5);
  const [cleaningCharge, setCleaningCharge] = useState<number>(300);
  const [labourCharge, setLabourCharge] = useState<number>(600);
  const [maintenanceCharge, setMaintenanceCharge] = useState<number>(400);
  const [isBackhaul, setIsBackhaul] = useState(true);
  const [submittingRoute, setSubmittingRoute] = useState(false);

  // Live total calculation
  const totalVehiclePrice = Math.round((distanceKm * tariff) + cleaningCharge + labourCharge + maintenanceCharge);

  // Farmgate PIN input states
  const [farmgatePinInputs, setFarmgatePinInputs] = useState<Record<string, string>>({});
  const [verifyingPin, setVerifyingPin] = useState<Record<string, boolean>>({});
  const [pinError, setPinError] = useState<Record<string, string>>({});

  // Filter transporter's own routes
  const myRoutes = routes.filter(r => r.transporter_id === profile?.uid);
  // Filter transporter's deals
  const myDeals = deals.filter(d => d.transporter_id === profile?.uid);

  const handleDeclareRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSubmittingRoute(true);
      await declareTransporterRoute(
        profile.uid,
        profile.name,
        profile.trust_score,
        vehicleType,
        Number(capacity),
        origin.trim(),
        destination.trim(),
        Number(distanceKm),
        isBackhaul,
        Number(tariff),
        Number(cleaningCharge),
        Number(labourCharge),
        Number(maintenanceCharge)
      );
      setShowModal(false);
    } catch (err) {
      console.error('Failed to declare route:', err);
    } finally {
      setSubmittingRoute(false);
    }
  };

  const handleVerifyFarmgatePin = async (dealId: string) => {
    const pin = farmgatePinInputs[dealId];
    if (!pin || pin.length < 4) {
      setPinError(prev => ({ ...prev, [dealId]: 'Enter 4-digit PIN' }));
      return;
    }
    setVerifyingPin(prev => ({ ...prev, [dealId]: true }));
    setPinError(prev => ({ ...prev, [dealId]: '' }));

    const ok = await verifyFarmgatePin(dealId, pin);
    setVerifyingPin(prev => ({ ...prev, [dealId]: false }));
    if (!ok) {
      setPinError(prev => ({ ...prev, [dealId]: 'Incorrect PIN. Verify with farmer.' }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-yellow-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-900/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-amber-200 text-xs font-semibold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Transporter Freight & Dispatch Board</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            {profile?.name}
          </h1>
          <p className="text-amber-100 text-sm mt-1 max-w-xl">
            Declare empty return backhaul corridors to eliminate deadhead miles, confirm farmgate cargo pickups with PIN verification, and get paid without intermediaries.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-white text-amber-900 hover:bg-amber-50 font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>Declare New Route</span>
          </button>
        </div>
      </div>

      {/* ACTIVE TRIPS & FARMGATE PIN VERIFICATION */}
      {myDeals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Assigned Transit Trips & Farmgate Handshakes</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Pickup Custody Protocol</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myDeals.map(deal => (
              <div 
                key={deal.deal_id}
                className={`p-5 rounded-2xl border ${
                  deal.status === 'FULFILLED' ? 'border-purple-200 bg-purple-50/20' : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{deal.crop} ({deal.quantity_qtl} Quintals)</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Farmer: <span className="font-semibold text-slate-800">{deal.farmer_name}</span> • Buyer: <span className="font-semibold text-slate-800">{deal.buyer_name}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    deal.status === 'FULFILLED' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {deal.status}
                  </span>
                </div>

                {/* Step 2: Enter Farmgate PIN */}
                {!deal.verification_pins.farmgate_verified ? (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Verify Farmgate Cargo Pickup (Enter Farmer's PIN):
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Ask the farmer for their Farmgate PIN at the farm before loading produce.
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-digit PIN"
                        value={farmgatePinInputs[deal.deal_id] || ''}
                        onChange={(e) => setFarmgatePinInputs(prev => ({ ...prev, [deal.deal_id]: e.target.value }))}
                        className="w-32 py-2 px-3 text-center tracking-widest font-mono font-bold text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                      />
                      <button
                        onClick={() => handleVerifyFarmgatePin(deal.deal_id)}
                        disabled={verifyingPin[deal.deal_id]}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        {verifyingPin[deal.deal_id] ? 'Verifying...' : 'Confirm Pickup'}
                      </button>
                    </div>
                    {pinError[deal.deal_id] && (
                      <div className="text-[11px] text-red-600 font-semibold">{pinError[deal.deal_id]}</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-emerald-700 font-semibold flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                      Farmgate pickup verified! In transit to buyer scale.
                    </div>
                    {deal.status === 'FULFILLED' && (
                      <span className="text-purple-700 font-bold">Delivery Completed!</span>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY DECLARED ROUTES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Declared Freight Corridors</h2>
            <p className="text-xs text-slate-500">Farmers browse these routes when matching logistics for their crop batches.</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            {myRoutes.length} {myRoutes.length === 1 ? 'Route' : 'Routes'}
          </span>
        </div>

        {routesLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading declared routes...</div>
        ) : myRoutes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Routes Declared Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Declare your upcoming delivery or empty return backhaul route to receive crop cargo matches from nearby farmers.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700"
            >
              Declare First Route
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myRoutes.map(route => (
              <div 
                key={route.route_id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {route.vehicle_type}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-2 flex items-center space-x-1.5">
                        <span>{route.origin}</span>
                        <span className="text-slate-400">→</span>
                        <span>{route.destination}</span>
                      </h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      route.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {route.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-3 mt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Total Vehicle Fare:</span>
                      <span className="text-base font-extrabold text-emerald-800">
                        {formatINR(route.total_vehicle_price || Math.round((route.distance_km || 95) * route.tariff_per_km + (route.cleaning_charge || 300) + (route.labour_charge || 600) + (route.maintenance_charge || 400)))}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Route Distance:</span>
                      <span className="font-semibold text-slate-900">{route.distance_km || 95} km</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Available Capacity:</span>
                      <span className="font-bold text-slate-900">{route.capacity_qtl} Quintals</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Base Freight Rate:</span>
                      <span className="font-bold text-slate-800">₹{route.tariff_per_km} / km</span>
                    </div>

                    {/* Transparent fee breakdown pills */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-[10px] text-center">
                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[9px]">Cleaning</span>
                        <span className="font-bold text-slate-700">{formatINR(route.cleaning_charge ?? 300)}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[9px]">Labour</span>
                        <span className="font-bold text-slate-700">{formatINR(route.labour_charge ?? 600)}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[9px]">Maintenance</span>
                        <span className="font-bold text-slate-700">{formatINR(route.maintenance_charge ?? 400)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Backhaul Mode:</span>
                      <span className="font-semibold text-slate-800">
                        {route.is_backhaul ? 'Yes (Discounted)' : 'Standard Headhaul'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center text-amber-600 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" />
                    {route.transporter_trust_snapshot.toFixed(1)}★ Safety
                  </span>
                  <span>{route.status === 'CLAIMED' ? 'Booked by Farmer' : 'Open for matching'}</span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Declare Route Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Declare Freight Route & Vehicle Cost</h3>
                <p className="text-xs text-slate-500">Itemize distance tariff, cleaning, labour, and maintenance</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeclareRoute} className="space-y-4">
              
              {/* Vehicle Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                >
                  <option value="Tata 407 (3.5T)">Tata 407 (3.5 Ton / 35 qtl)</option>
                  <option value="Mahindra Bolero Pickup (1.7T)">Mahindra Bolero Pickup (1.7 Ton / 17 qtl)</option>
                  <option value="Eicher Pro 2049 (4.9T)">Eicher Pro 2049 (4.9 Ton / 50 qtl)</option>
                  <option value="Tata Ace Gold (0.75T)">Tata Ace (0.75 Ton / 8 qtl)</option>
                </select>
              </div>

              {/* Capacity & Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Capacity (Quintals)</label>
                  <input
                    type="number"
                    min="5"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Estimated Distance (KM)</label>
                  <input
                    type="number"
                    min="5"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                  />
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Origin Corridor</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Hubballi"
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Destination</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Belagavi APMC"
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                  />
                </div>
              </div>

              {/* Tariff per KM */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Base Freight Tariff Rate (₹ / KM)</label>
                <input
                  type="number"
                  min="5"
                  step="0.5"
                  value={tariff}
                  onChange={(e) => setTariff(Number(e.target.value))}
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                />
              </div>

              {/* Fee Breakdown Inputs: Cleaning, Labour, Maintenance */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Mandatory Vehicle Surcharges (Hackathon Cost Transparency)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Cleaning (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={cleaningCharge}
                      onChange={(e) => setCleaningCharge(Number(e.target.value))}
                      required
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Labour/Load (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={labourCharge}
                      onChange={(e) => setLabourCharge(Number(e.target.value))}
                      required
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Maintenance (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={maintenanceCharge}
                      onChange={(e) => setMaintenanceCharge(Number(e.target.value))}
                      required
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Vehicle Price Calculation Summary Card */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-2">
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <span>Total Vehicle Freight Price:</span>
                  <span className="text-base font-black text-amber-900">{formatINR(totalVehiclePrice)}</span>
                </div>
                <div className="space-y-1 text-slate-600 text-[11px] pt-2 border-t border-amber-200/60">
                  <div className="flex justify-between">
                    <span>Distance Base ({distanceKm} km × ₹{tariff}/km):</span>
                    <span className="font-semibold text-slate-800">{formatINR(distanceKm * tariff)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sanitation & Wash Fee:</span>
                    <span className="font-semibold text-slate-800">{formatINR(cleaningCharge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Labour & Handling Fee:</span>
                    <span className="font-semibold text-slate-800">{formatINR(labourCharge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vehicle Maintenance Allowance:</span>
                    <span className="font-semibold text-slate-800">{formatINR(maintenanceCharge)}</span>
                  </div>
                </div>
              </div>

              {/* Backhaul Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="backhaul_toggle"
                  checked={isBackhaul}
                  onChange={(e) => setIsBackhaul(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="backhaul_toggle" className="text-xs font-semibold text-slate-700">
                  This is an empty return trip (Apply Backhaul Discount)
                </label>
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
                  disabled={submittingRoute}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  {submittingRoute ? 'Declaring...' : 'Declare Route'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
