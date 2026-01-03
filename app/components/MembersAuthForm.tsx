'use client';

import React, { useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface MembersAuthFormProps {
  onSuccess: (userId: string, userName: string, userEmail: string) => void;
  primaryColor?: string;
}

export function MembersAuthForm({ onSuccess, primaryColor = '#6366f1' }: MembersAuthFormProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Sign in with SDK
      const user = await members.login(email, password);
      
      // Get profile to get user name
      const profile = await members.getProfile();
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      
      // Store in localStorage
      localStorage.setItem('firebaseUid', user.id);
      localStorage.setItem('patientEmail', email.toLowerCase());
      localStorage.setItem('patientId', profile.id);
      if (fullName) {
        localStorage.setItem('patientName', fullName);
      }

      // Success - call parent callback
      onSuccess(profile.id, fullName, email.toLowerCase());
      
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message?.includes('wrong-password') || err.message?.includes('user-not-found')) {
        setError('Forkert email eller adgangskode');
      } else if (err.message?.includes('too-many-requests')) {
        setError('For mange forsøg. Prøv igen senere.');
      } else {
        setError('Login fejlede. Prøv igen.');
      }
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name || !email || !password) {
      setError('Udfyld alle felter');
      return;
    }

    if (password !== confirmPassword) {
      setError('Adgangskoder matcher ikke');
      return;
    }

    if (password.length < 6) {
      setError('Adgangskode skal være mindst 6 tegn');
      return;
    }

    setIsSubmitting(true);

    try {
      // Register with SDK
      const result = await members.register({
        email,
        password,
        name,
        phone
      });
      
      // Success - store in localStorage
      localStorage.setItem('firebaseUid', result.userId);
      localStorage.setItem('patientEmail', email.toLowerCase());
      localStorage.setItem('patientId', result.patientId);
      if (name) {
        localStorage.setItem('patientName', name);
      }
      
      // Call success callback
      onSuccess(result.patientId, name, email.toLowerCase());
      
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Signup error:', err);
      
      if (err.message?.includes('email-already-exists') || err.message?.includes('already-exists')) {
        setError('Du har allerede en konto. Log ind med din eksisterende adgangskode.');
        setMode('login');
      } else if (err.message?.includes('invalid-email')) {
        setError('Ugyldig email adresse');
      } else if (err.message?.includes('weak-password')) {
        setError('Adgangskode er for svag');
      } else {
        setError('Kunne ikke oprette konto. Prøv igen.');
      }
      
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {mode === 'login' ? 'Log ind for at fortsætte' : 'Opret medlem for at fortsætte'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Du skal være logget ind for at booke hold
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
        {mode === 'signup' && (
          <>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Navn
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefon (valgfrit)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              />
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Adgangskode
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {mode === 'signup' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Bekræft adgangskode
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : mode === 'login' ? (
              'Log ind'
            ) : (
              'Opret konto'
            )}
          </button>
        </div>
      </form>

      {/* Toggle Mode */}
      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              {mode === 'login' ? 'Har du ikke en konto?' : 'Har du allerede en konto?'}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            {mode === 'login' ? 'Opret ny konto' : 'Log ind i stedet'}
          </button>
        </div>
      </div>
    </div>
  );
}
















