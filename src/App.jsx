import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Leads from '@/pages/Leads';
import Scheduling from '@/pages/Scheduling';
import PostJob from '@/pages/PostJob';
import Reputation from '@/pages/Reputation';
import Invoicing from '@/pages/Invoicing';
import Hiring from '@/pages/Hiring';
import CommunityHub from '@/pages/CommunityHub';
import SellerListings from '@/pages/SellerListings';
import SellerStorefront from '@/pages/SellerStorefront';
import SellerAds from '@/pages/SellerAds';
import SellerBilling from '@/pages/SellerBilling';
import SellerSettings from '@/pages/SellerSettings';
import BuyerRegister from '@/pages/BuyerRegister';
import BuyerDashboard from '@/pages/BuyerDashboard';
import BuyerMessages from '@/pages/BuyerMessages';
import AdminDashboard from '@/pages/AdminDashboard';
import ProtectedAdminRoute from '@/components/ProtectedAdminRoute';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
    return (
      <Routes>
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="/register" element={<BuyerRegister />} />
        <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
        <Route path="/buyer/jobs" element={<BuyerDashboard />} />
        <Route path="/buyer/messages" element={<BuyerMessages />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/reputation" element={<Reputation />} />
          <Route path="/invoicing" element={<Invoicing />} />
          <Route path="/hiring" element={<Hiring />} />
          <Route path="/community" element={<CommunityHub />} />
          <Route path="/seller/listings" element={<SellerListings />} />
          <Route path="/seller/:businessId" element={<SellerStorefront />} />
          <Route path="/seller/ads" element={<SellerAds />} />
          <Route path="/seller/billing" element={<SellerBilling />} />
          <Route path="/seller/settings" element={<SellerSettings />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App