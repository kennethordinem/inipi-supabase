'use client';

import React, { useEffect } from 'react';

interface ModernModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'default' | 'large' | 'full';
}

/**
 * ModernModal - Large, beautiful modal container
 * Responsive: full-screen on mobile, centered large modal on desktop/iPad
 */
export function ModernModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'large'
}: ModernModalProps) {
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const sizeClasses = {
    default: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-6xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-0 md:p-4">
        <div 
          className={`
            relative w-full 
            ${sizeClasses[size]}
            bg-white 
            md:rounded-2xl 
            shadow-2xl
            min-h-screen md:min-h-0
            max-h-screen md:max-h-[90vh]
            flex flex-col
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Sticky on mobile */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 md:rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>
          
          {/* Footer - Sticky on mobile */}
          {footer && (
            <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-6 py-4 md:rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}














