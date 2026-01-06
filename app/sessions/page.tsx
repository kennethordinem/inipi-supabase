'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { cachedMembers } from '@/lib/cachedMembers';
import type { Session } from '@/lib/supabase-sdk';
import { SessionDetailsModal } from '../components/SessionDetailsModal';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addWeeks, 
  subWeeks,
  isSameDay,
  isToday,
  getWeek,
  parseISO
} from 'date-fns';
import { da } from 'date-fns/locale';

type FilterType = 'all' | 'group_type';

function SessionsPageContent() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1, locale: da });
  });
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedGroupTypeId, setSelectedGroupTypeId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  // Apply filter from URL parameters
  useEffect(() => {
    const groupTypeName = searchParams.get('type');
    if (groupTypeName && sessions.length > 0) {
      console.log('[Filter Debug] Looking for group type:', groupTypeName);
      console.log('[Filter Debug] Available group types:', [...new Set(sessions.map(s => s.groupTypeName))]);
      
      // Find matching group type by name - try exact match first
      let matchingSession = sessions.find(s => 
        s.groupTypeName?.toLowerCase() === groupTypeName.toLowerCase()
      );
      
      // If no exact match, try partial match (contains)
      if (!matchingSession) {
        matchingSession = sessions.find(s => 
          s.groupTypeName?.toLowerCase().includes(groupTypeName.toLowerCase()) ||
          groupTypeName.toLowerCase().includes(s.groupTypeName?.toLowerCase() || '')
        );
      }
      
      if (matchingSession && matchingSession.groupTypeId) {
        console.log('[Filter Debug] Found match:', matchingSession.groupTypeName, 'ID:', matchingSession.groupTypeId);
        setFilter('group_type');
        setSelectedGroupTypeId(matchingSession.groupTypeId);
      } else {
        console.log('[Filter Debug] No match found for:', groupTypeName);
      }
    }
  }, [searchParams, sessions]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { sessions: data } = await cachedMembers.getClasses();
      setSessions(data);
    } catch (err: any) {
      console.error('[Sessions] Error loading sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate days for current week
  const weekDays = useMemo(() => {
    const start = currentWeekStart;
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1, locale: da });
    return eachDayOfInterval({ start, end });
  }, [currentWeekStart]);

  // Get unique group types from all sessions
  const availableGroupTypes = useMemo(() => {
    const groupTypeMap = new Map<string, { id: string; name: string; color: string }>();
    sessions.forEach(session => {
      if (session.groupTypeId && session.groupTypeName) {
        if (!groupTypeMap.has(session.groupTypeId)) {
          groupTypeMap.set(session.groupTypeId, {
            id: session.groupTypeId,
            name: session.groupTypeName,
            color: session.groupTypeColor || '#6366f1'
          });
        }
      }
    });
    return Array.from(groupTypeMap.values());
  }, [sessions]);

  // Filter sessions based on selected filter
  const filteredSessions = useMemo(() => {
    if (filter === 'all') {
      return sessions;
    } else if (filter === 'group_type' && selectedGroupTypeId) {
      return sessions.filter(session => session.groupTypeId === selectedGroupTypeId);
    }
    return sessions;
  }, [sessions, filter, selectedGroupTypeId]);

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, Session[]>();
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped.set(dayKey, []);
    });
    
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    filteredSessions.forEach(session => {
      const sessionDate = parseISO(session.date);
      const dayKey = format(sessionDate, 'yyyy-MM-dd');
      
      // Show all sessions for today and future days (compare dates only, not times)
      if (dayKey >= today && grouped.has(dayKey)) {
        grouped.get(dayKey)!.push(session);
      }
    });
    
    // Sort sessions by time
    grouped.forEach((daySessions) => {
      daySessions.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return grouped;
  }, [filteredSessions, weekDays]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };
  
  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };
  
  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1, locale: da }));
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1, locale: da });
  const currentMonthYear = format(currentWeekStart, 'MMMM yyyy', { locale: da });

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser saunagus...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-sm p-6 max-w-md shadow-lg">
            <h2 className="text-red-800 font-semibold mb-2">Fejl</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={loadSessions}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-sm hover:bg-red-700 transition-colors"
            >
              Prøv igen
            </button>
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
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#502B30] tracking-wide">
            Saunagus
          </h1>
          <p className="mt-3 text-lg text-[#4a2329]/80">
            Tilmeld dig kommende saunagus
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-4">
            <div className="flex flex-wrap gap-3">
              {/* All filter */}
              <button
                onClick={() => {
                  setFilter('all');
                  setSelectedGroupTypeId(null);
                }}
                className={`px-6 py-2 rounded-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-[#502B30] text-amber-100 shadow-md'
                    : 'bg-white text-[#502B30] border border-[#502B30]/20 hover:bg-[#502B30]/10'
                }`}
              >
                Alle
              </button>

              {/* Individual group type filters */}
              {availableGroupTypes.map(groupType => (
                <button
                  key={groupType.id}
                  onClick={() => {
                    setFilter('group_type');
                    setSelectedGroupTypeId(groupType.id);
                  }}
                  className={`px-6 py-2 rounded-sm font-medium transition-all shadow-sm ${
                    filter === 'group_type' && selectedGroupTypeId === groupType.id
                      ? 'text-white'
                      : 'bg-white hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: filter === 'group_type' && selectedGroupTypeId === groupType.id ? groupType.color : 'white',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: groupType.color,
                    color: filter === 'group_type' && selectedGroupTypeId === groupType.id ? 'white' : groupType.color
                  }}
                >
                  {groupType.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Calendar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 border border-[#502B30]/10">
          {/* Week Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <svg className="h-5 w-5 text-[#502B30]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-[#502B30] capitalize">
                  {currentMonthYear}
                </h2>
                <p className="text-sm text-[#502B30]/60">
                  Uge {weekNumber}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-sm border border-[#502B30]/20 hover:bg-[#502B30]/10 transition-colors"
                title="Forrige uge"
              >
                <svg className="h-5 w-5 text-[#502B30]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={goToToday}
                className="px-3 py-2 rounded-sm border border-[#502B30]/20 hover:bg-[#502B30]/10 transition-colors text-sm font-medium text-[#502B30]"
              >
                I dag
              </button>
              
              <button
                onClick={goToNextWeek}
                className="p-2 rounded-sm border border-[#502B30]/20 hover:bg-[#502B30]/10 transition-colors"
                title="Næste uge"
              >
                <svg className="h-5 w-5 text-[#502B30]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop: 7-column grid */}
          <div className="hidden lg:grid lg:grid-cols-7 gap-3 xl:gap-4">
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDay.get(dayKey) || [];
              const isCurrentDay = isToday(day);
              
              return (
                <div key={dayKey} className="min-h-[200px]">
                  <div className={`text-center mb-3 pb-3 border-b-2 ${
                    isCurrentDay ? 'border-[#502B30]' : 'border-[#502B30]/20'
                  }`}>
                    <div className={`text-xs uppercase font-semibold ${
                      isCurrentDay ? 'text-[#502B30]' : 'text-[#502B30]/60'
                    }`}>
                      {format(day, 'EEEE', { locale: da })}
                    </div>
                    <div className={`text-lg font-bold mt-1 ${
                      isCurrentDay ? 'text-[#502B30]' : 'text-[#4a2329]'
                    }`}>
                      {format(day, 'd MMM', { locale: da })}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {daySessions.length > 0 ? (
                      daySessions.map(session => <SessionCard key={session.id} session={session} onClick={() => handleSessionClick(session)} />)
                    ) : (
                      <div className="text-center py-8 text-sm text-[#502B30]/40">
                        Ingen saunagus
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: Vertical stack */}
          <div className="lg:hidden space-y-6">
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDay.get(dayKey) || [];
              const isCurrentDay = isToday(day);
              
              if (daySessions.length === 0) return null;
              
              return (
                <div key={dayKey} className="bg-white/80 backdrop-blur-sm rounded-sm border border-[#502B30]/20 overflow-hidden shadow">
                  <div className={`p-4 ${
                    isCurrentDay ? 'bg-[#502B30]/10 border-b-2 border-[#502B30]' : 'bg-[#faf8f5] border-b border-[#502B30]/20'
                  }`}>
                    <div className={`text-sm uppercase font-semibold ${
                      isCurrentDay ? 'text-[#502B30]' : 'text-[#502B30]/60'
                    }`}>
                      {format(day, 'EEEE', { locale: da })}
                    </div>
                    <div className={`text-xl font-bold mt-1 ${
                      isCurrentDay ? 'text-[#502B30]' : 'text-[#4a2329]'
                    }`}>
                      {format(day, 'd MMMM', { locale: da })}
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {daySessions.map(session => <SessionCard key={session.id} session={session} onClick={() => handleSessionClick(session)} />)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredSessions.length === 0 && (
            <div className="text-center py-16">
              <svg className="h-16 w-16 text-[#502B30]/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-[#502B30] mb-2">
                {filter === 'group_type'
                  ? 'Ingen saunagus af denne type tilgængelige'
                  : 'Ingen saunagus tilgængelige'}
              </h3>
              <p className="text-sm text-[#502B30]/60">
                {filter === 'group_type'
                  ? 'Der er ingen planlagte saunagus af den valgte type i denne periode'
                  : 'Der er ingen planlagte saunagus i denne periode'}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => {
                    setFilter('all');
                    setSelectedGroupTypeId(null);
                  }}
                  className="mt-4 text-[#502B30] hover:text-[#5e3023] font-medium text-sm"
                >
                  Vis alle saunagus →
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
      </div>
      <Footer />
    </>
  );
}

function SessionCard({ session, onClick }: { session: Session; onClick: () => void }) {
  const [hours, minutes] = session.time.split(':').map(Number);
  const endMinutes = hours * 60 + minutes + session.duration;
  const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
  
  // Check if session has started (with 30-minute buffer)
  const sessionDate = new Date(session.date);
  const sessionStartTime = new Date(sessionDate);
  sessionStartTime.setHours(hours, minutes, 0, 0);
  // Add 30-minute buffer - booking is allowed until 30 minutes after start time
  const bookingCutoffTime = new Date(sessionStartTime.getTime() + 30 * 60 * 1000);
  const hasStarted = bookingCutoffTime <= new Date();
  
  const isFull = session.maxParticipants > 0 && session.availableSpots === 0;
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left border rounded-sm overflow-hidden transition-all hover:shadow-lg hover:border-[#502B30] border-[#502B30]/20 bg-white/80 backdrop-blur-sm"
    >
      <div className="h-1" style={{ backgroundColor: session.groupTypeColor }} />
      
      <div className="p-3 space-y-2">
        <div className="flex items-center text-sm font-semibold text-[#502B30]">
          <svg className="h-3 w-3 mr-1.5 text-[#502B30]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {session.time} - {endTime}
        </div>
        
        <div className="font-bold text-[#4a2329] uppercase text-sm leading-tight">
          {session.name}
        </div>
        
        {/* Location */}
        {session.location && (
          <div className="flex items-start text-xs text-[#502B30]/70">
            <svg className="h-3 w-3 mr-1 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-2">{session.location}</span>
          </div>
        )}
        
        {/* Instructors */}
        {session.employeeNames && session.employeeNames.length > 0 && (
          <div className="flex items-start text-xs text-[#502B30]/70">
            <svg className="h-3 w-3 mr-1 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="line-clamp-2">{session.employeeNames.join(', ')}</span>
          </div>
        )}
        
        <div className="pt-2 border-t border-[#502B30]/10">
          {hasStarted ? (
            <div className="text-xs font-semibold text-gray-600">
              <svg className="h-3 w-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Session er startet
            </div>
          ) : isFull ? (
            <div className="text-xs font-semibold text-orange-600">
              Fuldt booket
            </div>
          ) : session.availableSpots <= 3 ? (
            <div className="text-xs font-semibold text-orange-600">
              <svg className="h-3 w-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {session.availableSpots} ledige pladser
            </div>
          ) : (
            <div className="text-xs font-semibold text-green-600">
              <svg className="h-3 w-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {session.currentParticipants}/{session.maxParticipants}
            </div>
          )}
        </div>
        
        <div className="pt-2">
          <div className="text-sm font-bold text-[#502B30]">
            {session.isPrivate ? (
              <>
                {(session.price || 0) * (session.minimumParticipants || 1)} kr
                <span className="text-xs font-normal text-[#502B30]/60 ml-1">
                  (min. {session.minimumParticipants} pladser)
                </span>
              </>
            ) : (
              <>
                {session.price} kr
                <span className="text-xs font-normal text-[#502B30]/60 ml-1">pr. plads</span>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-[#502B30]/10">
          <p className="text-xs text-[#502B30]/60 text-center">
            Klik for detaljer →
          </p>
        </div>
      </div>
    </button>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={
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
    }>
      <SessionsPageContent />
    </Suspense>
  );
}

