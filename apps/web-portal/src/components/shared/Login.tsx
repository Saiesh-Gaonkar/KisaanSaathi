import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { 
  Sprout, 
  Store, 
  Truck, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithGoogle, switchPersona } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      navigate('/onboarding');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    switchPersona(role);
    navigate(`/${role}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-slate-50 to-green-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-700 to-green-600 text-white shadow-lg shadow-emerald-700/25 mb-2">
            <Sprout className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome to KisaanSathi
          </h1>
          <p className="text-sm text-slate-500">
            Tripartite agricultural marketplace connecting Farmers, Wholesalers, and Transporters
          </p>
        </div>

        {/* Phase 1 Notice */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Phase 1 Web Portal:</span> Direct Firebase Firestore integration with 2-step PIN handshake verification & live bid matching.
          </div>
        </div>

        {/* Google Sign-In */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all hover:shadow"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Quick Demo Switcher Section */}
        <div className="pt-2">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or Try Demo Personas (1-Click)
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 mt-2">
            
            {/* Farmer Demo */}
            <button
              onClick={() => handleDemoLogin('farmer')}
              className="group p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950">Farmer Persona</div>
                  <div className="text-[11px] text-emerald-700">Ramesh Patel (Hubballi) • 4.8★</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Buyer Demo */}
            <button
              onClick={() => handleDemoLogin('wholesaler')}
              className="group p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-all flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-950">Wholesaler / Buyer Persona</div>
                  <div className="text-[11px] text-blue-700">Pooja FreshMart (Belagavi APMC) • 4.6★</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Transporter Demo */}
            <button
              onClick={() => handleDemoLogin('transporter')}
              className="group p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-all flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950">Transporter Persona</div>
                  <div className="text-[11px] text-amber-700">Raju Express (Dharwad) • 4.9★</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
            </button>

          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400">
          State synchronized in real-time with Google Cloud Firestore
        </div>

      </div>
    </div>
  );
};
