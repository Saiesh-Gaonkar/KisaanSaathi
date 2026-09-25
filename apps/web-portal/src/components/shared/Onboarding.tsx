import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createUserProfile } from '../../services/firebase';
import type { UserRole } from '../../types';
import { Sprout, Store, Truck, ArrowRight, MapPin, User, Mail } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { user, profile, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.displayName || '');
  const [email] = useState(user?.email || '');
  const [role, setRole] = useState<UserRole>('farmer');
  const [district, setDistrict] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If user already has a completed profile, redirect directly to dashboard
  if (profile) {
    navigate(`/${profile.role}`);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!district.trim()) {
      setError('Please provide your village, district, or mandi location');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const uid = user?.uid || 'user_' + Date.now();
      await createUserProfile(uid, name.trim(), email, role, district.trim());
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

          {/* Village / District */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Village / District / Mandi Location
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Hubballi, Dharwad, Karnataka"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
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
