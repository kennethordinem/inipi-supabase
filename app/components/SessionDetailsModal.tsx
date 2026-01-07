'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, DollarSign, User as UserIcon, ChevronRight, Lock } from 'lucide-react';
import { ModernModal } from './ModernModal';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { ThemeDetailsModal } from './ThemeDetailsModal';
import { MembersBookingFlow } from './MembersBookingFlow';
import { members } from '@/lib/supabase-sdk';
import type { Session } from '@/lib/supabase-sdk';

interface SessionDetailsModalProps {
  session: Session;
  onClose: () => void;
}

interface Employee {
  id: string;
  name: string;
  title?: string;
  publicProfile?: {
    bio?: string;
    photoUrl?: string;
    specializations?: string[];
    qualifications?: string[];
    experience?: string;
    showInBooking?: boolean;
  };
}

interface Theme {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  pricePerSeat?: number;
}

interface GroupType {
  id: string;
  name: string;
  description?: string;
  color: string;
  isPrivate?: boolean;
  minimumSeats?: number;
  themeIds?: string[];
}

interface SessionDetails {
  session: {
    id: string;
    name: string;
    description?: string;
    date: string;
    time: string;
    duration: number;
    capacity: number;
    maxParticipants: number;
    currentParticipants: number;
    availableSpots: number;
    pricePerSpot: number;
    location?: string;
    maxSpotsPerBooking?: number | null;
  };
  employees: Employee[];
  groupType: GroupType | null;
  themes: Theme[];
}

