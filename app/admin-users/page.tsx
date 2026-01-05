'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  UserPlus, Mail, User as UserIcon, Phone, AlertCircle, 
  CheckCircle, Loader2, Save, Shield, Edit, Trash2, Search,
  Users, X, RefreshCw
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  member_since: string;
}

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  title: string | null;
  points: number;
  frontend_permissions: {
    gusmester: boolean;
    staff: boolean;
    administration: boolean;
  };
  status: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function AdminUsersPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

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
    points: 0,
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
              loadUsers();
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

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('member_since', { ascending: false });

      if (profilesError) throw profilesError;
      console.log('[Admin Users] Loaded profiles:', profilesData?.length, profilesData);
      setUsers(profilesData || []);

      // Load all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;
      console.log('[Admin Users] Loaded employees:', employeesData?.length, employeesData);
      setEmployees(employeesData || []);

    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Kunne ikke indlæse brugere');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Validate
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        setError('Udfyld alle påkrævede felter');
        return;
      }

      if (formData.password.length < 6) {
        setError('Adgangskode skal være mindst 6 tegn');
        return;
      }

      // Create user using API
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

      // Reset form and reload immediately
      resetForm();
      await loadUsers();
      setSuccess(`Bruger oprettet! Email: ${formData.email}`);
      
      // Switch back to list view immediately
      setViewMode('list');

    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Kunne ikke oprette bruger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update employee if exists
      if (selectedEmployee) {
        const { error: employeeError } = await supabase
          .from('employees')
          .update({
            name: formData.employeeName,
            title: formData.employeeTitle,
            points: formData.points,
            frontend_permissions: formData.permissions,
          })
          .eq('id', selectedEmployee.id);

        if (employeeError) throw employeeError;
      }

      await loadUsers();
      setSuccess('Bruger opdateret!');
      
      // Switch back to list view immediately
      setViewMode('list');

    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message || 'Kunne ikke opdatere bruger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne bruger? Dette kan ikke fortrydes.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Delete from auth.users (cascade will handle profile and employee)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      setSuccess('Bruger slettet');
      await loadUsers();

    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Kunne ikke slette bruger');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    const employee = employees.find(e => e.user_id === user.id);
    setSelectedEmployee(employee || null);

    setFormData({
      email: user.email,
      password: '',
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone || '',
      isEmployee: !!employee,
      employeeName: employee?.name || '',
      employeeTitle: employee?.title || '',
      points: employee?.points || 0,
      permissions: employee?.frontend_permissions || {
        gusmester: false,
        staff: false,
        administration: false,
      }
    });

    setViewMode('edit');
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      isEmployee: false,
      employeeName: '',
      employeeTitle: '',
      points: 0,
      permissions: {
        gusmester: false,
        staff: false,
        administration: false,
      }
    });
    setSelectedUser(null);
    setSelectedEmployee(null);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="w-8 h-8 mr-3" />
                Brugeradministration
              </h1>
              <p className="text-gray-600 mt-1">Administrer brugere og medarbejdere</p>
            </div>
            {viewMode === 'list' && (
              <button
                onClick={() => {
                  resetForm();
                  setViewMode('create');
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span>Opret Ny Bruger</span>
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
            <div className="bg-white rounded-lg shadow-md">
              {/* Search and Refresh */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Søg efter email eller navn..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={loadUsers}
                    disabled={loading}
                    className="px-4 py-2 bg-[#502B30] text-white rounded-lg hover:bg-[#3d2024] transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Opdater
                  </button>
                </div>
              </div>

              {/* Users Table */}
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#502B30] mx-auto" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  Ingen brugere fundet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Navn
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Telefon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Medlem siden
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Handlinger
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => {
                        const employee = employees.find(e => e.user_id === user.id);
                        return (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.phone || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {employee ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Medarbejder
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Medlem
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.member_since).toLocaleDateString('da-DK')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                <Edit className="w-4 h-4 inline" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Create/Edit Form */}
          {(viewMode === 'create' || viewMode === 'edit') && (
            <form onSubmit={viewMode === 'create' ? handleCreateUser : handleUpdateUser} className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {viewMode === 'create' ? 'Opret Ny Bruger' : 'Rediger Bruger'}
              </h2>

              {/* Basic Info */}
              <div className="space-y-4">
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
                    disabled={viewMode === 'edit'}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent disabled:bg-gray-100"
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
                  />
                </div>

                {viewMode === 'create' && (
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
                )}
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
                    disabled={viewMode === 'edit' && !selectedEmployee}
                  />
                  <label htmlFor="isEmployee" className="text-lg font-semibold text-gray-900 flex items-center space-x-2 cursor-pointer">
                    <Shield className="w-5 h-5" />
                    <span>Medarbejder</span>
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
                      />
                    </div>

                    {viewMode === 'edit' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Point
                        </label>
                        <input
                          type="number"
                          value={formData.points}
                          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                        />
                      </div>
                    )}

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
                          <span className="text-sm text-gray-700">Gus Mester</span>
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
                          <span className="text-sm text-gray-700">Medarbejder</span>
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
                          <span className="text-sm text-gray-700">Administration</span>
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
                      <span>{viewMode === 'create' ? 'Opret Bruger' : 'Gem Ændringer'}</span>
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
