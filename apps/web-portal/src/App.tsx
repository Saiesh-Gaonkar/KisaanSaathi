import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/shared/Navbar';
import { Login } from './components/shared/Login';
import { Onboarding } from './components/shared/Onboarding';
import { RoleGuard } from './components/shared/RoleGuard';
import { FarmerDashboard } from './components/farmer/FarmerDashboard';
import { BatchDetailView } from './components/farmer/BatchDetailView';
import { WholesalerDashboard } from './components/wholesaler/WholesalerDashboard';
import { TransporterDashboard } from './components/transporter/TransporterDashboard';

// Root router redirector
const RootRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-600">Connecting to KisaanSathi Exchange...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to={`/${profile.role}`} replace />;
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Farmer Routes */}
          <Route
            path="/farmer"
            element={
              <RoleGuard requiredRole="farmer">
                <FarmerDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="/farmer/batch/:batchId"
            element={
              <RoleGuard requiredRole="farmer">
                <BatchDetailView />
              </RoleGuard>
            }
          />

          {/* Wholesaler / Buyer Routes */}
          <Route
            path="/wholesaler"
            element={
              <RoleGuard requiredRole="wholesaler">
                <WholesalerDashboard />
              </RoleGuard>
            }
          />

          {/* Transporter Routes */}
          <Route
            path="/transporter"
            element={
              <RoleGuard requiredRole="transporter">
                <TransporterDashboard />
              </RoleGuard>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </main>

      {/* Clean Hackathon Phase 1 Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">KisaanSathi Web Portal</span>
            <span>• Phase 2 — Multi-Agent AI Simulation Engine</span>
          </div>
          <div className="text-slate-400">
            Powered by CrewAI × Gemini × Google Cloud &amp; Firebase • Built for Indian Agriculture
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
