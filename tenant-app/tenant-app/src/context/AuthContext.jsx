import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        error: null
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TENANT':
      return { ...state, currentTenant: action.payload };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  currentTenant: null,
  loading: false,
  error: null
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const tenantSubdomain = localStorage.getItem('tenantSubdomain');
    
    if (token && tenantSubdomain) {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const userData = await authService.getMe();
        
        // Only allow non-super-admin users in tenant app
        if (userData.role !== 'super-admin') {
          dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
          dispatch({ type: 'SET_TENANT', payload: tenantSubdomain });
        } else {
          // If super-admin, clear token and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Keep tenantSubdomain so user can re-login for the tenant
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On auth check failure, clear token and user but preserve tenant selection
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const login = async (email, password, tenantSubdomain) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      // Set tenant subdomain in localStorage for API calls
      localStorage.setItem('tenantSubdomain', tenantSubdomain);
      
  const response = await authService.login(email, password, tenantSubdomain);
      
      // Verify this is NOT a super-admin user
      if (response.role === 'super-admin') {
        throw new Error('Please use the Super Admin portal for super admin access.');
      }
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: response });
      dispatch({ type: 'SET_TENANT', payload: tenantSubdomain });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      
      // Keep tenant on login failure so user may retry on same tenant
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth tokens and user but retain tenant so login page stays tenant-scoped
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const switchTenant = (tenantSubdomain) => {
    localStorage.setItem('tenantSubdomain', tenantSubdomain);
    dispatch({ type: 'SET_TENANT', payload: tenantSubdomain });
  };

  const value = {
    ...state,
    login,
    logout,
    switchTenant
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};