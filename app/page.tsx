'use client';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Gusmester {
  id: string;
  name: string;
  title: string;
  public_profile: {
    bio?: string;
    photoUrl?: string;
    experience?: string;
    specializations?: string[];
    qualifications?: string[];
    showInBooking?: boolean;
  };
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [gusmesters, setGusmesters] = useState<Gusmester[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    loadGusmesters();
  }, []);

  const loadGusmesters = async () => {
    try {
      setLoadingTeam(true);
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, title, public_profile')
        .eq('status', 'active')
        .eq('frontend_permissions->>gusmester', 'true');

      if (error) throw error;

      // Filter to only show gusmesters with showInBooking = true
      const visibleGusmesters = (data || []).filter((g: Gusmester) => 
        g.public_profile?.showInBooking !== false
      );

      setGusmesters(visibleGusmesters);
    } catch (err) {
      console.error('Error loading gusmesters:', err);
    } finally {
      setLoadingTeam(false);
    }
  };
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf8f5]">
        {/* Hero Section with Background Image */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/images/inipi-hero.jpg)' }}
          />

          {/* Warm Color Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#502B30]/85 via-[#5e3023]/80 to-[#4a2329]/85" />
          
          {/* Decorative Border Elements */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#5e3023] via-[#502B30] to-[#5e3023]" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#5e3023] via-[#502B30] to-[#5e3023]" />

          {/* Content */}
          <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
            {/* Decorative Top Element */}
            <div className="mb-8 flex justify-center">
              <svg width="100" height="60" viewBox="0 0 100 60" className="text-amber-200/80">
                <path d="M50,5 L60,25 L50,20 L40,25 Z" fill="currentColor" />
                <circle cx="50" cy="35" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M30,50 Q50,40 70,50" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold text-amber-100 mb-6 drop-shadow-2xl tracking-wider">
              Inipi Sauna Gus
            </h1>
            
            <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-amber-300 to-transparent mb-6" />
            
            <p className="text-2xl md:text-3xl text-amber-200/90 mb-8 drop-shadow-lg font-light tracking-wide">
              Saunagus oplevelser på Amagerstrand i smukke omgivelser
            </p>
            
            <p className="text-xl md:text-2xl text-amber-100/80 mb-12 max-w-3xl mx-auto drop-shadow-lg leading-relaxed italic">
              'Kom som du er, gå hjem som dig selv'
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a 
                href="/sessions?type=Fyraftensgus" 
                className="bg-amber-100 hover:bg-amber-50 text-[#502B30] px-10 py-4 rounded-sm text-lg font-semibold transition-all shadow-xl hover:shadow-2xl hover:scale-105 border-2 border-amber-200"
              >
                Book Fyraftensgus
              </a>
              <a 
                href="/sessions?type=Privat/Firma Gus" 
                className="bg-transparent hover:bg-white/10 text-amber-100 px-10 py-4 rounded-sm text-lg font-semibold transition-all shadow-xl border-2 border-amber-200/50 hover:border-amber-200"
              >
                Book Privat Event
              </a>
            </div>

            {/* Decorative Bottom Element */}
            <div className="mt-12 flex justify-center">
              <svg width="120" height="40" viewBox="0 0 120 40" className="text-amber-200/60">
                <path d="M10,20 L30,10 L50,20 L70,10 L90,20 L110,10" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="30" cy="10" r="3" fill="currentColor" />
                <circle cx="60" cy="20" r="3" fill="currentColor" />
                <circle cx="90" cy="20" r="3" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-amber-200/60">
              <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </section>

        {/* Intro Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-[#faf8f5] to-[#f5f0eb]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xl text-[#4a2329] leading-relaxed mb-8">
                Inipi Amagerstrand er et velværested ved Øresund, med rødder i traditionelle sort fod indiansk sauna gus ritualer. 
                Vi tilbyder moderne svedhytter hvor gæster kan opleve guidet saunagus, koldtvandsdyp og sanselige sauna oplevelser. 
                Vores oplevelser inkluderer daglig åbent fyraftensgus samt private og gruppebookinger. Stedet kombinerer natur, ild 
                og vand og skaber et roligt og genoplivende miljø. Inipi er et sted hvor man kan finde ro, slippe stress og 
                genforbinde kroppen og sind.
              </p>
              <a 
                href="/sessions?type=Fyraftensgus" 
                className="inline-block bg-[#502B30] hover:bg-[#5e3023] text-amber-100 px-10 py-4 rounded-sm text-lg font-semibold transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Se kommende Fyraftensgus
              </a>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-[#502B30] mb-6 tracking-wide">
                Galleri
              </h2>
              <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[#502B30] to-transparent mb-8" />
              <p className="text-lg text-[#4a2329]/80">
                Oplevelser fra vores saunagus ved Amagerstrand
              </p>
            </div>
            
            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className="aspect-square rounded-sm overflow-hidden cursor-pointer group relative"
                >
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundImage: `url(/images/${i}.jpg)` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#502B30]/20 via-[#5e3023]/10 to-[#4a2329]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-[#faf8f5] to-[#f5f0eb]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-[#502B30] mb-6 tracking-wide">
                Om Os
              </h2>
              <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[#502B30] to-transparent" />
            </div>

            <div className="space-y-8 text-lg text-[#4a2329] leading-relaxed">
              <p>
                Da Amager Strandpark stod klar, opstod ideen om at skabe et lille velværested midt i naturen, hvor havet kunne 
                fungere som et naturligt koldvandskar. Det hele begyndte ganske simpelt. En skurvogn blev anskaffet, sat i stand 
                og placeret ved stranden. En svedhytte blev bygget af pilegrene, tæpper og presenninger og der blev lavet gus på 
                traditionel indiansk vis med opvarmede sten i et bål. Mange oplevede her, hvordan de fandt hjem i sig selv gennem 
                varmen og stilheden.
              </p>
              <p>
                I 2012 blev der opført en ny svedhytte i gasbeton med en elektrisk saunaovn, som skabte en mere moderne version af 
                den oprindelige vision.
              </p>
              <p>
                Herefter blev der åbnet op for nye formater. Fyraftensgus gav folk mulighed for at komme præcis som de var og tage 
                hjem i mere rolig og balanceret tilstand. Der blev eksperimenteret med temagus, Detox Tuesdays og nye sanselige 
                saunaoplevelser.
              </p>
              <p>
                I 2019 blev næste skridt taget. Inipi flyttede cirka 80 meter længere hen ad Havkajakvej til nye og forbedrede 
                faciliteter. Her blev der etableret moderne svedhytter, et køkken, omklædningsrum, bad, toilet og en tagterrasse 
                med udsigt over havet.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-[#502B30] mb-6 tracking-wide">
                Vores Team
              </h2>
              <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[#502B30] to-transparent mb-8" />
              <p className="text-lg text-[#4a2329]/80">
                Mød vores erfarne gusmestre
              </p>
            </div>
            
            {/* Team Grid */}
            {loadingTeam ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#502B30] border-t-transparent"></div>
              </div>
            ) : gusmesters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#4a2329]/60">Ingen gusmestre at vise endnu</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gusmesters.map((gusmester) => (
                  <div key={gusmester.id} className="bg-[#faf8f5] rounded-sm shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    {/* Photo */}
                    <div className="aspect-square bg-[#502B30]/10 flex items-center justify-center overflow-hidden">
                      {gusmester.public_profile?.photoUrl ? (
                        <img 
                          src={gusmester.public_profile.photoUrl} 
                          alt={gusmester.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-24 h-24 text-[#502B30]/30" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-[#502B30] mb-1">
                        {gusmester.name}
                      </h3>
                      {gusmester.title && (
                        <p className="text-sm text-[#502B30]/60 mb-3 font-medium">
                          {gusmester.title}
                        </p>
                      )}
                      {gusmester.public_profile?.bio && (
                        <p className="text-[#4a2329]/70 text-sm mb-4 line-clamp-4">
                          {gusmester.public_profile.bio}
                        </p>
                      )}
                      {gusmester.public_profile?.experience && (
                        <p className="text-xs text-[#4a2329]/60 mb-3">
                          <strong>Erfaring:</strong> {gusmester.public_profile.experience}
                        </p>
                      )}
                      {gusmester.public_profile?.specializations && gusmester.public_profile.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {gusmester.public_profile.specializations.map((spec, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 bg-amber-100 text-[#502B30] rounded-full text-xs font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-24 px-4 bg-gradient-to-br from-[#5e3023] to-[#4a2329] text-white relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber-200/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-200/5 rounded-full blur-3xl" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="mb-6 flex justify-center">
              <svg width="80" height="60" viewBox="0 0 80 60" className="text-amber-200/40">
                <circle cx="40" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M25,30 L55,30 M40,15 L40,45" stroke="currentColor" strokeWidth="2" />
                <circle cx="40" cy="30" r="5" fill="currentColor" />
              </svg>
            </div>

            <h2 className="text-5xl font-bold mb-6 tracking-wide">
              Kontakt
            </h2>
            
            <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-amber-300 to-transparent mb-8" />
            
            <p className="text-xl mb-4 text-amber-100">
              Har du spørgsmål eller vil du booke et privat event?
            </p>
            <p className="text-lg mb-12 text-amber-100/70 max-w-2xl mx-auto">
              Kontakt os for mere information om private events, gruppebookinger eller andre henvendelser.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/contact" 
                className="inline-block bg-amber-100 text-[#502B30] px-12 py-5 rounded-sm text-xl font-semibold hover:bg-amber-50 transition-all shadow-2xl hover:scale-105 border-2 border-amber-200"
              >
                Kontakt Os
              </a>
              <a 
                href="/sessions?type=Fyraftensgus" 
                className="inline-block bg-transparent text-amber-100 px-12 py-5 rounded-sm text-xl font-semibold hover:bg-white/10 transition-all shadow-2xl border-2 border-amber-200/50 hover:border-amber-200"
              >
                Book Fyraftensgus
              </a>
            </div>

            <div className="mt-16 pt-12 border-t border-amber-200/20">
              <p className="text-sm text-amber-100/60 italic">
                'Kom som du er, gå hjem som dig selv'
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Gallery Modal */}
      {selectedImage !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-sm text-white transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Modal Content */}
          <div 
            className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(/images/${selectedImage}.jpg)` }}
            />
            
            {/* Warm Overlay (same as hero) */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#502B30]/30 via-[#5e3023]/20 to-[#4a2329]/30 pointer-events-none" />
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(selectedImage > 1 ? selectedImage - 1 : 8);
            }}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-sm text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(selectedImage < 8 ? selectedImage + 1 : 1);
            }}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-sm text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
