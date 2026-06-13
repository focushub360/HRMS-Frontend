// src/components/ui/Toast.jsx
import React, { useEffect } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'error':
        return <ErrorIcon className="w-5 h-5" />;
      case 'warning':
        return <WarningIcon className="w-5 h-5" />;
      case 'info':
        return <InfoIcon className="w-5 h-5" />;
      default:
        return <CheckCircleIcon className="w-5 h-5" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slide-in-right ${getBgColor()} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md`}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-2 text-white/80 hover:text-white transition-colors"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;