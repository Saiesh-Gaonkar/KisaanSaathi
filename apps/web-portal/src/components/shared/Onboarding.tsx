import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createUserProfile } from '../../services/firebase';
import type { UserRole } from '../../types';
import { Sprout, Store, Truck, ArrowRight, MapPin, User, Mail, Navigation } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { user, profile, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.displayName || '');
  const [email] = useState(user?.email || '');
  const [role, setRole] = useState<UserRole>('farmer');
  const [address, setAddress] = useState('Navalgund Taluk, Hubballi Mandi Road, Karnataka');
  const [latitude, setLatitude] = useState<number>(15.3647);
  const [longitude, setLongitude] = useState<number>(75.1240);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If user already has a completed profile, redirect directly to dashboard
  if (profile) {
    navigate(`/${profile.role}`);
    return null;
  }

  const handleDetectGPS = () => {
    if ('geolocation' in navigator) {
      setDetectingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(6)));
          setLongitude(Number(pos.coords.longitude.toFixed(6)));
          setDetectingLocation(false);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setDetectingLocation(false);
          setError('Could not retrieve browser GPS. You can enter exact coordinates manually or use the presets below.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('Geolocation not supported by browser.');
    }
  };

  const handlePresetLocation = (city: 'hubballi' | 'belagavi' | 'dharwad') => {
    const presets = {
      hubballi: {
        address: 'APMC Yard, Amargol, Hubballi, Dharwad, Karnataka 580025',
        lat: 15.3647,
        lng: 75.1240,
      },
      belagavi: {
        address: 'Central APMC Market, Belagavi, Karnataka 590001',
        lat: 15.8497,
        lng: 74.4977,
      },
      dharwad: {
        address: 'Corridor Logistics Hub, PB Road, Dharwad, Karnataka 580004',
        lat: 15.4589,
        lng: 75.0078,
      },
    };
    const p = presets[city];
    setAddress(p.address);
    setLatitude(p.lat);
    setLongitude(p.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!address.trim()) {
      setError('Please enter your written physical address');
      return;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Please enter valid numeric latitude and longitude');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const uid = user?.uid || 'user_' + Date.now();
      await createUserProfile(uid, name.trim(), email, role, {
        address: address.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      await reloadProfile();
      navigate(`/${role}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Step 1 of 1: Profile Setup
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-3">Complete Your Profile</h2>
          <p className="text-sm text-slate-500">
            Select your role in the KisaanSathi ecosystem to access your specialized dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              I am joining as:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Farmer Option */}
              <button
                type="button"
                onClick={() => setRole('farmer')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  role === 'farmer' 
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  role === 'farmer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Sprout className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900">Farmer</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Sell harvest & accept bids</div>
              </button>

              {/* Wholesaler Option */}
              <button
                type="button"
                onClick={() => setRole('wholesaler')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  role === 'wholesaler' 
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  role === 'wholesaler' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Store className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900">Wholesaler / Buyer</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Bid on verified crops</div>
              </button>

              {/* Transporter Option */}
              <button
                type="button"
                onClick={() => setRole('transporter')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  role === 'transporter' 
                    ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  role === 'transporter' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900">Transporter</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Monetize backhauls</div>
              </button>

            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email || 'demo@kisaansaathi.in'}
                readOnly
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Written Address */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Physical / Mandi Address (Written Manually)
              </label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={detectingLocation}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
              >
                <Navigation className={`w-3 h-3 ${detectingLocation ? 'animate-spin' : ''}`} />
                <span>{detectingLocation ? 'Detecting GPS...' : 'Auto-Detect GPS'}</span>
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop 12, APMC Yard, Amargol, Hubballi, Karnataka"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Exact Latitude & Longitude */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Exact GPS Coordinates (Latitude & Longitude)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  required
                  placeholder="e.g. 15.3647"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  required
                  placeholder="e.g. 75.1240"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center space-x-2 pt-1 text-[11px] text-slate-500">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
              <button
                type="button"
                onClick={() => handlePresetLocation('hubballi')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Hubballi
              </button>
              <button
                type="button"
                onClick={() => handlePresetLocation('belagavi')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Belagavi
              </button>
              <button
                type="button"
                onClick={() => handlePresetLocation('dharwad')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Dharwad
              </button>
            </div>
          </div>

          {/* Default Trust Score & Status info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">New Trader Baseline:</div>
            <div>• Initial Status: <span className="font-medium text-amber-700">PROVISIONAL</span></div>
            <div>• Baseline Trust Rating: <span className="font-medium text-amber-700">3.5★</span> (Prevents day-one lockout from recommendation filters)</div>
            <div>• Upgrades to <span className="font-medium text-emerald-700">VERIFIED</span> after 3 completed handshake deliveries.</div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
          >
            <span>{submitting ? 'Setting up Profile...' : 'Complete Profile & Enter Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

      </div>
    </div>
  );
};
