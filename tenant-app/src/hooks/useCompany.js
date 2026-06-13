import { useState, useEffect } from 'react';
import { companyService } from '../services/auth';

export const useCompany = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const companyData = await companyService.getCompanyInfo();
      setCompany(companyData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading company info:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshCompany = () => {
    loadCompany();
  };

  return {
    company,
    loading,
    error,
    refreshCompany
  };
};