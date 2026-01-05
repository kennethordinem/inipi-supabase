'use client';

import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { members } from '@/lib/supabase-sdk';
import { CreditCard, Key, Globe, AlertCircle, CheckCircle, Save, Eye, EyeOff } from 'lucide-react';

interface StripeConfig {
  id: string;
  publishable_key: string | null;
  secret_key: string | null;
  webhook_secret: string | null;
  mode: 'test' | 'live';
  currency: string;
  enabled: boolean;
}

export default function AdminStripePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<StripeConfig | null>(null);
  
  // Form state
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [enabled, setEnabled] = useState(false);
  
  // Show/hide keys
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const employeeCheck = await members.checkIfEmployee();
      
      if (!employeeCheck.isEmployee || !employeeCheck.frontendPermissions?.administration) {
        window.location.href = '/';
        return;
      }

      await loadStripeConfig();
    } catch (err) {
      console.error('Auth check failed:', err);
      window.location.href = '/login';
    }
  };

  const loadStripeConfig = async () => {
    try {
      setLoading(true);
      const data = await members.getStripeConfig();
      
      if (data) {
        setConfig(data);
        setPublishableKey(data.publishable_key || '');
        setSecretKey(data.secret_key || '');
        setWebhookSecret(data.webhook_secret || '');
        setMode(data.mode);
        setEnabled(data.enabled);
      }
    } catch (err: any) {
      console.error('Error loading Stripe config:', err);
      setError('Kunne ikke indlæse Stripe konfiguration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate
      if (enabled && (!publishableKey || !secretKey)) {
        setError('Publishable Key og Secret Key er påkrævet når Stripe er aktiveret');
        return;
      }

      // Validate key format
      if (publishableKey && !publishableKey.startsWith('pk_')) {
        setError('Publishable Key skal starte med "pk_"');
        return;
      }

      if (secretKey && !secretKey.startsWith('sk_')) {
        setError('Secret Key skal starte med "sk_"');
        return;
      }

      if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
        setError('Webhook Secret skal starte med "whsec_"');
        return;
      }

      // Check if keys match mode
      const keyMode = publishableKey.includes('_test_') ? 'test' : 'live';
      if (mode !== keyMode) {
        setError(`Keys matcher ikke valgt mode. Keys er for "${keyMode}" mode, men du har valgt "${mode}"`);
        return;
      }

      await members.updateStripeConfig({
        publishable_key: publishableKey,
        secret_key: secretKey,
        webhook_secret: webhookSecret,
        mode,
        enabled,
      });

      setSuccess('Stripe konfiguration gemt!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Error saving Stripe config:', err);
      setError(err.message || 'Kunne ikke gemme konfiguration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#faf8f5]">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <a
                href="/admin"
                className="text-[#502B30]/60 hover:text-[#502B30] mr-4"
              >
                ← Tilbage
              </a>
            </div>
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide flex items-center">
              <CreditCard className="h-10 w-10 mr-3" />
              Stripe Integration
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Konfigurer Stripe betalinger for booking systemet
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-sm p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-sm p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-sm p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Sådan finder du dine Stripe keys:
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 ml-7 list-decimal">
              <li>Log ind på <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard</a></li>
              <li>Gå til "Developers" → "API keys"</li>
              <li>Kopier "Publishable key" og "Secret key"</li>
              <li>For webhook secret: Gå til "Developers" → "Webhooks" → Opret endpoint</li>
              <li>Brug denne URL: <code className="bg-blue-100 px-1 rounded">https://din-domain.dk/api/stripe/webhook</code></li>
            </ol>
          </div>

          {/* Configuration Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#502B30] mb-6">
              Stripe Konfiguration
            </h2>

            <div className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#faf8f5] rounded-sm border border-[#502B30]/10">
                <div>
                  <h3 className="font-semibold text-[#502B30]">Aktiver Stripe Betalinger</h3>
                  <p className="text-sm text-[#4a2329]/70">
                    Tillad brugere at betale med kort via Stripe
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#502B30]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#502B30]"></div>
                </label>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <Globe className="inline h-4 w-4 mr-2" />
                  Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="test"
                      checked={mode === 'test'}
                      onChange={(e) => setMode(e.target.value as 'test' | 'live')}
                      className="mr-2"
                    />
                    <span className="text-[#502B30]">Test Mode</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="live"
                      checked={mode === 'live'}
                      onChange={(e) => setMode(e.target.value as 'test' | 'live')}
                      className="mr-2"
                    />
                    <span className="text-[#502B30]">Live Mode (Produktion)</span>
                  </label>
                </div>
                <p className="text-xs text-[#4a2329]/60 mt-1">
                  Start med Test Mode for at teste betalinger uden rigtige penge
                </p>
              </div>

              {/* Publishable Key */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <Key className="inline h-4 w-4 mr-2" />
                  Publishable Key
                </label>
                <input
                  type="text"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_test_..."
                  className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-[#4a2329]/60 mt-1">
                  Denne key er synlig i frontend koden
                </p>
              </div>

              {/* Secret Key */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <Key className="inline h-4 w-4 mr-2" />
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="sk_test_..."
                    className="w-full px-4 py-2 pr-10 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#502B30]/60 hover:text-[#502B30]"
                  >
                    {showSecretKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Hold denne key hemmelig! Den bruges kun på serveren.
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <Key className="inline h-4 w-4 mr-2" />
                  Webhook Secret (valgfri)
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? 'text' : 'password'}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="whsec_..."
                    className="w-full px-4 py-2 pr-10 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#502B30]/60 hover:text-[#502B30]"
                  >
                    {showWebhookSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-[#4a2329]/60 mt-1">
                  Bruges til at verificere webhook events fra Stripe
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-[#502B30]/10">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center px-6 py-3 text-amber-100 bg-[#502B30] hover:bg-[#5e3023] rounded-sm transition-colors disabled:opacity-50 shadow-md font-semibold"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-100 border-t-transparent mr-2" />
                      Gemmer...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Gem Konfiguration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Test Card Info */}
          {mode === 'test' && (
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-4">
              <h3 className="font-semibold text-amber-900 mb-2">
                Test Kort Numre (Test Mode)
              </h3>
              <div className="text-sm text-amber-800 space-y-1">
                <p><strong>Success:</strong> 4242 4242 4242 4242</p>
                <p><strong>Requires Authentication:</strong> 4000 0025 0000 3155</p>
                <p><strong>Declined:</strong> 4000 0000 0000 9995</p>
                <p className="text-xs mt-2">Brug en fremtidig udløbsdato og enhver CVC</p>
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}

