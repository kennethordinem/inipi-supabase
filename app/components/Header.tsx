'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Calendar, User, ChevronDown, LogOut, Menu, X, Home, Mail, Info, ShoppingBag, Receipt, Star, Ticket, Users } from 'lucide-react';
import { members } from '@/lib/supabase-sdk';
import { cachedMembers } from '@/lib/cachedMembers';
import type { AuthState } from '@/lib/supabase-sdk';

export function Header() {
  const pathname = usePathname();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showGusTiderDropdown, setShowGusTiderDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [isEmployee, setIsEmployee] = useState(false);
  const [frontendPermissions, setFrontendPermissions] = useState({
    gusmester: false,
    staff: false,
    administration: false
  });

  // Close all dropdowns when route changes
  useEffect(() => {
    setShowProfileDropdown(false);
    setShowGusTiderDropdown(false);
    setShowMobileMenu(false);
  }, [pathname]);

  // Check authentication status and listen for changes
  useEffect(() => {
    // Initial check from localStorage (for UI only)
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');
    setIsAuthenticated(!!userId);
    setUserName(name || '');

    // Listen for auth state changes from the SDK
    const unsubscribe = members.onAuthStateChanged(async (authState: AuthState) => {
      setIsAuthenticated(authState.isAuthenticated);
      if (authState.isAuthenticated && authState.user) {
        const name = localStorage.getItem('userName') || authState.user.email?.split('@')[0] || 'Bruger';
        setUserName(name);

        // Only check employee status when SDK confirms authentication (CACHED)
        try {
          const employeeCheck = await cachedMembers.checkIfEmployee();
          setIsEmployee(employeeCheck.isEmployee);
          if (employeeCheck.isEmployee) {
            console.log('[Header] User is employee:', employeeCheck.employeeName);
            // Set frontend permissions
            if (employeeCheck.frontendPermissions) {
              setFrontendPermissions(employeeCheck.frontendPermissions);
              console.log('[Header] Frontend permissions:', employeeCheck.frontendPermissions);
            }
          }
        } catch (err) {
          console.error('[Header] Error checking employee status:', err);
          setIsEmployee(false);
          setFrontendPermissions({ gusmester: false, staff: false, administration: false });
        }
      } else {
        setUserName('');
        setIsEmployee(false);
        setFrontendPermissions({ gusmester: false, staff: false, administration: false });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await members.logout();
      localStorage.clear();
      setIsAuthenticated(false);
      setUserName('');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if logout fails
      localStorage.clear();
      setIsAuthenticated(false);
      setUserName('');
      window.location.href = '/';
    }
  };

  const isActivePath = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const navigationBefore = [
    { name: 'Hjem', href: '/', icon: Home },
  ];

  const navigationAfter = [
    { name: 'Shop/Klippekort', href: '/shop', icon: ShoppingBag },
    { name: 'Om Os', href: '/about', icon: Info },
    { name: 'Kontakt', href: '/contact', icon: Mail },
  ];

  const gusTiderDropdownItems = [
    { name: 'Alle Gus Tider', href: '/sessions' },
    { name: 'Fyraftensgus', href: '/sessions?type=Fyraftensgus' },
    { name: 'Privat Event', href: '/sessions?type=Privat/Firma Gus' },
  ];

  // Build profile dropdown with conditional employee items
  const profileDropdownBase: Array<{ name: string; href: string; icon: any; isSeparated?: boolean }> = [
    { name: 'Min Profil', href: '/profile', icon: User },
    { name: 'Mine Hold', href: '/mine-hold', icon: Calendar },
    { name: 'Klippekort', href: '/klippekort', icon: Ticket },
    { name: 'Mine Kvitteringer', href: '/invoices', icon: Receipt },
  ];

  const profileDropdownEmployee: Array<{ name: string; href: string; icon: any; isSeparated?: boolean }> = [];
  if (isEmployee) {
    if (frontendPermissions.gusmester) {
      profileDropdownEmployee.push({ name: 'Gus Mester', href: '/gusmester', icon: Star, isSeparated: true });
    }
    if (frontendPermissions.staff) {
      profileDropdownEmployee.push({ name: 'Medarbejder', href: '/personale', icon: Users, isSeparated: true });
    }
    if (frontendPermissions.administration) {
      profileDropdownEmployee.push({ name: 'Medlemmer', href: '/administration', icon: Users, isSeparated: true });
      profileDropdownEmployee.push({ name: 'Sessioner', href: '/admin-sessions', icon: Calendar });
      profileDropdownEmployee.push({ name: 'Klippekort', href: '/admin-punch-cards', icon: Ticket });
      profileDropdownEmployee.push({ name: 'Opret Bruger', href: '/admin-users', icon: User });
    }
  }

  const profileDropdown = [...profileDropdownBase, ...profileDropdownEmployee];

  return (
    <>
      <header className="bg-[#faf8f5] border-b border-[#502B30]/20 sticky top-0 z-40 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center group">
                <div className="h-10 w-10 rounded-sm bg-gradient-to-br from-[#502B30] to-[#5e3023] flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <span className="text-amber-100 font-bold text-xl">I</span>
                </div>
                <span className="ml-3 text-xl font-bold text-[#502B30] tracking-wide">
                  INIPI
                </span>
              </Link>
            </div>

            {/* Center: Navigation (Desktop) */}
            <nav className="hidden md:flex items-center space-x-2">
              {navigationBefore.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                      isActive
                        ? 'bg-[#502B30] text-amber-100'
                        : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Gus Tider Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowGusTiderDropdown(!showGusTiderDropdown)}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                    (showGusTiderDropdown || pathname.startsWith('/sessions'))
                      ? 'bg-[#502B30] text-amber-100'
                      : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                  }`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Gus Tider
                  <ChevronDown className="h-4 w-4 ml-2" />
                </button>

                {showGusTiderDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowGusTiderDropdown(false)}
                    />
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-sm shadow-xl border border-[#502B30]/20 py-1 z-20">
                      {gusTiderDropdownItems.map(item => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setShowGusTiderDropdown(false)}
                          className="flex items-center w-full px-4 py-2 text-sm hover:bg-[#502B30]/10 transition-colors text-[#4a2329]/80"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {navigationAfter.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                      isActive
                        ? 'bg-[#502B30] text-amber-100'
                        : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Profile/Login (Desktop) */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Profile Dropdown or Login Button */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                      showProfileDropdown
                        ? 'bg-[#502B30] text-amber-100'
                        : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                    }`}
                  >
                    <User className="h-4 w-4 mr-2" />
                    {userName || 'Profil'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </button>

                  {showProfileDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowProfileDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-sm shadow-xl border border-[#502B30]/20 py-1 z-20">
                        {profileDropdown.map((item, index) => {
                          const Icon = item.icon;
                          const isActive = isActivePath(item.href);
                          const showSeparatorBefore = item.isSeparated && index > 0 && !profileDropdown[index - 1].isSeparated;
                          
                          return (
                            <div key={item.name}>
                              {showSeparatorBefore && (
                                <div className="border-t border-[#502B30]/20 my-1"></div>
                              )}
                              <Link
                                href={item.href}
                                onClick={() => setShowProfileDropdown(false)}
                                className={`flex items-center w-full px-4 py-2 text-sm hover:bg-[#502B30]/10 transition-colors ${
                                  isActive
                                    ? 'text-[#502B30] font-medium'
                                    : 'text-[#4a2329]/80'
                                }`}
                              >
                                <Icon className="h-4 w-4 mr-3" />
                                {item.name}
                              </Link>
                            </div>
                          );
                        })}
                        
                        <div className="border-t border-[#502B30]/20 my-1"></div>
                        
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            handleLogout();
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-[#502B30]/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Log ud
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center px-6 py-2 text-sm font-medium rounded-sm bg-[#502B30] hover:bg-[#5e3023] text-amber-100 transition-all shadow-md hover:shadow-lg"
                >
                  <User className="h-4 w-4 mr-2" />
                  Log ind
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden flex items-center justify-center p-2 text-[#502B30] hover:bg-[#502B30]/10 rounded-sm transition-colors"
            >
              {showMobileMenu ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Mobile Menu Panel */}
          <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#faf8f5] shadow-xl z-50 overflow-y-auto md:hidden">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#502B30]/20">
              <Link href="/" className="flex items-center" onClick={() => setShowMobileMenu(false)}>
                <div className="h-8 w-8 rounded-sm bg-gradient-to-br from-[#502B30] to-[#5e3023] flex items-center justify-center shadow-md">
                  <span className="text-amber-100 font-bold text-xl">I</span>
                </div>
                <span className="ml-2 text-lg font-semibold text-[#502B30]">
                  INIPI
                </span>
              </Link>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-[#502B30]/70 hover:text-[#502B30]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="p-4">
              {/* Navigation Links */}
              <nav className="space-y-1 mb-4">
                {navigationBefore.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-sm transition-colors ${
                        isActive
                          ? 'bg-[#502B30] text-amber-100'
                          : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
                
                {/* Gus Tider Section */}
                <div>
                  <div className="px-4 py-2">
                    <p className="text-xs text-[#502B30]/60 uppercase tracking-wider flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Gus Tider
                    </p>
                  </div>
                  {gusTiderDropdownItems.map((item) => {
                    const isActive = isActivePath(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setShowMobileMenu(false)}
                        className={`flex items-center w-full px-8 py-2 text-sm rounded-sm transition-colors ${
                          isActive
                            ? 'bg-[#502B30] text-amber-100 font-medium'
                            : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>

                {navigationAfter.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-sm transition-colors ${
                        isActive
                          ? 'bg-[#502B30] text-amber-100'
                          : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* User Section */}
              {isAuthenticated ? (
                <>
                  <div className="border-t border-[#502B30]/20 pt-4 mb-4">
                    <div className="px-4 py-2 mb-2">
                      <p className="text-xs text-[#502B30]/60 uppercase tracking-wider">
                        Konto
                      </p>
                    </div>
                    {profileDropdown.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = isActivePath(item.href);
                      const showSeparatorBefore = item.isSeparated && index > 0 && !profileDropdown[index - 1].isSeparated;
                      
                      return (
                        <div key={item.name}>
                          {showSeparatorBefore && (
                            <div className="border-t border-[#502B30]/20 my-2"></div>
                          )}
                          <Link
                            href={item.href}
                            onClick={() => setShowMobileMenu(false)}
                            className={`flex items-center w-full px-4 py-3 text-sm rounded-sm transition-colors ${
                              isActive
                                ? 'bg-[#502B30] text-amber-100 font-medium'
                                : 'text-[#502B30]/80 hover:bg-[#502B30]/10'
                            }`}
                          >
                            <Icon className="h-5 w-5 mr-3" />
                            {item.name}
                          </Link>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-[#502B30]/10 rounded-sm transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Log ud
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full flex items-center justify-center px-6 py-3 text-sm font-medium rounded-sm bg-[#502B30] hover:bg-[#5e3023] text-amber-100 transition-all shadow-md"
                >
                  <User className="h-5 w-5 mr-2" />
                  Log ind
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

