import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'md', variant = 'default' }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.keyCode === 27) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const getVariantStyles = () => {
    const baseStyles = {
      backdrop: 'bg-gray-900/50 backdrop-blur-sm',
      modal: 'bg-white shadow-2xl',
      header: 'bg-white border-b border-gray-100',
      title: 'text-gray-900'
    };

    const variants = {
      default: baseStyles,
      danger: {
        ...baseStyles,
        header: 'bg-white border-b border-gray-100',
        title: 'text-gray-900'
      },
      warning: {
        ...baseStyles,
        header: 'bg-white border-b border-gray-100',
        title: 'text-gray-900'
      },
      info: {
        ...baseStyles,
        header: 'bg-white border-b border-gray-100',
        title: 'text-gray-900'
      },
      success: {
        ...baseStyles,
        header: 'bg-white border-b border-gray-100',
        title: 'text-gray-900'
      }
    };

    return variants[variant] || baseStyles;
  };

  const styles = getVariantStyles();

  return (
  <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Elegant Backdrop */}
      <div 
        className={`fixed inset-0 ${styles.backdrop} transition-opacity duration-300`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal Panel */}
        <div 
          className={`relative transform overflow-hidden rounded-xl ${styles.modal} transition-all duration-300 w-full ${sizes[size]} animate-in fade-in-90 zoom-in-90 dark:${styles.modal.replace('bg-white','bg-gray-800')}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className={`px-6 py-4 ${styles.header} dark:${styles.header.replace(/bg-white/g,'bg-gray-800').replace(/border-gray-100/g,'border-gray-700')}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${styles.title}`}>
                  {title}
                </h3>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  onClick={onClose}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="px-6 py-4 bg-white dark:bg-gray-800">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;