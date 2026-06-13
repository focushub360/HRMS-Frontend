import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '../ui/LoadingSpinner';

const Layout = ({ children }) => {
  const { loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 min-w-0 lg:ml-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;