export function SessionDetailsModal({ session, onClose }: SessionDetailsModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [groupType, setGroupType] = useState<GroupType | null>(null);
  const [loadingGroupType, setLoadingGroupType] = useState(true);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [viewingTheme, setViewingTheme] = useState<Theme | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  
  const sessionDate = new Date(session.date);
  const availableSpots = session.availableSpots;
  
  // Check if session has started or is in the past (with 30-minute buffer)
  const [hours, minutes] = session.time.split(':').map(Number);
  const sessionStartTime = new Date(sessionDate);
  sessionStartTime.setHours(hours, minutes, 0, 0);
  // Add 30-minute buffer - booking is allowed until 30 minutes after start time
  const bookingCutoffTime = new Date(sessionStartTime.getTime() + 30 * 60 * 1000);
  const hasStarted = bookingCutoffTime <= new Date();
  
  // Check if this is a private session
  const isPrivateSession = groupType?.isPrivate || false;
  const hasParticipants = session.currentParticipants > 0;
  const isPrivateAndBooked = isPrivateSession && hasParticipants;
  
  console.log('[SessionDetailsModal] isPrivateSession:', isPrivateSession, 'groupType:', groupType?.name, 'isPrivate:', groupType?.isPrivate);
  
  // Set minimum spots based on session minimum_participants
  const minimumSpots = session.minimumParticipants || 1;
  
  // Check if this group type has themes
  const hasThemes = groupType?.themeIds && groupType.themeIds.length > 0;
  
  // Set maximum spots per booking (for non-private sessions)
  // Priority: session.maxSpotsPerBooking > availableSpots
  console.log('[SessionDetailsModal] session.maxSpotsPerBooking:', session.maxSpotsPerBooking);
  console.log('[SessionDetailsModal] availableSpots:', availableSpots);
  const maxSpotsPerBooking = session.maxSpotsPerBooking 
    ? Math.min(session.maxSpotsPerBooking, availableSpots)
    : availableSpots;
  console.log('[SessionDetailsModal] Calculated maxSpotsPerBooking:', maxSpotsPerBooking);
  
  const [selectedSpots, setSelectedSpots] = useState(minimumSpots);
  
  const isFull = isPrivateAndBooked || availableSpots === 0;
  const cannotBook = isFull || hasStarted;
  
  // Calculate end time
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + session.duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  
  // Fetch session details using SDK
  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        const details = await members.getSessionDetails(session.id) as unknown as SessionDetails;
        setEmployees(details.employees);
        setGroupType(details.groupType);
        setThemes(details.themes);
      } catch (error) {
        console.error('Error fetching session details:', error);
      } finally {
        setLoadingEmployees(false);
        setLoadingGroupType(false);
        setLoadingThemes(false);
      }
    };
    
    fetchSessionDetails();
  }, [session.id]);

  // Update selectedSpots when groupType loads
  useEffect(() => {
    if (groupType?.isPrivate && groupType.minimumSeats) {
      setSelectedSpots(groupType.minimumSeats);
    }
  }, [groupType]);

  // Calculate cheapest theme price for display
  const cheapestThemePrice = themes.length > 0 
    ? Math.min(...themes.map(t => t.pricePerSeat || 0))
    : null;
  
  console.log('[SessionDetailsModal] Themes loaded:', themes.length, 'cheapest:', cheapestThemePrice, 'themes:', themes.map(t => `${t.name}: ${t.pricePerSeat} kr`));

  // Log when theme is selected for debugging
  useEffect(() => {
    console.log('[SessionDetailsModal] selectedTheme changed:', selectedTheme?.name, 'Price:', selectedTheme?.pricePerSeat);
  }, [selectedTheme]);

  // Calculate the price per seat based on session type and theme selection
  const pricePerSeat = React.useMemo(() => {
    // For private sessions, ALWAYS use theme price (ignore session.price)
    if (isPrivateSession) {
      const price = selectedTheme?.pricePerSeat || 0;
      console.log('[SessionDetailsModal] Private session - pricePerSeat:', price, 'theme:', selectedTheme?.name);
      return price;
    }
    // For regular sessions, use session price
    const price = session.price || 0;
    console.log('[SessionDetailsModal] Regular session - pricePerSeat:', price);
    return price;
  }, [isPrivateSession, selectedTheme, session.price]);

  // Calculate total price
  const totalPrice = React.useMemo(() => {
    const total = selectedSpots * pricePerSeat;
    console.log('[SessionDetailsModal] Calculating totalPrice:', total, '=', selectedSpots, 'x', pricePerSeat);
    return total;
  }, [selectedSpots, pricePerSeat]);

  const handleBookClick = () => {
    // Validate theme selection if themes are available
    if (themes.length > 0 && !selectedTheme) {
      alert('Vælg venligst et tema for din booking');
      return;
    }

    // Show booking flow
    setShowBookingFlow(true);
  };
  
  const getBookButtonText = () => {
    if (hasStarted) return 'Session er startet';
    if (isPrivateAndBooked) return 'Private booking - Optaget';
    if (isFull) return 'Fuldt booket';
    return 'Book nu';
  };

  const modalFooter = (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 px-4 py-3 border-2 border-[#502B30]/20 text-[#502B30] rounded-sm hover:bg-[#502B30]/10 transition-colors font-medium"
      >
        Annuller
      </button>
      <button
        onClick={handleBookClick}
        disabled={cannotBook}
        className="flex-1 px-4 py-3 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {getBookButtonText()}
      </button>
    </div>
  );
  
  return (
    <>
      <ModernModal
        isOpen={true}
        onClose={onClose}
        title={session.name}
        footer={modalFooter}
        size="large"
      >
        {/* Color bar indicator */}
        <div 
          className="h-1 w-full -mt-4 mb-6 rounded"
          style={{ backgroundColor: session.groupTypeColor }}
        />
        
        <div className="space-y-6">
          {/* Private Session Warning */}
          {isPrivateSession && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">
                  Private Event
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  {hasParticipants 
                    ? 'Denne session er allerede booket af en anden person.'
                    : `Dette er et privat event. Du skal booke minimum ${minimumSpots} ${minimumSpots === 1 ? 'plads' : 'pladser'}.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Session Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-[#502B30]/70 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#502B30]">
                    {sessionDate.toLocaleDateString('da-DK', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-[#502B30]/70 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#502B30]">
                    {session.time} - {endTime}
                  </p>
                  <p className="text-xs text-[#502B30]/60">{session.duration} minutter</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-[#502B30]/70 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#502B30]">
                    {isPrivateAndBooked ? (
                      <span className="text-red-600">Private booking - Optaget</span>
                    ) : isPrivateSession ? (
                      <span className="text-[#502B30]">
                        <Lock className="h-3 w-3 inline mr-1" />
                        Private event tilgængeligt
                      </span>
                    ) : availableSpots > 0 ? (
                      <span className={availableSpots <= 3 ? 'text-orange-600' : 'text-green-600'}>
                        {availableSpots} ledige pladser
                      </span>
                    ) : (
                      <span className="text-red-600">Fuldt booket</span>
                    )}
                  </p>
                  <p className="text-xs text-[#502B30]/60">
                    {isPrivateSession 
                      ? `Kræver min. ${minimumSpots} ${minimumSpots === 1 ? 'plads' : 'pladser'}`
                      : `af ${session.maxParticipants} pladser`
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-[#502B30]/70 mt-0.5" />
                <div>
                  {isPrivateSession && themes.length > 0 ? (
                    <>
                      <p className="text-sm font-medium text-[#502B30]">
                        {selectedTheme 
                          ? `${pricePerSeat} kr` 
                          : cheapestThemePrice 
                            ? `Fra ${cheapestThemePrice} kr` 
                            : 'Vælg tema'}
                      </p>
                      <p className="text-xs text-[#502B30]/60">
                        {selectedTheme ? `pr. plads (${selectedTheme.name})` : 'pr. plads (afhænger af tema)'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[#502B30]">
                        {session.price} kr
                      </p>
                      <p className="text-xs text-[#502B30]/60">pr. plads</p>
                    </>
                  )}
                </div>
              </div>
              
              {session.location && (
                <div className="flex items-start space-x-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-[#502B30]/70 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#502B30]">{session.location}</p>
                  </div>
                </div>
            )}
          </div>
          
          {/* Description */}
          {session.description && (
            <div className="pt-6 border-t border-[#502B30]/20">
              <h3 className="text-sm font-semibold text-[#502B30] mb-3">Beskrivelse</h3>
              <p className="text-sm text-[#4a2329]/80 whitespace-pre-wrap leading-relaxed">
                {session.description}
              </p>
            </div>
          )}
          
          {/* Themes - show instead of employees if themes exist */}
          {themes.length > 0 ? (
            <div className="pt-6 border-t border-[#502B30]/20">
              <h3 className="text-sm font-semibold text-[#502B30] mb-2">
                Vælg tema *
              </h3>
              <p className="text-xs text-[#502B30]/70 mb-4">
                Vælg et tema for din booking
              </p>
              <div className="space-y-3">
                {loadingThemes ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#502B30]"></div>
                  </div>
                ) : (
                  themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setViewingTheme(theme)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-sm border-2 transition-all group ${
                        selectedTheme?.id === theme.id
                          ? 'border-[#502B30] bg-[#502B30]/10'
                          : 'border-[#502B30]/20 hover:border-[#502B30] hover:bg-[#502B30]/5'
                      }`}
                    >
                      <img 
                        src={theme.imageUrl} 
                        alt={theme.name}
                        className="h-16 w-16 rounded-sm object-cover border-2 border-[#502B30]/20 group-hover:border-[#502B30]"
                      />
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-[#502B30] group-hover:text-[#5e3023]">
                            {theme.name}
                            {selectedTheme?.id === theme.id && (
                              <span className="ml-2 text-xs text-amber-100 bg-[#502B30] px-2 py-0.5 rounded-sm">
                                Valgt
                              </span>
                            )}
                          </p>
                          {theme.pricePerSeat && (
                            <span className="text-sm font-bold text-[#502B30]">
                              {theme.pricePerSeat} kr/plads
                            </span>
                          )}
                        </div>
                        {theme.description && (
                          <p className="text-xs text-[#502B30]/70 mt-1 line-clamp-2">
                            {theme.description}
                          </p>
                        )}
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-[#502B30]/60 group-hover:text-[#502B30]" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : employees.length > 0 ? (
            <div className="pt-6 border-t border-[#502B30]/20">
              <h3 className="text-sm font-semibold text-[#502B30] mb-4">
                {employees.length === 1 ? 'Instruktør' : 'Instruktører'}
              </h3>
              <div className="space-y-3">
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#502B30]"></div>
                  </div>
                ) : (
                  employees.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => setSelectedEmployee(employee)}
                      className="w-full flex items-center space-x-3 p-3 rounded-sm border border-[#502B30]/20 hover:border-[#502B30] hover:bg-[#502B30]/5 transition-all group"
                    >
                      {employee.publicProfile?.photoUrl ? (
                        <img 
                          src={employee.publicProfile.photoUrl} 
                          alt={employee.name}
                          className="h-12 w-12 rounded-full object-cover border-2 border-[#502B30]/20 group-hover:border-[#502B30]"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-[#502B30]/10 group-hover:bg-[#502B30]/20 flex items-center justify-center border-2 border-[#502B30]/20 group-hover:border-[#502B30] transition-colors">
                          <UserIcon className="h-6 w-6 text-[#502B30]/60 group-hover:text-[#502B30]" />
                        </div>
                      )}
                      
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[#502B30] group-hover:text-[#5e3023]">
                          {employee.name}
                        </p>
                        {employee.title && (
                          <p className="text-xs text-[#502B30]/70 group-hover:text-[#502B30]">
                            {employee.title}
                          </p>
                        )}
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-[#502B30]/60 group-hover:text-[#502B30]" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
          
          {/* Spot Selection & Booking */}
          {!isFull && (
            <div className="pt-6 border-t border-[#502B30]/20">
              <h3 className="text-sm font-semibold text-[#502B30] mb-4">
                Vælg antal pladser
                {isPrivateSession && (
                  <span className="ml-2 text-xs font-normal text-[#502B30]/70">
                    (Minimum: {minimumSpots} {minimumSpots === 1 ? 'plads' : 'pladser'})
                  </span>
                )}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSpots(Math.max(minimumSpots, selectedSpots - 1))}
                    disabled={selectedSpots <= minimumSpots}
                    className="px-4 py-2 border border-[#502B30]/20 rounded-sm hover:bg-[#502B30]/10 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[#502B30]"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold w-12 text-center text-[#502B30]">
                    {selectedSpots}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSpots(Math.min(maxSpotsPerBooking, selectedSpots + 1))}
                    disabled={selectedSpots >= maxSpotsPerBooking}
                    className="px-4 py-2 border border-[#502B30]/20 rounded-sm hover:bg-[#502B30]/10 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[#502B30]"
                  >
                    +
                  </button>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-[#502B30]/70">Total pris</p>
                  {isPrivateSession && !selectedTheme ? (
                    <p className="text-lg font-bold text-amber-600">
                      Vælg tema først
                    </p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-[#502B30]">
                        {totalPrice} kr
                      </p>
                      {isPrivateSession && selectedSpots === minimumSpots && selectedTheme && (
                        <p className="text-xs text-[#502B30]/70 mt-1">
                          Minimumspris ({minimumSpots} pladser × {pricePerSeat} kr)
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Info text about max spots per booking */}
              {!isPrivateSession && (
                <div className="mt-4">
                  {session.maxSpotsPerBooking && availableSpots > session.maxSpotsPerBooking ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 text-center">
                      Max {session.maxSpotsPerBooking} {session.maxSpotsPerBooking === 1 ? 'plads' : 'pladser'} pr. booking. 
                      Der er {availableSpots} ledige pladser i alt.
                    </p>
                  ) : session.maxSpotsPerBooking ? (
                    <p className="text-xs text-[#502B30]/60 text-center">
                      Max {session.maxSpotsPerBooking} {session.maxSpotsPerBooking === 1 ? 'plads' : 'pladser'} pr. booking
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </ModernModal>
      
      {/* Employee Profile Modal */}
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
      
      {/* Theme Details Modal */}
      {viewingTheme && (
        <ThemeDetailsModal
          theme={viewingTheme}
          isSelected={selectedTheme?.id === viewingTheme.id}
          onClose={() => setViewingTheme(null)}
          onSelect={() => {
            console.log('[SessionDetailsModal] Selecting theme:', viewingTheme.name, viewingTheme);
            setSelectedTheme(viewingTheme);
            setViewingTheme(null);
          }}
        />
      )}
      
      {/* Booking Flow Modal */}
      {showBookingFlow && (
        <ModernModal
          isOpen={true}
          onClose={() => setShowBookingFlow(false)}
          title="Book Session"
          size="large"
        >
          <MembersBookingFlow
            session={session}
            selectedSpots={selectedSpots}
            selectedThemeId={selectedTheme?.id}
            onComplete={(result) => {
              console.log('[SessionDetailsModal] Booking complete:', result);
              setShowBookingFlow(false);
              onClose();
            }}
            onCancel={() => setShowBookingFlow(false)}
          />
        </ModernModal>
      )}
    </>
  );
}
