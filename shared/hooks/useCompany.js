import { useState, useEffect } from 'react';
import { companyService } from '../services/auth';

export const useCompany = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading company information...');
      const companyData = await companyService.getPublicCompanyInfo();
      console.log('Company data loaded:', companyData);
      
      setCompany(companyData);
    } catch (err) {
      console.error('Error in useCompany hook:', err);
      setError(err.message);
      
      // Set fallback company data
      setCompany({
        name: 'HRM Software',
        logo: null,
        contact: {
          email: 'support@hrmsoftware.com',
          phone: '+1 (555) 123-4567'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return { company, loading, error, refetch: loadCompanyInfo };
};