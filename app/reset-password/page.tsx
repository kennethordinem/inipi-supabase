'use client';

import { Header } from '../components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Footer } from '../components/Footer';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Ugyldigt eller udløbet link. Anmod om et nyt link.');
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate
    if (password.length < 6) {
      setError('Adgangskode skal være mindst 6 tegn');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Adgangskoderne matcher ikke');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Kunne ikke nulstille adgangskode');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Adgangskode Opdateret!</h1>
              <p className="text-gray-600">
                Din adgangskode er blevet ændret. Du bliver omdirigeret til login...
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-amber-900 mb-2">INIPI</h1>
            <p className="text-gray-600">Nulstil din adgangskode</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ny Adgangskode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Minimum 6 tegn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bekræft Adgangskode
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Gentag adgangskode"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Opdaterer...' : 'Opdater Adgangskode'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-amber-600 hover:text-amber-700">
              ← Tilbage til login
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

