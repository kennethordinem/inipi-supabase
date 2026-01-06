'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  ShoppingBag, Plus, Edit, Trash2, Save, X, AlertCircle, 
  CheckCircle, Loader2, Ticket
} from 'lucide-react';

interface ShopPunchCard {
  id: string;
  name: string;
  description: string | null;
  total_punches: number;
  price: number;
  status: string;
  created_at: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function AdminShopPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [punchCards, setPunchCards] = useState<ShopPunchCard[]>([]);
  const [selectedPunchCard, setSelectedPunchCard] = useState<ShopPunchCard | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_punches: 10,
    price: 1200,
    status: 'active',
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
              loadPunchCards();
            } else {
              setHasAccess(false);
              setIsCheckingAuth(false);
              setError('Du har ikke adgang til shop administration.');
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

  const loadPunchCards = async () => {
    try {
      setLoading(true);
      
      const { data, error: punchCardsError } = await supabase
        .from('shop_products')
        .select('*')
        .eq('category', 'punch_card')
        .order('created_at', { ascending: false });

      if (punchCardsError) throw punchCardsError;
      setPunchCards(data || []);

    } catch (err: any) {
      console.error('Error loading punch cards:', err);
      setError('Kunne ikke indlæse klippekort');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (!formData.name || !formData.total_punches || !formData.price) {
        setError('Udfyld alle påkrævede felter');
        return;
      }

      const { error: insertError } = await supabase
        .from('shop_products')
        .insert({
          name: formData.name,
          description: formData.description || null,
          total_punches: formData.total_punches,
          price: formData.price,
          category: 'punch_card',
          status: formData.status,
        });

      if (insertError) throw insertError;

      setSuccess('Klippekort oprettet!');
      resetForm();
      await loadPunchCards();
      setTimeout(() => setViewMode('list'), 1500);

    } catch (err: any) {
      console.error('Error creating punch card:', err);
      setError(err.message || 'Kunne ikke oprette klippekort');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPunchCard) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (!formData.name || !formData.total_punches || !formData.price) {
        setError('Udfyld alle påkrævede felter');
        return;
      }

      const { error: updateError } = await supabase
        .from('shop_products')
        .update({
          name: formData.name,
          description: formData.description || null,
          total_punches: formData.total_punches,
          price: formData.price,
          status: formData.status,
        })
        .eq('id', selectedPunchCard.id);

      if (updateError) throw updateError;

      setSuccess('Klippekort opdateret!');
      await loadPunchCards();
      setTimeout(() => setViewMode('list'), 1500);

    } catch (err: any) {
      console.error('Error updating punch card:', err);
      setError(err.message || 'Kunne ikke opdatere klippekort');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (punchCardId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette klippekort?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('shop_products')
        .delete()
        .eq('id', punchCardId);

      if (deleteError) throw deleteError;

      setSuccess('Klippekort slettet');
      await loadPunchCards();

    } catch (err: any) {
      console.error('Error deleting punch card:', err);
      setError(err.message || 'Kunne ikke slette klippekort');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (punchCard: ShopPunchCard) => {
    setSelectedPunchCard(punchCard);
    setFormData({
      name: punchCard.name,
      description: punchCard.description || '',
      total_punches: punchCard.total_punches,
      price: punchCard.price,
      status: punchCard.status,
    });
    setViewMode('edit');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      total_punches: 10,
      price: 1200,
      status: 'active',
    });
    setSelectedPunchCard(null);
    setError(null);
    setSuccess(null);
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Klippekort Administration</h1>
            <p className="text-gray-600 mt-1">Administrer klippekort og shop produkter</p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => window.location.href = '/admin-punch-cards'}
                className="pb-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Opret Klippekort
              </button>
              <button
                className="pb-4 px-1 border-b-2 font-medium text-sm transition-colors border-[#502B30] text-[#502B30]"
              >
                Shop Produkter
              </button>
            </nav>
          </div>

          {/* View Toggle */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              {viewMode === 'create' ? 'Opret nyt klippekort produkt til salg' : viewMode === 'edit' ? 'Rediger klippekort produkt' : 'Oversigt over shop produkter'}
            </p>
            {viewMode === 'list' && (
              <button
                onClick={() => {
                  resetForm();
                  setViewMode('create');
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Opret Klippekort</span>
              </button>
            )}
            {viewMode !== 'list' && (
              <button
                onClick={() => {
                  resetForm();
                  setViewMode('list');
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
                <span>Annuller</span>
              </button>
            )}
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#502B30] mx-auto" />
                </div>
              ) : punchCards.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center">
                  <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Ingen klippekort endnu</p>
                </div>
              ) : (
                punchCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                      <Ticket className="w-12 h-12 mb-2 opacity-80" />
                      <h3 className="text-xl font-bold">{card.name}</h3>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-[#502B30]">{card.price} kr</p>
                        <p className="text-sm text-gray-600">{card.total_punches} klip</p>
                      </div>

                      {card.description && (
                        <p className="text-sm text-gray-600 mb-4">
                          {card.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            card.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {card.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(card)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Rediger
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Slet
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Create/Edit Form */}
          {(viewMode === 'create' || viewMode === 'edit') && (
            <form onSubmit={viewMode === 'create' ? handleCreate : handleUpdate} className="bg-white rounded-lg shadow-md p-6 space-y-6 max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-gray-900">
                {viewMode === 'create' ? 'Opret Nyt Klippekort' : 'Rediger Klippekort'}
              </h2>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Navn *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="F.eks. 10 Klip, 20 Klip"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivelse
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="Beskriv klippekortet..."
                />
              </div>

              {/* Total Punches */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Antal Klip *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.total_punches}
                  onChange={(e) => setFormData({ ...formData, total_punches: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pris (DKK) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="10"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                >
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{viewMode === 'create' ? 'Opretter...' : 'Gemmer...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>{viewMode === 'create' ? 'Opret Klippekort' : 'Gem Ændringer'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

