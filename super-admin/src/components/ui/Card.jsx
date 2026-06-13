import React from 'react';

const Card = ({ children, className = '', padding = 'p-6', ...props }) => {
  return (
    <div 
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        dark:bg-gray-800 dark:border-gray-700 dark:shadow-none
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
    <div className={`border-b border-gray-200 pb-4 mb-4 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>
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

export default Card;