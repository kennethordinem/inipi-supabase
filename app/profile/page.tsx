'use client';

import { useState, useEffect } from 'react';
import { members } from '@/lib/supabase-sdk';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { User, Mail, Phone, MapPin, Calendar, Lock, Save, Eye, EyeOff, Star, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  
  // Employee/Gusmester state
  const [isEmployee, setIsEmployee] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    title: '',
    bio: '',
    photoUrl: '',
    experience: '',
    specializations: [] as string[],
    qualifications: [] as string[],
    showInBooking: true,
  });
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  
  // Email change state
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  
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

      // Check if user is an employee
      const employeeCheck = await members.checkIfEmployee();
      setIsEmployee(employeeCheck.isEmployee);

      if (employeeCheck.isEmployee) {
        // Load employee public profile
        const empProfile = await members.getEmployeePublicProfile();
        setEmployeeProfile(empProfile);
        setEmployeeFormData({
          title: empProfile.title || '',
          bio: empProfile.publicProfile?.bio || '',
          photoUrl: empProfile.publicProfile?.photoUrl || '',
          experience: empProfile.publicProfile?.experience || '',
          specializations: empProfile.publicProfile?.specializations || [],
          qualifications: empProfile.publicProfile?.qualifications || [],
          showInBooking: empProfile.publicProfile?.showInBooking !== false,
        });
      }
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

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `employees/${fileName}`;

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

  const handleSaveEmployeeProfile = async () => {
    try {
      setIsSavingEmployee(true);
      setError('');
      setSuccessMessage('');

      // Upload image if selected
      let photoUrl = employeeFormData.photoUrl;
      if (selectedImageFile) {
        const uploadedUrl = await handleImageUpload(selectedImageFile);
        if (!uploadedUrl) return; // Error already set
        photoUrl = uploadedUrl;
      }

      await members.updateEmployeePublicProfile({
        ...employeeFormData,
        photoUrl,
      });

      setIsEditingEmployee(false);
      setSelectedImageFile(null);
      setSuccessMessage('Gusmester profil opdateret!');
      
      // Reload employee profile
      const empProfile = await members.getEmployeePublicProfile();
      setEmployeeProfile(empProfile);

      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err: any) {
      console.error('[Profile] Error saving employee profile:', err);
      setError('Kunne ikke gemme gusmester profil');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleChangeEmail = async () => {
    // Validation
    if (!newEmail || !confirmNewEmail) {
      setEmailError('Udfyld begge felter');
      return;
    }

    if (newEmail !== confirmNewEmail) {
      setEmailError('Email adresser matcher ikke');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Ugyldig email adresse');
      return;
    }

    if (newEmail === profileData?.email) {
      setEmailError('Ny email er den samme som nuværende email');
      return;
    }

    try {
      setIsChangingEmail(true);
      setEmailError('');

      // Update email in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        throw updateError;
      }

      // Clear form
      setNewEmail('');
      setConfirmNewEmail('');
      setShowEmailSection(false);
      setSuccessMessage('Bekræftelses email sendt til ' + newEmail + '. Tjek din indbakke og bekræft din nye email.');

      setTimeout(() => setSuccessMessage(''), 10000);

    } catch (err: any) {
      console.error('[Profile] Error changing email:', err);
      setEmailError(err.message || 'Kunne ikke ændre email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
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

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setPasswordError('Ikke logget ind');
        return;
      }

      // Supabase requires re-authentication by signing in with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError('Forkert nuværende adgangskode');
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      setSuccessMessage('Adgangskode ændret!');
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err: any) {
      console.error('[Profile] Error changing password:', err);
      setPasswordError(err.message || 'Kunne ikke ændre adgangskode');
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

          {/* Gusmester Profile (only for employees) */}
          {isEmployee && employeeProfile && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Star className="h-6 w-6 text-amber-600 mr-2" />
                  <h2 className="text-xl font-semibold text-[#502B30]">
                    Gusmester Profil
                  </h2>
                </div>
                {!isEditingEmployee ? (
                  <button
                    onClick={() => setIsEditingEmployee(true)}
                    className="px-4 py-2 text-sm font-medium text-[#502B30] hover:bg-[#502B30]/10 rounded-sm transition-colors border border-[#502B30]/20"
                  >
                    Rediger
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setIsEditingEmployee(false);
                        setEmployeeFormData({
                          title: employeeProfile.title || '',
                          bio: employeeProfile.publicProfile?.bio || '',
                          photoUrl: employeeProfile.publicProfile?.photoUrl || '',
                          experience: employeeProfile.publicProfile?.experience || '',
                          specializations: employeeProfile.publicProfile?.specializations || [],
                          qualifications: employeeProfile.publicProfile?.qualifications || [],
                          showInBooking: employeeProfile.publicProfile?.showInBooking !== false,
                        });
                      }}
                      disabled={isSavingEmployee}
                      className="px-4 py-2 text-sm font-medium text-[#4a2329]/80 hover:bg-[#502B30]/10 rounded-sm transition-colors disabled:opacity-50 border border-[#502B30]/20"
                    >
                      Annuller
                    </button>
                    <button
                      onClick={handleSaveEmployeeProfile}
                      disabled={isSavingEmployee}
                      className="flex items-center px-4 py-2 text-sm font-medium text-amber-100 bg-[#502B30] hover:bg-[#5e3023] rounded-sm transition-colors disabled:opacity-50 shadow-md"
                    >
                      {isSavingEmployee ? (
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
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Titel
                  </label>
                  {isEditingEmployee ? (
                    <input
                      type="text"
                      value={employeeFormData.title}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, title: e.target.value })}
                      placeholder="F.eks. Certificeret Gusmester"
                      className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-[#502B30]">{employeeProfile.title || 'Ikke angivet'}</p>
                  )}
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Erfaring
                  </label>
                  {isEditingEmployee ? (
                    <input
                      type="text"
                      value={employeeFormData.experience}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, experience: e.target.value })}
                      placeholder="F.eks. 5+ års erfaring"
                      className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-[#502B30]">{employeeProfile.publicProfile?.experience || 'Ikke angivet'}</p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Om mig
                  </label>
                  {isEditingEmployee ? (
                    <textarea
                      value={employeeFormData.bio}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, bio: e.target.value })}
                      rows={4}
                      placeholder="Fortæl lidt om dig selv..."
                      className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-[#502B30] whitespace-pre-wrap">{employeeProfile.publicProfile?.bio || 'Ikke angivet'}</p>
                  )}
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Profil Foto
                  </label>
                  {isEditingEmployee ? (
                    <div>
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
                                setEmployeeFormData({ ...employeeFormData, photoUrl: '' });
                              }
                            }}
                            className="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-sm file:border-0
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
                        <div className="flex-1 border-t border-[#502B30]/20"></div>
                        <span className="px-3 text-sm text-[#502B30]/60">eller</span>
                        <div className="flex-1 border-t border-[#502B30]/20"></div>
                      </div>

                      {/* URL Input */}
                      <input
                        type="url"
                        value={employeeFormData.photoUrl}
                        onChange={(e) => {
                          setEmployeeFormData({ ...employeeFormData, photoUrl: e.target.value });
                          setSelectedImageFile(null);
                        }}
                        placeholder="https://..."
                        className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                        disabled={!!selectedImageFile}
                      />
                      <p className="text-xs text-[#502B30]/60 mt-1">
                        Upload et billede eller indsæt en URL
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#502B30]">{employeeProfile.publicProfile?.photoUrl || 'Ikke angivet'}</p>
                  )}
                </div>

                {/* Specializations */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Specialer
                  </label>
                  {isEditingEmployee ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {employeeFormData.specializations.map((spec, idx) => (
                          <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium flex items-center">
                            {spec}
                            <button
                              type="button"
                              onClick={() => {
                                const newSpecs = [...employeeFormData.specializations];
                                newSpecs.splice(idx, 1);
                                setEmployeeFormData({ ...employeeFormData, specializations: newSpecs });
                              }}
                              className="ml-2 text-amber-700 hover:text-amber-900"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSpecialization}
                          onChange={(e) => setNewSpecialization(e.target.value)}
                          placeholder="Tilføj speciale"
                          className="flex-1 px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newSpecialization.trim()) {
                              e.preventDefault();
                              setEmployeeFormData({
                                ...employeeFormData,
                                specializations: [...employeeFormData.specializations, newSpecialization.trim()]
                              });
                              setNewSpecialization('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSpecialization.trim()) {
                              setEmployeeFormData({
                                ...employeeFormData,
                                specializations: [...employeeFormData.specializations, newSpecialization.trim()]
                              });
                              setNewSpecialization('');
                            }
                          }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {employeeProfile.publicProfile?.specializations && employeeProfile.publicProfile.specializations.length > 0 ? (
                        employeeProfile.publicProfile.specializations.map((spec: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                            {spec}
                          </span>
                        ))
                      ) : (
                        <p className="text-[#502B30]/60 italic">Ingen specialer angivet</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Qualifications */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Kvalifikationer
                  </label>
                  {isEditingEmployee ? (
                    <div className="space-y-2">
                      <div className="space-y-1 mb-2">
                        {employeeFormData.qualifications.map((qual, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            <span className="text-sm text-[#502B30] flex-1">{qual}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newQuals = [...employeeFormData.qualifications];
                                newQuals.splice(idx, 1);
                                setEmployeeFormData({ ...employeeFormData, qualifications: newQuals });
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newQualification}
                          onChange={(e) => setNewQualification(e.target.value)}
                          placeholder="Tilføj kvalifikation"
                          className="flex-1 px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newQualification.trim()) {
                              e.preventDefault();
                              setEmployeeFormData({
                                ...employeeFormData,
                                qualifications: [...employeeFormData.qualifications, newQualification.trim()]
                              });
                              setNewQualification('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newQualification.trim()) {
                              setEmployeeFormData({
                                ...employeeFormData,
                                qualifications: [...employeeFormData.qualifications, newQualification.trim()]
                              });
                              setNewQualification('');
                            }
                          }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {employeeProfile.publicProfile?.qualifications && employeeProfile.publicProfile.qualifications.length > 0 ? (
                        employeeProfile.publicProfile.qualifications.map((qual: string, idx: number) => (
                          <div key={idx} className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 mr-2"></span>
                            <span className="text-sm text-[#502B30]">{qual}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#502B30]/60 italic">Ingen kvalifikationer angivet</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Show in Booking */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={employeeFormData.showInBooking}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, showInBooking: e.target.checked })}
                      disabled={!isEditingEmployee}
                      className="mr-2 text-[#502B30] focus:ring-[#502B30]"
                    />
                    <span className="text-sm text-[#502B30]">Vis min profil når kunder booker mine sessioner</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Change Email */}
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#502B30]">
                  Email Adresse
                </h2>
                <p className="text-sm text-[#4a2329]/70 mt-1">
                  Skift din email adresse og login
                </p>
              </div>
              {!showEmailSection && (
                <button
                  onClick={() => setShowEmailSection(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-[#502B30] hover:bg-[#502B30]/10 rounded-sm transition-colors border border-[#502B30]/20"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Skift Email
                </button>
              )}
            </div>

            {showEmailSection && (
              <div className="space-y-4">
                {/* Email Error */}
                {emailError && (
                  <div className="bg-red-50 border border-red-200 rounded-sm p-3">
                    <p className="text-sm text-red-800">{emailError}</p>
                  </div>
                )}

                {/* New Email */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Ny Email Adresse
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ny@email.dk"
                    className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                  />
                </div>

                {/* Confirm New Email */}
                <div>
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Bekræft Ny Email
                  </label>
                  <input
                    type="email"
                    value={confirmNewEmail}
                    onChange={(e) => setConfirmNewEmail(e.target.value)}
                    placeholder="ny@email.dk"
                    className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm bg-white text-[#502B30] focus:ring-2 focus:ring-[#502B30]/30 focus:border-transparent"
                  />
                </div>

                {/* Info Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-sm p-3">
                  <p className="text-sm text-blue-800">
                    Du vil modtage en bekræftelses email på din nye adresse. Klik på linket i emailen for at bekræfte ændringen.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowEmailSection(false);
                      setNewEmail('');
                      setConfirmNewEmail('');
                      setEmailError('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-[#4a2329]/80 hover:bg-[#502B30]/10 rounded-sm transition-colors disabled:opacity-50 border border-[#502B30]/20"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={handleChangeEmail}
                    disabled={isChangingEmail}
                    className="flex items-center px-4 py-2 text-sm font-medium text-amber-100 bg-[#502B30] hover:bg-[#5e3023] rounded-sm transition-colors disabled:opacity-50 shadow-md"
                  >
                    {isChangingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-100 border-t-transparent mr-2" />
                        Skifter...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Skift Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
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

