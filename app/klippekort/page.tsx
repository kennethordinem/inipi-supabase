'use client';

import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { members } from '@/lib/clinio';
import { cachedMembers } from '@/lib/cachedMembers';
import type { PunchCardWithHistory, AuthState } from '@/lib/members-sdk/dist/types';
import { Ticket, Calendar, Clock, MapPin, Loader2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

type FilterType = 'all' | 'active' | 'used';

export default function KlippekortPage() {
  const [punchCards, setPunchCards] = useState<PunchCardWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = members.onAuthStateChanged((authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          // Not logged in, redirect to login
          window.location.href = '/login';
        } else {
          // Logged in, load data
          loadPunchCards();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadPunchCards = async () => {
    try {
      setLoading(true);
      const result = await cachedMembers.getPunchCardHistory();
      setPunchCards(result.punchCards);
    } catch (err: any) {
      console.error('[Klippekort] Error loading punch cards:', err);
      setError('Kunne ikke indlæse klippekort');
    } finally {
      setLoading(false);
    }
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  // Filter punch cards
  const filteredCards = punchCards.filter(card => {
    if (filter === 'all') return true;
    if (filter === 'active') return card.status === 'active' && card.remainingPunches > 0;
    if (filter === 'used') return card.status === 'used' || card.remainingPunches === 0;
    return true;
  });

  // Separate active and used cards
  const activeCards = filteredCards.filter(card => card.status === 'active' && card.remainingPunches > 0);
  const usedCards = filteredCards.filter(card => card.status === 'used' || card.remainingPunches === 0);

  // Sort: active first (by purchase date desc), then used (by purchase date desc)
  const sortedCards = filter === 'all' 
    ? [...activeCards.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()),
       ...usedCards.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())]
    : filteredCards.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser klippekort...</p>
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
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 text-center max-w-md border border-[#502B30]/10">
            <h3 className="text-lg font-medium text-[#502B30] mb-2">
              Der opstod en fejl
            </h3>
            <p className="text-[#4a2329]/80 mb-4">{error}</p>
            <button
              onClick={loadPunchCards}
              className="bg-[#502B30] hover:bg-[#5e3023] text-amber-100 px-6 py-2 rounded-sm font-medium transition-colors"
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide">
              Mine Klippekort
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Oversigt over alle dine klippekort og forbrug
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-4">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-[#502B30]/60" />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-6 py-2 rounded-sm font-medium transition-all ${
                      filter === 'all'
                        ? 'bg-[#502B30] text-amber-100 shadow-md'
                        : 'bg-white text-[#502B30] border border-[#502B30]/20 hover:bg-[#502B30]/10'
                    }`}
                  >
                    Alle ({punchCards.length})
                  </button>
                  <button
                    onClick={() => setFilter('active')}
                    className={`px-6 py-2 rounded-sm font-medium transition-all ${
                      filter === 'active'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-white text-green-600 border border-green-600/20 hover:bg-green-50'
                    }`}
                  >
                    Aktive ({activeCards.length})
                  </button>
                  <button
                    onClick={() => setFilter('used')}
                    className={`px-6 py-2 rounded-sm font-medium transition-all ${
                      filter === 'used'
                        ? 'bg-gray-600 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-600/20 hover:bg-gray-50'
                    }`}
                  >
                    Brugte ({usedCards.length})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Punch Cards List */}
          {sortedCards.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 text-center border border-[#502B30]/10">
              <Ticket className="h-12 w-12 text-[#502B30]/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#502B30] mb-2">
                Ingen klippekort fundet
              </h3>
              <p className="text-[#4a2329]/80">
                {filter === 'all' && 'Du har ingen klippekort endnu.'}
                {filter === 'active' && 'Du har ingen aktive klippekort.'}
                {filter === 'used' && 'Du har ingen brugte klippekort.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCards.map((card) => {
                const isExpanded = expandedCards.has(card.id);
                const isActive = card.status === 'active' && card.remainingPunches > 0;
                const hasUsageHistory = card.usageHistory && card.usageHistory.length > 0;

                return (
                  <div
                    key={card.id}
                    className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/20 overflow-hidden hover:shadow-xl transition-all"
                  >
                    {/* Card Header */}
                    <div className={`p-6 ${isActive ? 'bg-gradient-to-r from-green-50 to-green-100/50' : 'bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-sm ${isActive ? 'bg-green-100' : 'bg-gray-200'}`}>
                            <Ticket className={`h-6 w-6 ${isActive ? 'text-green-700' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-[#502B30] mb-1">
                              {card.name}
                            </h3>
                            <p className="text-sm text-[#4a2329]/70">
                              Købt: {format(parseISO(card.purchaseDate), 'd. MMMM yyyy', { locale: da })}
                            </p>
                            <p className="text-sm text-[#4a2329]/70">
                              Pris: {card.price.toFixed(2)} kr.
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-sm text-sm font-medium ${
                            isActive 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-gray-200 text-gray-700 border border-gray-300'
                          }`}>
                            {isActive ? 'Aktiv' : 'Brugt'}
                          </span>
                        </div>
                      </div>

                      {/* Punch Stats */}
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="bg-white/50 rounded-sm p-3 border border-[#502B30]/10">
                          <p className="text-xs text-[#502B30]/70 mb-1">Total klip</p>
                          <p className="text-2xl font-bold text-[#502B30]">{card.totalPunches}</p>
                        </div>
                        <div className="bg-white/50 rounded-sm p-3 border border-[#502B30]/10">
                          <p className="text-xs text-[#502B30]/70 mb-1">Brugt</p>
                          <p className="text-2xl font-bold text-orange-600">{card.totalPunches - card.remainingPunches}</p>
                        </div>
                        <div className="bg-white/50 rounded-sm p-3 border border-[#502B30]/10">
                          <p className="text-xs text-[#502B30]/70 mb-1">Tilbage</p>
                          <p className={`text-2xl font-bold ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                            {card.remainingPunches}
                          </p>
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      {hasUsageHistory && (
                        <button
                          onClick={() => toggleCardExpansion(card.id)}
                          className="mt-4 w-full flex items-center justify-center space-x-2 text-[#502B30] hover:text-[#5e3023] transition-colors py-2 border-t border-[#502B30]/10"
                        >
                          <span className="text-sm font-medium">
                            {isExpanded ? 'Skjul forbrugshistorik' : 'Vis forbrugshistorik'}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </div>

                    {/* Usage History (Expandable) */}
                    {isExpanded && hasUsageHistory && (
                      <div className="p-6 bg-[#faf8f5] border-t border-[#502B30]/10">
                        <h4 className="text-lg font-semibold text-[#502B30] mb-4">
                          Forbrugshistorik
                        </h4>
                        <div className="space-y-3">
                          {card.usageHistory.map((log) => {
                            if (log.type === 'usage') {
                              // Session usage entry
                              return (
                                <div
                                  key={log.id}
                                  className="bg-white rounded-sm p-4 border border-[#502B30]/10 hover:border-[#502B30]/30 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-[#502B30] mb-2">
                                        {log.sessionName}
                                      </h5>
                                      <div className="space-y-1 text-sm text-[#4a2329]/70">
                                        <div className="flex items-center">
                                          <Calendar className="h-3 w-3 mr-2" />
                                          {format(parseISO(log.sessionDate), 'd. MMMM yyyy', { locale: da })}
                                        </div>
                                        <div className="flex items-center">
                                          <Clock className="h-3 w-3 mr-2" />
                                          {log.sessionTime}
                                        </div>
                                        <div className="flex items-center">
                                          <Ticket className="h-3 w-3 mr-2" />
                                          Brugt: {log.spotsUsed} klip
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-xs text-[#502B30]/70 mb-1">Tilbage efter</p>
                                      <p className="text-lg font-bold text-[#502B30]">
                                        {log.remainingPunchesAfter}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              // Manual adjustment entry
                              const isAddition = log.adjustmentType === 'add';
                              return (
                                <div
                                  key={log.id}
                                  className={`rounded-sm p-4 border ${
                                    isAddition
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-orange-50 border-orange-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-[#502B30] mb-2">
                                        {isAddition ? '✓ Klip tilføjet' : '− Klip trukket'}
                                      </h5>
                                      <div className="space-y-1 text-sm text-[#4a2329]/70">
                                        <div className="flex items-center">
                                          <Calendar className="h-3 w-3 mr-2" />
                                          {format(parseISO(log.adjustedAt), 'd. MMMM yyyy HH:mm', { locale: da })}
                                        </div>
                                        <div className="flex items-center">
                                          <Ticket className="h-3 w-3 mr-2" />
                                          {isAddition ? 'Tilføjet' : 'Trukket'}: {log.amount} klip
                                        </div>
                                        {log.adjustedTypeName && (
                                          <div className="flex items-center text-xs">
                                            Type: {log.adjustedTypeName}
                                          </div>
                                        )}
                                        <div className="mt-2 text-xs italic bg-white p-2 rounded border border-[#502B30]/10">
                                          <strong>Begrundelse:</strong> {log.reason}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-xs text-[#502B30]/70 mb-1">Tilbage efter</p>
                                      <p className="text-lg font-bold text-[#502B30]">
                                        {log.newRemaining}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    )}

                    {/* No Usage History Message */}
                    {isExpanded && !hasUsageHistory && (
                      <div className="p-6 bg-[#faf8f5] border-t border-[#502B30]/10 text-center">
                        <p className="text-sm text-[#4a2329]/70">
                          Dette klippekort er ikke brugt endnu
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}

