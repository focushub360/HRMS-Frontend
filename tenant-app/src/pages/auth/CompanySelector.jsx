import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Card from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';
import LoadingSpinner from '@shared/components/ui/LoadingSpinner';
import { tenantDirectoryService } from '../../services/tenants';

const CompanySelector = () => {
  const { login } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoading(true);
        const data = await tenantDirectoryService.list();
        setCompanies(data || []);
      } catch (error) {
        console.error('Failed to load companies:', error);
        setCompaniesError(error?.response?.data?.message || 'Unable to load companies. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setError('');
    setCompaniesError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCompany) {
      setError('Please select a company');
      return;
    }

    const result = await login(formData.email, formData.password, selectedCompany.subdomain);
    if (!result.success) {
      setError(result.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl dark:bg-gray-900 dark:text-gray-100">
        <Card.Header>
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-lg mx-auto mb-4">
              <span className="text-xl font-bold text-white">HR</span>
            </div>
            <Card.Title className="dark:text-gray-100">Select Your Company</Card.Title>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Choose your company to access the HRM portal
            </p>
          </div>
        </Card.Header>

        <Card.Content>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-gray-100">Available Companies</h3>
              <div className="space-y-3">
                {companiesError && (
                  <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
                    {companiesError}
                  </div>
                )}

                {!companiesError && companies.length === 0 && (
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-sm text-gray-500">
                    No active companies available. Please contact your administrator.
                  </div>
                )}

                {companies.map((company) => {
                  const companyId = company._id || company.id;
                  return (
                  <div
                    key={companyId}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedCompany?._id === companyId || selectedCompany?.id === companyId
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 dark:border-primary-600'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-primary-600 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleCompanySelect(company)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{company.logo || '🏢'}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{company.companyName || company.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{company.subdomain}.yourdomain.com</p>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>

            {/* Login Form */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-gray-100">
                {selectedCompany ? `Login to ${selectedCompany.companyName || selectedCompany.name}` : 'Select a company to login'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!selectedCompany}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 disabled:dark:bg-gray-700"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={!selectedCompany}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 disabled:dark:bg-gray-700"
                    placeholder="Enter your password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!selectedCompany}
                  className="w-full"
                >
                  Login to {selectedCompany?.companyName || selectedCompany?.name || 'Company'}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
                <p className="text-xs text-gray-600 text-center dark:text-gray-300">
                  <strong>Demo Access:</strong><br />
                  Use your company credentials provided by your administrator
                </p>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default CompanySelector;