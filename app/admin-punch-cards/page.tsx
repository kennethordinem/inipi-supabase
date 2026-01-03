'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Ticket, Plus, Loader2, AlertCircle, CheckCircle, User, Search
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface GroupType {
  id: string;
  name: string;
  color: string;
}

export default function AdminPunchCardsPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    user_id: '',
    name: '10 Klip',
    total_punches: 10,
    price: 1200,
    valid_for_group_types: [] as string[],
    expiry_months: 12,
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
              loadData();
            } else {
              setHasAccess(false);
              setIsCheckingAuth(false);
              setError('Du har ikke adgang til klippekort administration.');
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

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          u =>
            u.email.toLowerCase().includes(query) ||
            u.first_name.toLowerCase().includes(query) ||
            u.last_name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('first_name');

      if (usersError) throw usersError;
      setUsers(usersData || []);
      setFilteredUsers(usersData || []);

      // Load group types
      const { data: groupTypesData, error: groupTypesError } = await supabase
        .from('group_types')
        .select('id, name, color')
        .eq('status', 'active')
        .order('name');

      if (groupTypesError) throw groupTypesError;
      setGroupTypes(groupTypesData || []);

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Kunne ikke indlæse data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (!formData.user_id) {
        setError('Vælg en bruger');
        setSubmitting(false);
        return;
      }

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + formData.expiry_months);

      // Create punch card
      const { error: insertError } = await supabase
        .from('punch_cards')
        .insert({
          user_id: formData.user_id,
          name: formData.name,
          total_punches: formData.total_punches,
          remaining_punches: formData.total_punches,
          price: formData.price,
          valid_for_group_types: formData.valid_for_group_types,
          expiry_date: expiryDate.toISOString().split('T')[0],
          status: 'active',
        });

      if (insertError) throw insertError;

      const selectedUser = users.find(u => u.id === formData.user_id);
      setSuccess(`Klippekort oprettet for ${selectedUser?.first_name} ${selectedUser?.last_name}`);

      // Reset form
      setFormData({
        user_id: '',
        name: '10 Klip',
        total_punches: 10,
        price: 1200,
        valid_for_group_types: [],
        expiry_months: 12,
      });

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error creating punch card:', err);
      setError(err.message || 'Kunne ikke oprette klippekort');
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Opret Klippekort</h1>
            <p className="text-gray-600 mt-1">Tildel klippekort til brugere manuelt (til test)</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">{success}</span>
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
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vælg Bruger *
              </label>
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Søg efter navn eller email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#502B30]" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Ingen brugere fundet
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <label
                      key={user.id}
                      className={`flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        formData.user_id === user.id ? 'bg-[#502B30]/5' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="user_id"
                        value={user.id}
                        checked={formData.user_id === user.id}
                        onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                        className="text-[#502B30] focus:ring-[#502B30]"
                      />
                      <User className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Punch Card Details */}
            <div className="grid grid-cols-2 gap-4">
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
                  placeholder="F.eks. 10 Klip"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pris (DKK) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Udløber om (måneder) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.expiry_months}
                  onChange={(e) => setFormData({ ...formData, expiry_months: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                />
              </div>
            </div>

            {/* Valid for Group Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gyldig til (valgfrit - tom = alle typer)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {groupTypes.map(gt => (
                  <label key={gt.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.valid_for_group_types.includes(gt.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            valid_for_group_types: [...formData.valid_for_group_types, gt.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            valid_for_group_types: formData.valid_for_group_types.filter(id => id !== gt.id)
                          });
                        }
                      }}
                      className="rounded text-[#502B30] focus:ring-[#502B30]"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: gt.color }}
                    />
                    <span className="text-sm text-gray-700">{gt.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting || !formData.user_id}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Opretter klippekort...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Opret Klippekort</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Dette er til test/udvikling. I produktion vil brugere købe klippekort via shop'en med Stripe.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

