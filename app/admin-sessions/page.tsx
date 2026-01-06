'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Calendar, Clock, Users, MapPin, Plus, Edit, Trash2, X, 
  Save, Loader2, AlertCircle, CheckCircle, Copy, Filter, SortAsc 
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { da } from 'date-fns/locale';

interface Session {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  max_participants: number;
  minimum_participants: number;
  max_seats_per_booking: number;
  current_participants: number;
  price: number;
  location: string;
  group_type_id: string;
  status: string;
  group_types?: {
    name: string;
    color: string;
  };
}

interface GroupType {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Theme {
  id: string;
  name: string;
}

export default function AdminSessionsPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter and sort state
  const [filters, setFilters] = useState({
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    groupTypeId: '',
    status: 'all',
    searchText: '',
  });
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'participants' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [repeatSession, setRepeatSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '17:00',
    duration: 90,
    max_participants: 12,
    minimum_participants: 1,
    max_seats_per_booking: 6,
    price: 150,
    location: 'Havkajakvej, Amagerstrand',
    group_type_id: '',
    employee_id: '', // Changed from array to single string
    theme_ids: [] as string[],
  });
  const [repeatFormData, setRepeatFormData] = useState({
    dates: [''] as string[],
    keepEmployees: true,
    keepThemes: true,
  });
  const [submitting, setSubmitting] = useState(false);

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
              setError('Du har ikke adgang til session administration.');
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

  // Filter and sort effect
  useEffect(() => {
    let filtered = [...sessions];

    // Apply filters
    if (filters.dateFrom) {
      filtered = filtered.filter(s => s.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(s => s.date <= filters.dateTo);
    }
    if (filters.groupTypeId) {
      filtered = filtered.filter(s => s.group_type_id === filters.groupTypeId);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.description?.toLowerCase().includes(search) ||
        s.location.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'participants':
          comparison = a.current_participants - b.current_participants;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredSessions(filtered);
  }, [sessions, filters, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load ALL sessions (we'll filter client-side)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          group_types (name, color)
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: true });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Load group types
      const { data: groupTypesData, error: groupTypesError } = await supabase
        .from('group_types')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (groupTypesError) throw groupTypesError;
      setGroupTypes(groupTypesData || []);

      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Load themes
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (themesError) throw themesError;
      setThemes(themesData || []);

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Kunne ikke indlæse data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSession(null);
    setFormData({
      name: '',
      description: '',
      date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      time: '17:00',
      duration: 90,
      max_participants: 12,
      minimum_participants: 1,
      max_seats_per_booking: 6,
      price: 150,
      location: 'Havkajakvej, Amagerstrand',
      group_type_id: groupTypes[0]?.id || '',
      employee_id: '',
      theme_ids: [],
    });
    setShowModal(true);
  };

  const handleEdit = async (session: Session) => {
    setEditingSession(session);

    // Load session employees and themes
    const { data: sessionEmployees } = await supabase
      .from('session_employees')
      .select('employee_id')
      .eq('session_id', session.id);

    const { data: sessionThemes } = await supabase
      .from('session_themes')
      .select('theme_id')
      .eq('session_id', session.id);

    setFormData({
      name: session.name,
      description: session.description || '',
      date: session.date,
      time: session.time,
      duration: session.duration,
      max_participants: session.max_participants,
      minimum_participants: session.minimum_participants || 1,
      max_seats_per_booking: session.max_seats_per_booking || 6,
      price: session.price,
      location: session.location || 'Havkajakvej, Amagerstrand',
      group_type_id: session.group_type_id,
      employee_id: sessionEmployees?.[0]?.employee_id || '', // Get first employee only
      theme_ids: sessionThemes?.map(st => st.theme_id) || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne session? Dette kan ikke fortrydes.')) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteError) throw deleteError;

      setSuccess('Session slettet');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting session:', err);
      setError(err.message || 'Kunne ikke slette session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepeat = async (session: Session) => {
    setRepeatSession(session);
    
    // Load session employees and themes
    const { data: sessionEmployees } = await supabase
      .from('session_employees')
      .select('employee_id')
      .eq('session_id', session.id);

    const { data: sessionThemes } = await supabase
      .from('session_themes')
      .select('theme_id')
      .eq('session_id', session.id);

    // Initialize with one date field (tomorrow)
    setRepeatFormData({
      dates: [format(addDays(new Date(session.date), 1), 'yyyy-MM-dd')],
      keepEmployees: (sessionEmployees?.length || 0) > 0,
      keepThemes: (sessionThemes?.length || 0) > 0,
    });
    
    setShowRepeatModal(true);
  };

  const handleRepeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repeatSession) return;

    try {
      setSubmitting(true);
      setError(null);

      // Load original session's employees and themes if needed
      let employeeIds: string[] = [];
      let themeIds: string[] = [];

      if (repeatFormData.keepEmployees) {
        const { data: sessionEmployees } = await supabase
          .from('session_employees')
          .select('employee_id')
          .eq('session_id', repeatSession.id);
        employeeIds = sessionEmployees?.map(se => se.employee_id) || [];
      }

      if (repeatFormData.keepThemes) {
        const { data: sessionThemes } = await supabase
          .from('session_themes')
          .select('theme_id')
          .eq('session_id', repeatSession.id);
        themeIds = sessionThemes?.map(st => st.theme_id) || [];
      }

      // Create a session for each date
      let createdCount = 0;
      for (const date of repeatFormData.dates) {
        if (!date) continue; // Skip empty dates

        // Create session
        const { data: newSession, error: insertError } = await supabase
          .from('sessions')
          .insert({
            name: repeatSession.name,
            description: repeatSession.description,
            date: date,
            time: repeatSession.time,
            duration: repeatSession.duration,
            max_participants: repeatSession.max_participants,
            minimum_participants: repeatSession.minimum_participants || 1,
            current_participants: 0,
            price: repeatSession.price,
            location: repeatSession.location,
            group_type_id: repeatSession.group_type_id,
            status: 'active',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Add employees
        if (employeeIds.length > 0) {
          const { error: employeesError } = await supabase
            .from('session_employees')
            .insert(employeeIds.map(emp_id => ({
              session_id: newSession.id,
              employee_id: emp_id
            })));
          if (employeesError) throw employeesError;
        }

        // Add themes
        if (themeIds.length > 0) {
          const { error: themesError } = await supabase
            .from('session_themes')
            .insert(themeIds.map(theme_id => ({
              session_id: newSession.id,
              theme_id: theme_id
            })));
          if (themesError) throw themesError;
        }

        createdCount++;
      }

      setSuccess(`${createdCount} session(er) oprettet`);
      setShowRepeatModal(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error repeating session:', err);
      setError(err.message || 'Kunne ikke gentage session');
    } finally {
      setSubmitting(false);
    }
  };

  const addDateField = () => {
    setRepeatFormData({
      ...repeatFormData,
      dates: [...repeatFormData.dates, '']
    });
  };

  const removeDateField = (index: number) => {
    setRepeatFormData({
      ...repeatFormData,
      dates: repeatFormData.dates.filter((_, i) => i !== index)
    });
  };

  const updateDate = (index: number, value: string) => {
    const newDates = [...repeatFormData.dates];
    newDates[index] = value;
    setRepeatFormData({
      ...repeatFormData,
      dates: newDates
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      if (editingSession) {
        // Update existing session
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            name: formData.name,
            description: formData.description,
            date: formData.date,
            time: formData.time,
            duration: formData.duration,
            max_participants: formData.max_participants,
            minimum_participants: formData.minimum_participants,
            max_seats_per_booking: formData.max_seats_per_booking,
            price: formData.price,
            location: formData.location,
            group_type_id: formData.group_type_id,
          })
          .eq('id', editingSession.id);

        if (updateError) throw updateError;

        // Update session employee (single gusmester)
        await supabase.from('session_employees').delete().eq('session_id', editingSession.id);
        if (formData.employee_id) {
          const { error: employeesError } = await supabase
            .from('session_employees')
            .insert({
              session_id: editingSession.id,
              employee_id: formData.employee_id
            });
          if (employeesError) throw employeesError;
        }

        // Update session themes
        await supabase.from('session_themes').delete().eq('session_id', editingSession.id);
        if (formData.theme_ids.length > 0) {
          const { error: themesError } = await supabase
            .from('session_themes')
            .insert(formData.theme_ids.map(theme_id => ({
              session_id: editingSession.id,
              theme_id: theme_id
            })));
          if (themesError) throw themesError;
        }

        setSuccess('Session opdateret');
      } else {
        // Create new session
        const { data: newSession, error: insertError } = await supabase
          .from('sessions')
          .insert({
            name: formData.name,
            description: formData.description,
            date: formData.date,
            time: formData.time,
            duration: formData.duration,
            max_participants: formData.max_participants,
            minimum_participants: formData.minimum_participants,
            max_seats_per_booking: formData.max_seats_per_booking,
            current_participants: 0,
            price: formData.price,
            location: formData.location,
            group_type_id: formData.group_type_id,
            status: 'active',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Add session employee (single gusmester)
        if (formData.employee_id) {
          const { error: employeesError } = await supabase
            .from('session_employees')
            .insert({
              session_id: newSession.id,
              employee_id: formData.employee_id
            });
          if (employeesError) throw employeesError;
        }

        // Add session themes
        if (formData.theme_ids.length > 0) {
          const { error: themesError } = await supabase
            .from('session_themes')
            .insert(formData.theme_ids.map(theme_id => ({
              session_id: newSession.id,
              theme_id: theme_id
            })));
          if (themesError) throw themesError;
        }

        setSuccess('Session oprettet');
      }

      setShowModal(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving session:', err);
      setError(err.message || 'Kunne ikke gemme session');
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Session Administration</h1>
            <p className="text-gray-600 mt-1">Opret og administrer sauna sessioner</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Ny Session</span>
          </button>
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

        {/* Filters and Sort */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-[#502B30]" />
            <h3 className="text-lg font-semibold text-gray-900">Filtrer & Sorter</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Søg
              </label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                placeholder="Navn, beskrivelse, lokation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent text-sm"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fra dato
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Til dato
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent text-sm"
              />
            </div>

            {/* Group Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.groupTypeId}
                onChange={(e) => setFilters({ ...filters, groupTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent text-sm"
              >
                <option value="">Alle typer</option>
                {groupTypes.map(gt => (
                  <option key={gt.id} value={gt.id}>{gt.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent text-sm"
              >
                <option value="all">Alle</option>
                <option value="active">Aktiv</option>
                <option value="cancelled">Aflyst</option>
                <option value="completed">Gennemført</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sorter efter
              </label>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent text-sm"
                >
                  <option value="date">Dato</option>
                  <option value="name">Navn</option>
                  <option value="participants">Deltagere</option>
                  <option value="price">Pris</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={sortOrder === 'asc' ? 'Stigende' : 'Faldende'}
                >
                  <SortAsc className={`w-5 h-5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Results count and reset */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Viser <strong>{filteredSessions.length}</strong> af <strong>{sessions.length}</strong> sessioner
            </p>
            <button
              onClick={() => {
                setFilters({
                  dateFrom: format(new Date(), 'yyyy-MM-dd'),
                  dateTo: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                  groupTypeId: '',
                  status: 'all',
                  searchText: '',
                });
                setSortBy('date');
                setSortOrder('asc');
              }}
              className="text-sm text-[#502B30] hover:underline"
            >
              Nulstil filtre
            </button>
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#502B30]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Ingen sessioner endnu. Opret den første!</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Ingen sessioner matcher dine filtre.</p>
            <button
              onClick={() => {
                setFilters({
                  dateFrom: format(new Date(), 'yyyy-MM-dd'),
                  dateTo: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                  groupTypeId: '',
                  status: 'all',
                  searchText: '',
                });
              }}
              className="mt-4 text-[#502B30] hover:underline"
            >
              Nulstil filtre
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{session.name}</h3>
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${session.group_types?.color}20`,
                          color: session.group_types?.color
                        }}
                      >
                        {session.group_types?.name}
                      </span>
                    </div>
                    
                    {session.description && (
                      <p className="text-gray-600 mb-3">{session.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(session.date), 'dd. MMM yyyy', { locale: da })}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{session.time} ({session.duration} min)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{session.current_participants}/{session.max_participants}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{session.location}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-lg font-semibold text-[#502B30]">
                      {session.price} DKK
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleRepeat(session)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Gentag session"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(session)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Rediger"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Slet"
                      disabled={session.current_participants > 0}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Repeat Session Modal */}
      {showRepeatModal && repeatSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Gentag Session: {repeatSession.name}
              </h2>
              <button
                onClick={() => setShowRepeatModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRepeatSubmit} className="p-6 space-y-6">
              {/* Original Session Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-900">Original Session</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Dato:</strong> {format(new Date(repeatSession.date), 'dd. MMM yyyy', { locale: da })}</p>
                  <p><strong>Tid:</strong> {repeatSession.time} ({repeatSession.duration} min)</p>
                  <p><strong>Deltagere:</strong> {repeatSession.max_participants}</p>
                  <p><strong>Pris:</strong> {repeatSession.price} DKK</p>
                  <p><strong>Lokation:</strong> {repeatSession.location}</p>
                </div>
              </div>

              {/* Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datoer for nye sessioner *
                </label>
                <div className="space-y-2">
                  {repeatFormData.dates.map((date, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => updateDate(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                      />
                      {repeatFormData.dates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDateField(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Fjern dato"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addDateField}
                  className="mt-2 flex items-center space-x-2 px-4 py-2 text-sm text-[#502B30] border border-[#502B30] rounded-lg hover:bg-[#502B30] hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tilføj dato</span>
                </button>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatFormData.keepEmployees}
                    onChange={(e) => setRepeatFormData({ ...repeatFormData, keepEmployees: e.target.checked })}
                    className="rounded text-[#502B30] focus:ring-[#502B30]"
                  />
                  <span className="text-sm text-gray-700">Kopier gusmestre til nye sessioner</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatFormData.keepThemes}
                    onChange={(e) => setRepeatFormData({ ...repeatFormData, keepThemes: e.target.checked })}
                    className="rounded text-[#502B30] focus:ring-[#502B30]"
                  />
                  <span className="text-sm text-gray-700">Kopier temaer til nye sessioner</span>
                </label>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Alle andre detaljer (navn, tid, varighed, max deltagere, pris, lokation, type) 
                  vil blive kopieret fra den originale session.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRepeatModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-2 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Opretter...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Opret {repeatFormData.dates.filter(d => d).length} Session(er)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSession ? 'Rediger Session' : 'Ny Session'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  placeholder="F.eks. Fyraftensgus"
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
                  placeholder="Beskrivelse af sessionen..."
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dato *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tidspunkt *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Duration, Min/Max Participants, Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Varighed (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min="30"
                    step="15"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                </div>
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
              </div>

              {/* Min and Max Participants */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min deltagere *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.minimum_participants}
                    onChange={(e) => setFormData({ ...formData, minimum_participants: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max deltagere *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max pr. booking *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_seats_per_booking}
                    onChange={(e) => setFormData({ ...formData, max_seats_per_booking: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Inkl. klient selv</p>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                />
              </div>

              {/* Group Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  required
                  value={formData.group_type_id}
                  onChange={(e) => setFormData({ ...formData, group_type_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                >
                  <option value="">Vælg type...</option>
                  {groupTypes.map(gt => (
                    <option key={gt.id} value={gt.id}>{gt.name}</option>
                  ))}
                </select>
              </div>

              {/* Employee (Single Gusmester) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gusmester
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                >
                  <option value="">Ingen gusmester</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Themes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temaer
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {themes.map(theme => (
                    <label key={theme.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.theme_ids.includes(theme.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, theme_ids: [...formData.theme_ids, theme.id] });
                          } else {
                            setFormData({ ...formData, theme_ids: formData.theme_ids.filter(id => id !== theme.id) });
                          }
                        }}
                        className="rounded text-[#502B30] focus:ring-[#502B30]"
                      />
                      <span className="text-sm text-gray-700">{theme.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-2 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gemmer...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>{editingSession ? 'Gem Ændringer' : 'Opret Session'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

