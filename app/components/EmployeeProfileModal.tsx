'use client';

import React from 'react';

interface EmployeeProfileModalProps {
  employee: {
    id: string;
    name: string;
    title?: string;
    publicProfile?: {
      bio?: string;
      photoUrl?: string;
      specializations?: string[];
      qualifications?: string[];
      experience?: string;
      showInBooking?: boolean;
    };
  };
  onClose: () => void;
}

export function EmployeeProfileModal({ employee, onClose }: EmployeeProfileModalProps) {
  const { publicProfile } = employee;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Luk"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            {publicProfile?.photoUrl ? (
              <img 
                src={publicProfile.photoUrl} 
                alt={employee.name}
                className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
                <svg className="h-12 w-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{employee.name}</h3>
              {employee.title ? (
                <p className="text-sm text-gray-600 mt-1">{employee.title}</p>
              ) : (
                <p className="text-sm text-gray-400 italic mt-1">Titel ikke angivet</p>
              )}
              {publicProfile?.experience ? (
                <p className="text-sm text-gray-500 mt-2">{publicProfile.experience}</p>
              ) : (
                <p className="text-sm text-gray-400 italic mt-2">Erfaring ikke angivet</p>
              )}
            </div>
          </div>
          
          {/* Bio Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Om mig</h4>
            {publicProfile?.bio ? (
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{publicProfile.bio}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Ingen beskrivelse tilgængelig</p>
            )}
          </div>
          
          {/* Specializations Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <svg className="h-4 w-4 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Specialer
            </h4>
            {publicProfile?.specializations && publicProfile.specializations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {publicProfile.specializations.map((spec, idx) => (
                  <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                    {spec}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Ingen specialer angivet</p>
            )}
          </div>
          
          {/* Qualifications Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <svg className="h-4 w-4 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
              Kvalifikationer
            </h4>
            {publicProfile?.qualifications && publicProfile.qualifications.length > 0 ? (
              <ul className="space-y-2">
                {publicProfile.qualifications.map((qual, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 mr-2"></span>
                    <span className="text-sm text-gray-600">{qual}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">Ingen kvalifikationer angivet</p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}
















