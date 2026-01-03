'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  UserPlus, Mail, Lock, User as UserIcon, Phone, AlertCircle, 
  CheckCircle, Loader2, X, Save, Shield
} from 'lucide-react';

export default function AdminUsersPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    isEmployee: false,
    employeeName: '',
    employeeTitle: '',
    permissions: {
      gusmester: false,
      staff: false,
      administration: false,
    }
  });

  useEffect(() => {
    const unsubscribe = members.onAuthStateChanged(async (authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          window.location.href = '/login';
        } else {
          try {
            const employeeCheck = await members.checkIfEmployee();
            if (employeeCheck.isEmployee && employeeCheck.frontendPermissions?.administration) {
              setHasAccess(true);
              setIsCheckingAuth(false);
            } else {
              setHasAccess(false);
              setIsCheckingAuth(false);
              setError('Du har ikke adgang til brugeradministration.');
            }
          } catch (err: any) {
            console.error('Error checking access:', err);
            setHasAccess(false);
            setIsCheckingAuth(false);
            setError('Kunne ikke verificere adgang.');
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Validate
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        setError('Udfyld alle påkrævede felter');
        setSubmitting(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Adgangskode skal være mindst 6 tegn');
        setSubmitting(false);
        return;
      }

      // Create user using Supabase Admin API
      // Note: This requires service_role key, so we'll use an Edge Function
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          isEmployee: formData.isEmployee,
          employeeName: formData.employeeName,
          employeeTitle: formData.employeeTitle,
          permissions: formData.permissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunne ikke oprette bruger');
      }

      const result = await response.json();

      setSuccess(`Bruger oprettet! Email: ${formData.email}, Password: ${formData.password}`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        isEmployee: false,
        employeeName: '',
        employeeTitle: '',
        permissions: {
          gusmester: false,
          staff: false,
          administration: false,
        }
      });

    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Kunne ikke oprette bruger');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#502B30]" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ingen Adgang</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Opret Ny Bruger</h1>
            <p className="text-gray-600 mt-1">Opret test brugere til udvikling</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-700 font-medium">Bruger oprettet!</p>
                  <p className="text-green-600 text-sm mt-1 whitespace-pre-wrap">{success}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <UserIcon className="w-5 h-5" />
                <span>Bruger Information</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fornavn *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Efternavn *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="+45 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adgangskode *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                    placeholder="Minimum 6 tegn"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Generer
                  </button>
                </div>
              </div>
            </div>

            {/* Employee Section */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isEmployee"
                  checked={formData.isEmployee}
                  onChange={(e) => setFormData({ ...formData, isEmployee: e.target.checked })}
                  className="rounded text-[#502B30] focus:ring-[#502B30]"
                />
                <label htmlFor="isEmployee" className="text-lg font-semibold text-gray-900 flex items-center space-x-2 cursor-pointer">
                  <Shield className="w-5 h-5" />
                  <span>Opret som Medarbejder</span>
                </label>
              </div>

              {formData.isEmployee && (
                <div className="space-y-4 pl-7">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medarbejder Navn *
                    </label>
                    <input
                      type="text"
                      required={formData.isEmployee}
                      value={formData.employeeName}
                      onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                      placeholder="F.eks. John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={formData.employeeTitle}
                      onChange={(e) => setFormData({ ...formData, employeeTitle: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                      placeholder="F.eks. Certificeret Gusmester"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rettigheder
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.gusmester}
                          onChange={(e) => setFormData({
                            ...formData,
                            permissions: { ...formData.permissions, gusmester: e.target.checked }
                          })}
                          className="rounded text-[#502B30] focus:ring-[#502B30]"
                        />
                        <span className="text-sm text-gray-700">Gus Mester (kan booke gusmester spots)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.staff}
                          onChange={(e) => setFormData({
                            ...formData,
                            permissions: { ...formData.permissions, staff: e.target.checked }
                          })}
                          className="rounded text-[#502B30] focus:ring-[#502B30]"
                        />
                        <span className="text-sm text-gray-700">Medarbejder (kan se deltagerlister)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.administration}
                          onChange={(e) => setFormData({
                            ...formData,
                            permissions: { ...formData.permissions, administration: e.target.checked }
                          })}
                          className="rounded text-[#502B30] focus:ring-[#502B30]"
                        />
                        <span className="text-sm text-gray-700">Administration (fuld adgang)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Opretter bruger...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Opret Bruger</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Denne side er kun til udvikling/test. Brugere oprettes direkte i Supabase Auth.
              Gem login credentials et sikkert sted.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

