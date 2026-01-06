'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Palette, Plus, Edit, Trash2, Save, X, AlertCircle, 
  CheckCircle, Loader2, Image as ImageIcon
} from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  color: string;
  price_per_seat: number;
  status: string;
  created_at: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function AdminThemesPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    color: '#6366f1',
    price_per_seat: 150,
    status: 'active',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

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
              loadThemes();
            } else {
              setHasAccess(false);
              setIsCheckingAuth(false);
              setError('Du har ikke adgang til tema administration.');
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

  const loadThemes = async () => {
    try {
      setLoading(true);
      
      const { data, error: themesError } = await supabase
        .from('themes')
        .select('*')
        .order('created_at', { ascending: false });

      if (themesError) throw themesError;
      setThemes(data || []);

    } catch (err: any) {
      console.error('Error loading themes:', err);
      setError('Kunne ikke indlæse temaer');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `themes/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError('Kunne ikke uploade billede: ' + err.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (!formData.name) {
        setError('Tema navn er påkrævet');
        return;
      }

      // Upload image if selected
      let imageUrl = formData.image_url;
      if (selectedImageFile) {
        const uploadedUrl = await handleImageUpload(selectedImageFile);
        if (!uploadedUrl) return; // Error already set
        imageUrl = uploadedUrl;
      }

      const { error: insertError } = await supabase
        .from('themes')
        .insert({
          name: formData.name,
          description: formData.description || null,
          image_url: imageUrl || null,
          color: formData.color,
          price_per_seat: formData.price_per_seat,
          status: formData.status,
        });

      if (insertError) throw insertError;

      setSuccess('Tema oprettet!');
      resetForm();
      await loadThemes();
      setTimeout(() => setViewMode('list'), 1500);

    } catch (err: any) {
      console.error('Error creating theme:', err);
      setError(err.message || 'Kunne ikke oprette tema');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTheme) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (!formData.name) {
        setError('Tema navn er påkrævet');
        return;
      }

      // Upload new image if selected
      let imageUrl = formData.image_url;
      if (selectedImageFile) {
        const uploadedUrl = await handleImageUpload(selectedImageFile);
        if (!uploadedUrl) return; // Error already set
        imageUrl = uploadedUrl;
      }

      const { error: updateError } = await supabase
        .from('themes')
        .update({
          name: formData.name,
          description: formData.description || null,
          image_url: imageUrl || null,
          color: formData.color,
          price_per_seat: formData.price_per_seat,
          status: formData.status,
        })
        .eq('id', selectedTheme.id);

      if (updateError) throw updateError;

      setSuccess('Tema opdateret!');
      await loadThemes();
      setTimeout(() => setViewMode('list'), 1500);

    } catch (err: any) {
      console.error('Error updating theme:', err);
      setError(err.message || 'Kunne ikke opdatere tema');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (themeId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette tema?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('themes')
        .delete()
        .eq('id', themeId);

      if (deleteError) throw deleteError;

      setSuccess('Tema slettet');
      await loadThemes();

    } catch (err: any) {
      console.error('Error deleting theme:', err);
      setError(err.message || 'Kunne ikke slette tema');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (theme: Theme) => {
    setSelectedTheme(theme);
    setFormData({
      name: theme.name,
      description: theme.description || '',
      image_url: theme.image_url || '',
      color: theme.color,
      price_per_seat: theme.price_per_seat || 150,
      status: theme.status,
    });
    setViewMode('edit');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      color: '#6366f1',
      price_per_seat: 150,
      status: 'active',
    });
    setSelectedTheme(null);
    setSelectedImageFile(null);
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Palette className="w-8 h-8 mr-3" />
                Tema Administration
              </h1>
              <p className="text-gray-600 mt-1">Administrer session temaer</p>
            </div>
            {viewMode === 'list' && (
              <button
                onClick={() => {
                  resetForm();
                  setViewMode('create');
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-[#502B30] text-amber-50 rounded-lg hover:bg-[#5e3023] transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Opret Nyt Tema</span>
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
              ) : themes.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center">
                  <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Ingen temaer endnu</p>
                </div>
              ) : (
                themes.map((theme) => (
                  <div
                    key={theme.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Color Bar */}
                    <div
                      className="h-24 flex items-center justify-center"
                      style={{ backgroundColor: theme.color }}
                    >
                      {theme.image_url ? (
                        <img
                          src={theme.image_url}
                          alt={theme.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Palette className="w-12 h-12 text-white opacity-50" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {theme.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            theme.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {theme.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>

                      {theme.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                          {theme.description}
                        </p>
                      )}

                      <div className="text-lg font-bold text-[#502B30] mb-4">
                        {theme.price_per_seat} kr/plads
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(theme)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Rediger
                        </button>
                        <button
                          onClick={() => handleDelete(theme.id)}
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
                {viewMode === 'create' ? 'Opret Nyt Tema' : 'Rediger Tema'}
              </h2>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema Navn *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="F.eks. Meditation, Yoga, Detox"
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
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="Beskriv temaet..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="inline w-4 h-4 mr-2" />
                  Tema Billede
                </label>
                
                {/* File Upload */}
                <div className="mb-3">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedImageFile(file);
                          setFormData({ ...formData, image_url: '' }); // Clear URL if file selected
                        }
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-[#502B30] file:text-amber-50
                        hover:file:bg-[#5e3023]
                        cursor-pointer"
                    />
                  </label>
                  {selectedImageFile && (
                    <p className="text-sm text-green-600 mt-2">
                      Valgt: {selectedImageFile.name}
                    </p>
                  )}
                  {uploadingImage && (
                    <p className="text-sm text-blue-600 mt-2">
                      Uploader billede...
                    </p>
                  )}
                </div>

                {/* OR divider */}
                <div className="flex items-center my-3">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-3 text-sm text-gray-500">eller</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* URL Input */}
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value });
                    setSelectedImageFile(null); // Clear file if URL entered
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                  disabled={!!selectedImageFile}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload et billede eller indsæt en URL
                </p>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema Farve
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent font-mono"
                    placeholder="#6366f1"
                  />
                </div>
              </div>

              {/* Price Per Seat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pris pr. Plads (DKK) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.price_per_seat}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setFormData({ ...formData, price_per_seat: isNaN(value) ? 0 : value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="150"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Denne pris bruges når kunder vælger dette tema ved booking af private events
                </p>
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
                      <span>{viewMode === 'create' ? 'Opret Tema' : 'Gem Ændringer'}</span>
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

