'use client';

import { Header } from '../components/Header';
import { useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { Footer } from '../components/Footer';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await members.login(email, password);
      
      // Store user info in localStorage for the Header component
      if (user) {
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userName', user.email?.split('@')[0] || 'User');
      }
      
      // Redirect to mine-hold
      window.location.href = '/mine-hold';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await members.register({
        email,
        password,
        name,
        phone
      });
      
      // Auto-login after registration
      const user = await members.login(email, password);
      
      // Store user info in localStorage
      if (user) {
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userName', name || user.email?.split('@')[0] || 'User');
      }
      
      window.location.href = '/mine-hold';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await members.resetPassword(email);
      setSuccess('Vi har sendt en email med instruktioner til at nulstille din adgangskode.');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Kunne ikke sende email. Prøv igen.');
      setLoading(false);
    }
  };

    return (
      <>
        <Header />
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">INIPI</h1>
          <p className="text-gray-600">
            {mode === 'login' && 'Log ind på din konto'}
            {mode === 'register' && 'Opret ny konto'}
            {mode === 'forgot' && 'Nulstil din adgangskode'}
          </p>
        </div>

        {/* Mode Toggle */}
        {mode !== 'forgot' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Log Ind
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Opret Konto
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="din@email.dk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adgangskode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError(null);
                  setSuccess(null);
                }}
                className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
              >
                Glemt adgangskode?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logger ind...' : 'Log Ind'}
            </button>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="din@email.dk"
              />
              <p className="text-sm text-gray-500 mt-2">
                Indtast din email, så sender vi dig et link til at nulstille din adgangskode.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sender email...' : 'Send Nulstillingslink'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className="w-full text-amber-600 hover:text-amber-700 py-2 text-sm font-medium"
            >
              ← Tilbage til login
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fulde Navn
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Dit Navn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="din@email.dk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon (valgfri)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="+45 12 34 56 78"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adgangskode
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Opretter konto...' : 'Opret Konto'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-amber-600 hover:text-amber-700">
            ← Tilbage til forsiden
          </a>
        </div>
      </div>
    </div>
      <Footer />
      </>
    );
}















