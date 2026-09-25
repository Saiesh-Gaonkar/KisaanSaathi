import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { seedDatabase, cleanDatabase } from '../../seed/seedData';
import { 
  Sprout, 
  Store, 
  Truck, 
  Star, 
  LogOut, 
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  Trash2
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, logout, switchPersona, isDemoActive, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRoleSwitch = (role: UserRole) => {
    switchPersona(role);
    setMenuOpen(false);
    navigate(`/${role}`);
  };

  const handleSeed = async () => {
    setSeeding(true);
    const ok = await seedDatabase();
    setSeeding(false);
    if (ok) {
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    }
  };

  const handleClean = async () => {
    if (!window.confirm('Are you sure you want to clean all demo batches, bids, routes, and deals?')) {
      return;
    }
    setCleaning(true);
    const ok = await cleanDatabase();
    setCleaning(false);
    if (ok) {
      setCleanSuccess(true);
      setTimeout(() => setCleanSuccess(false), 3000);
    }
  };

  const roleMeta: Record<UserRole, { label: string; icon: any; color: string; path: string }> = {
    farmer: { label: 'Farmer Portal', icon: Sprout, color: 'text-emerald-700 bg-emerald-100 border-emerald-300', path: '/farmer' },
    wholesaler: { label: 'Wholesaler Exchange', icon: Store, color: 'text-blue-700 bg-blue-100 border-blue-300', path: '/wholesaler' },
    transporter: { label: 'Transporter Dispatch', icon: Truck, color: 'text-amber-700 bg-amber-100 border-amber-300', path: '/transporter' },
  };

  const currentRole = profile?.role || 'farmer';
  const roleConfig = roleMeta[currentRole];
  const IconComponent = roleConfig?.icon || Sprout;

  // Show switch role & demo controls if user is logged in
  const showDemoTools = Boolean(user && (isDemoActive || isDemoMode || profile?.uid?.startsWith('demo_')));

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <Link to={roleConfig?.path || '/'} className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">KisaanSathi</span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Marketplace
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">Tripartite Agricultural Exchange</p>
              </div>
            </Link>

            {/* Current Role Indicator (Only visible if profile exists) */}
            {profile && roleConfig && (
              <div className="hidden md:flex items-center ml-4 pl-4 border-l border-slate-200">
                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${roleConfig.color}`}>
                  <IconComponent className="w-3.5 h-3.5 mr-1.5" />
                  {roleConfig.label}
                </span>
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2.5">

            {/* Quick Demo Switcher (Available whenever demo mode or test user is active) */}
            {showDemoTools && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors shadow-sm"
                  title="Switch persona for rapid testing without re-login"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
                  <span>Switch Role</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-500" />
                </button>

                {menuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                      <div className="px-3 py-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100">
                        Quick Persona Switcher (Demo)
                      </div>
                      <button
                        onClick={() => handleRoleSwitch('farmer')}
                        className={`w-full text-left px-3 py-2 flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                          currentRole === 'farmer' ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700'
                        }`}
                      >
                        <Sprout className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div>Farmer (Ramesh Patel)</div>
                          <div className="text-[10px] text-slate-400">Hubballi • 4.8★</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('wholesaler')}
                        className={`w-full text-left px-3 py-2 flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                          currentRole === 'wholesaler' ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-700'
                        }`}
                      >
                        <Store className="w-4 h-4 text-blue-600" />
                        <div>
                          <div>Wholesaler (Pooja FreshMart)</div>
                          <div className="text-[10px] text-slate-400">Belagavi APMC • 4.6★</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('transporter')}
                        className={`w-full text-left px-3 py-2 flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                          currentRole === 'transporter' ? 'bg-amber-50 font-semibold text-amber-800' : 'text-slate-700'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-amber-600" />
                        <div>
                          <div>Transporter (Raju Express)</div>
                          <div className="text-[10px] text-slate-400">Dharwad Corridor • 4.9★</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Seed Demo Data Button */}
            {showDemoTools && (
              <button
                onClick={handleSeed}
                disabled={seeding || cleaning}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
                title="Populate realistic seed data (batches, bids, routes)"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${seeding ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{seedSuccess ? 'Seeded!' : 'Seed Data'}</span>
              </button>
            )}

            {/* Clean Data Button */}
            {showDemoTools && (
              <button
                onClick={handleClean}
                disabled={cleaning || seeding}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                title="Clean all demo batches, bids, and routes"
              >
                <Trash2 className={`w-3.5 h-3.5 mr-1.5 ${cleaning ? 'animate-spin text-red-600' : ''}`} />
                <span className="hidden sm:inline">{cleanSuccess ? 'Cleaned!' : 'Clean Data'}</span>
              </button>
            )}

            {/* User Trust & Completed Deals Badge */}
            {profile && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                <div className="flex items-center text-amber-600 font-semibold text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" />
                  {typeof profile.trust_score === 'number' ? profile.trust_score.toFixed(1) : '3.5'}
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-600">
                  {profile.completed_deals_count || 0} {profile.completed_deals_count === 1 ? 'deal' : 'deals'}
                </span>
                {profile.user_status === 'VERIFIED' ? (
                  <span title="Verified Trader">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                    PROVISIONAL
                  </span>
                )}
              </div>
            )}

            {/* Sign Out Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                title="Sign out of your account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
