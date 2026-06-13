import React from 'react';

// Material-UI Icons
const AttachMoneyIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g data-name="Currency Circulating"><path d="M321.159 256a67.468 67.468 0 1 0-67.468 67.472A67.468 67.468 0 0 0 321.159 256zM220.3 278.037l-.655-1.533 15.066-6.384.645 1.536c2.318 5.503 10.354 9.656 18.69 9.656 3.737 0 15.926-.681 15.926-9.417 0-4.551-5.22-7.288-16.422-8.618-12.033-1.343-30.234-3.378-30.234-22.69 0-11.804 8.784-20.06 23.584-22.284v-9.054h16.226v9.094c6.882 1.227 15.91 4.262 20.977 14.607l.748 1.526-13.872 6.417-.765-1.273c-2.31-3.817-9.376-6.923-15.763-6.923-5.413 0-14.49 1.024-14.49 7.89 0 5.091 6.544 6.275 15.096 7.295 13.575 1.673 32.166 3.964 32.166 24.013 0 14.687-11.857 22.45-24.093 23.871v10.317h-16.226v-9.825c-12.819-1.553-22.231-7.984-26.604-18.22z"/><path d="m413.304 236.21-24.692 25.916a136.726 136.726 0 0 0-115.19-144.149 137.388 137.388 0 0 0-140.525 68.093l17.39 9.775a117.361 117.361 0 0 1 120.035-58.163 116.764 116.764 0 0 1 98.327 123.856l-24.817-23.651-15.196 15.933 35.588 33.899-.013.006 15.949 15.185 15.182-15.916v-.01l33.906-35.578zM241.68 374.318a116.766 116.766 0 0 1-98.326-123.856l24.818 23.654 15.195-15.937-35.587-33.899.013-.007-15.95-15.184-15.182 15.916v.01l-33.909 35.58 15.944 15.195 24.692-25.915a136.624 136.624 0 0 0 136.225 145.793 137.52 137.52 0 0 0 119.494-69.738l-17.39-9.775a117.362 117.362 0 0 1-120.036 58.163z"/></g></svg>
);

// Inline UI Components (since imports aren't working)
const Card = ({ children, className = '', padding = 'p-6', ...props }) => {
  return (
    <div 
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        ${padding}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false,
  className = '',
  as = 'button',
  href,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-blue-300 disabled:text-blue-300'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  if (as === 'a' && href) {
    return (
      <a 
        href={href}
        className={classes}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </a>
    );
  }

  return (
    <button 
      className={classes} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

// Main Component with Professional Icons
const SubscriptionManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600">Manage company subscriptions and billing</p>
        </div>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Subscription Overview</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
              <AttachMoneyIcon className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-500">Subscription management coming soon</p>
            <p className="text-sm text-gray-400 mt-2">
              This feature will allow you to manage billing, upgrade plans, and view payment history.
            </p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;