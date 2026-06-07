import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { companyService } from '../../services/auth';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import BusinessIcon from '@mui/icons-material/Business';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Login = () => {
  const { login, isAuthenticated, loading: authLoading, currentTenant } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const tenantSubdomain = localStorage.getItem('tenantSubdomain');
      if (!tenantSubdomain) {
        // Previously we redirected to /select-company. Commenting that out
        // so this login page handles missing/invalid tenant by showing
        // an error and preventing sign-in. This makes the page usable
        // only when a valid tenant is present in localStorage.
        setError('Tenant not specified. Please open the application using a valid tenant URL.');
        setLoading(false);
        return;
      }

      const companyInfo = await companyService.getPublicCompanyInfo(tenantSubdomain);
      setCompany(companyInfo);
    } catch (error) {
      console.error('Error loading company info:', error);
      // If company not found, show an error and prevent sign-in
      setError('Company not found for this tenant. Please verify the tenant URL.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const tenantSubdomain = localStorage.getItem('tenantSubdomain');
    if (!tenantSubdomain) {
      setError('Tenant not specified. Sign in is only available for valid tenants.');
      return;
    }

    try {
      const result = await login(formData.email, formData.password, tenantSubdomain);
      if (!result.success) {
        // Map common auth failures to a user-friendly message
        const raw = result.error || '';
        const friendly = /invalid|credentials|unauthorized|401|email or password/i.test(raw)
          ? 'Invalid email or password.'
          : raw;
        setError(friendly);

        // Focus password input so user can retry quickly
        const passEl = document.getElementById('password');
        if (passEl) passEl.focus();
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('Invalid email or password.');
      const passEl = document.getElementById('password');
      if (passEl) passEl.focus();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Company selection has been commented out to force tenant-specific login.
  // const handleBackToCompanySelection = () => {
  //   localStorage.removeItem('tenantSubdomain');
  //   navigate('/select-company');
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4" />
          <p className="text-gray-600">Loading company information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Professional Corporate Banner */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80')`
          }}
        >
          {/* Dark Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40"></div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/30 to-transparent"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <div className="max-w-md">
            {/* Company Logo and Name */}
            <div className="flex items-center space-x-4 mb-12">
              <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                {company?.logo ? (
                  <img 
                    src={company.logo} 
                    alt={`${company.name} Logo`} 
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <BusinessIcon className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{company?.name || 'HRM Software'}</h1>
                <p className="text-white/80 text-sm">Enterprise Management System</p>
                {/* <p className="text-white/60 text-xs mt-1">
                  {currentTenant}.kb-hrs-software.vercel.app
                </p> */}
              </div>
            </div>

            {/* Welcome Message */}
            <div className="space-y-6">
              <div className="w-16 h-1 bg-primary-400 rounded-full"></div>
              <h2 className="text-4xl font-bold leading-tight">
                Welcome to <span className="text-primary-300">{company?.name}</span>
              </h2>
              <p className="text-white/90 text-lg leading-relaxed">
                Secure, scalable, and efficient human resource management for modern enterprises.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Back Button and Mobile Logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            {/* Company selection/back button removed to enforce tenant-specific login */}
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl shadow-md mb-3">
                {company?.logo ? (
                  <img 
                    src={company.logo} 
                    alt={`${company.name} Logo`} 
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <BusinessIcon className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="text-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {company?.name || 'HRM Software'}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Management System
                </p>
                {/* <p className="text-gray-400 text-xs mt-1">
                  {currentTenant}.kb-hrs-software.vercel.app
                </p> */}
              </div>
            </div>
          </div>

          {/* Compact Login Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Sign In</h2>
              <p className="text-gray-500 text-sm mt-1">
                Access your {company?.name} account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150 placeholder-gray-400"
                  placeholder="your.email@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150 placeholder-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  >
                    {showPassword ? (
                      <VisibilityOffIcon className="w-4 h-4" />
                    ) : (
                      <VisibilityIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                loading={authLoading}
                className="w-full py-2.5 text-sm font-medium rounded-lg"
              >
                Sign In to {company?.name}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} {company?.name || 'HRM Software'}
            </p>
            {/* Switch company option removed - sign-in is for valid tenant only */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;