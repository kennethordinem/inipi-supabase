'use client';

import { useState, useEffect } from 'react';
import { members } from '@/lib/clinio';
import type { AuthState } from '@/lib/members-sdk/dist/types';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { User, Mail, Phone, MapPin, Calendar, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, getAuth } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  memberSince: string | null;
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    city: '',
    postalCode: ''
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = members.onAuthStateChanged((authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          // Not logged in, redirect to login
          window.location.href = '/login';
        } else {
          // Logged in, load data
          loadProfileData();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const profile = await members.getProfile();
      
      setProfileData(profile);
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        street: '',
        city: '',
        postalCode: ''
      });
    } catch (err: any) {
      console.error('[Profile] Error loading profile:', err);
      setError('Kunne ikke indlæse profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccessMessage('');

      await members.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode
        }
      });

      // Update local state
      setProfileData(prev => prev ? {
        ...prev,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      } : null);

      setIsEditing(false);
      setSuccessMessage('Profil opdateret!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err: any) {
      console.error('[Profile] Error saving profile:', err);
      setError('Kunne ikke gemme ændringer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const auth = getAuth(getFirebaseApp());
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      setPasswordError('Ikke logget ind');
      return;
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Udfyld alle felter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Nye adgangskoder matcher ikke');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Ny adgangskode skal være mindst 6 tegn');
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordError('');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      setSuccessMessage('Adgangskode ændret!');
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err: any) {
      console.error('[Profile] Error changing password:', err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Forkert nuværende adgangskode');
      } else if (err.code === 'auth/too-many-requests') {
        setPasswordError('For mange forsøg. Prøv igen senere.');
      } else {
        setPasswordError('Kunne ikke ændre adgangskode');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser profil...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!profileData) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5]">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-sm p-4">
              <p className="text-red-800">Kunne ikke indlæse profil</p>
            </div>
          </main>
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
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide">
              Min Profil
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Se og rediger dine personlige oplysninger
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-sm p-4">
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-sm p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#502B30]">
                Personlige Oplysninger
              </h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-[#502B30] hover:bg-[#502B30]/10 rounded-sm transition-colors border border-[#502B30]/20"
                >
                  Rediger
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        firstName: profileData.firstName || '',
                        lastName: profileData.lastName || '',
                        phone: profileData.phone || '',
                        street: '',
                        city: '',
                        postalCode: ''
                      });
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-[#4a2329]/80 hover:bg-[#502B30]/10 rounded-sm transition-colors disabled:opacity-50 border border-[#502B30]/20"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 text-sm font-medium text-amber-100 bg-[#502B30] hover:bg-[#5e3023] rounded-sm transition-colors disabled:opacity-50 shadow-md"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-100 border-t-transparent mr-2" />
                        Gemmer...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Gem
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Navn
                </label>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Fornavn"
                      className="px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Efternavn"
                      className="px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <p className="text-[#502B30]">
                    {profileData.firstName || profileData.lastName 
                      ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
                      : 'Ikke angivet'}
                  </p>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email
                </label>
                <p className="text-[#502B30]">{profileData.email}</p>
                <p className="text-xs text-[#4a2329]/60 mt-1">Email kan ikke ændres</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Telefon
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                  />
                ) : (
                  <p className="text-[#502B30]">{profileData.phone || 'Ikke angivet'}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  <MapPin className="inline h-4 w-4 mr-2" />
                  Adresse
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Gade og nummer"
                      className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="Postnummer"
                        className="px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="By"
                        className="px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[#502B30]">
                    {formData.street && formData.city
                      ? `${formData.street}, ${formData.postalCode || ''} ${formData.city}`
                      : 'Ikke angivet'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#502B30]">
                  Sikkerhed
                </h2>
                <p className="text-sm text-[#4a2329]/70 mt-1">
                  Skift din adgangskode
                </p>
              </div>
              {!showPasswordSection && (
                <button
                  onClick={() => setShowPasswordSection(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-[#502B30] hover:bg-[#502B30]/10 rounded-sm transition-colors border border-[#502B30]/20"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Skift Adgangskode
                </button>
              )}
            </div>

            {showPasswordSection && (
              <div className="space-y-4">
                {/* Password Error */}
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-sm p-3">
                    <p className="text-sm text-red-800">{passwordError}</p>
                  </div>
                )}

                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Nuværende Adgangskode
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#502B30]/60 hover:text-[#502B30]"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Ny Adgangskode
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#502B30]/60 hover:text-[#502B30]"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Bekræft Ny Adgangskode
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#502B30]/60 hover:text-[#502B30]"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                    disabled={isChangingPassword}
                    className="px-4 py-2 text-sm font-medium text-[#4a2329]/80 hover:bg-[#502B30]/10 rounded-sm transition-colors disabled:opacity-50 border border-[#502B30]/20"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="flex items-center px-4 py-2 text-sm font-medium text-amber-100 bg-[#502B30] hover:bg-[#5e3023] rounded-sm transition-colors disabled:opacity-50 shadow-md"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-100 border-t-transparent mr-2" />
                        Skifter...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Skift Adgangskode
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}

