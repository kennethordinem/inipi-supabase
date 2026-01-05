'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Loader2, AlertCircle, Calendar, Ticket, Users, UserPlus, Settings, CreditCard, Palette
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            } else {
              setHasAccess(false);
              setIsCheckingAuth(false);
              setError('Du har ikke adgang til administration.');
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

  const adminSections = [
    {
      title: 'Medlemmer',
      description: 'Administrer medlemmer, bookinger og profiler',
      icon: Users,
      href: '/administration',
      color: 'bg-blue-500',
    },
    {
      title: 'Sessioner',
      description: 'Opret, rediger og slet sauna sessioner',
      icon: Calendar,
      href: '/admin-sessions',
      color: 'bg-green-500',
    },
    {
      title: 'Klippekort',
      description: 'Administrer klippekort og se oversigt',
      icon: Ticket,
      href: '/admin-punch-cards',
      color: 'bg-amber-500',
    },
    {
      title: 'Temaer',
      description: 'Administrer session temaer',
      icon: Palette,
      href: '/admin-themes',
      color: 'bg-pink-500',
    },
    {
      title: 'Brugere & Medarbejdere',
      description: 'Administrer brugere og medarbejdere',
      icon: Users,
      href: '/admin-users',
      color: 'bg-purple-500',
    },
    {
      title: 'Stripe Integration',
      description: 'Konfigurer Stripe betalinger',
      icon: CreditCard,
      href: '/admin-stripe',
      color: 'bg-blue-500',
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
            <p className="text-gray-600 mt-1">Administrer alle aspekter af INIPI systemet</p>
          </div>

          {/* Admin Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`${section.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 group-hover:text-[#502B30] transition-colors">
                          {section.title}
                        </h2>
                        <p className="text-gray-600 mt-1 text-sm">
                          {section.description}
                        </p>
                      </div>
                      <div className="text-gray-400 group-hover:text-[#502B30] group-hover:translate-x-1 transition-all">
                        →
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent group-hover:via-[#502B30] transition-colors"></div>
                </Link>
              );
            })}
          </div>

          {/* Quick Stats (Optional - can add later) */}
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Hurtig Adgang
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Aktive Medlemmer</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Kommende Sessioner</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Aktive Klippekort</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

