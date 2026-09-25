import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { 
  Sprout, 
  Store, 
  Truck, 
  Star, 
  LogOut, 
  ShieldCheck 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleMeta: Record<UserRole, { label: string; icon: any; color: string; path: string }> = {
    farmer: { label: 'Farmer Portal', icon: Sprout, color: 'text-emerald-700 bg-emerald-100 border-emerald-300', path: '/farmer' },
    wholesaler: { label: 'Wholesaler Exchange', icon: Store, color: 'text-blue-700 bg-blue-100 border-blue-300', path: '/wholesaler' },
    transporter: { label: 'Transporter Dispatch', icon: Truck, color: 'text-amber-700 bg-amber-100 border-amber-300', path: '/transporter' },
  };

  const currentRole = profile?.role;
  const roleConfig = currentRole ? roleMeta[currentRole] : null;
  const IconComponent = roleConfig?.icon || Sprout;

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
          <div className="flex items-center space-x-3">

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
