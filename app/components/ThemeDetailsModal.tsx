'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ThemeDetailsModalProps {
  theme: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
  };
  isSelected: boolean;
  onClose: () => void;
  onSelect: () => void;
}

export function ThemeDetailsModal({ theme, isSelected, onClose, onSelect }: ThemeDetailsModalProps) {
  const handleSelect = () => {
    onSelect();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#faf8f5] rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#502B30]/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#faf8f5] border-b border-[#502B30]/20 px-6 py-4 flex items-center justify-between rounded-t-sm">
          <h2 className="text-xl font-semibold text-[#502B30]">{theme.name}</h2>
          <button 
            onClick={onClose} 
            className="text-[#502B30]/60 hover:text-[#502B30] transition-colors"
            aria-label="Luk"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Theme Image */}
          {theme.imageUrl && (
            <div className="mb-6">
              <img 
                src={theme.imageUrl} 
                alt={theme.name}
                className="w-full h-64 object-cover rounded-sm border-2 border-[#502B30]/20"
              />
            </div>
          )}
          
          {/* Theme Name */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#502B30] mb-2">{theme.name}</h3>
            {isSelected && (
              <span className="inline-block px-3 py-1 bg-[#502B30] text-amber-100 rounded-sm text-sm font-medium">
                Valgt tema
              </span>
            )}
          </div>
          
          {/* Description Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[#502B30] mb-3">Om dette tema</h4>
            {theme.description ? (
              <p className="text-sm text-[#4a2329]/80 whitespace-pre-wrap leading-relaxed">
                {theme.description}
              </p>
            ) : (
              <p className="text-sm text-[#502B30]/60 italic">Ingen beskrivelse tilgængelig</p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-[#faf8f5] px-6 py-4 border-t border-[#502B30]/20 rounded-b-sm flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-[#502B30]/20 text-[#502B30] rounded-sm hover:bg-[#502B30]/10 transition-colors font-medium"
          >
            Luk
          </button>
          {!isSelected && (
            <button
              onClick={handleSelect}
              className="flex-1 px-4 py-2 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors font-medium"
            >
              Vælg dette tema
            </button>
          )}
        </div>
      </div>
    </div>
  );
}











