import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Calendar from "./pages/Calendar";
import Emails from "./pages/Emails";
import Weather from "./pages/Weather";
import Payments from "./pages/Payments";
import Budget from "./pages/Budget";
import Usage from "./pages/Usage";
import Digest from "./pages/Digest";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import DebugReset from "./pages/DebugReset";
import OAuthCallback from "./components/auth/OAuthCallback";
import { useEffect } from "react";

const queryClient = new QueryClient();

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem("token");
    const publicRoutes = ["/login", "/signup", "/reset-password", "/debug-reset", "/oauth-callback"];
    
    console.log('AuthRedirect check:', {
      currentPath: location.pathname,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      isPublicRoute: publicRoutes.includes(location.pathname)
    });
    
    if (!token && !publicRoutes.includes(location.pathname)) {
      console.log('No token and not public route, redirecting to login');
      navigate("/login", { replace: true });
    }
  }, [location, navigate]);
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth routes without layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/debug-reset" element={<DebugReset />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          
          {/* Protected routes with layout */}
          <Route path="/*" element={
            <AuthRedirect>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/emails" element={<Emails />} />
                  <Route path="/weather" element={<Weather />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/digest" element={<Digest />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/usage" element={<Usage />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </AuthRedirect>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
