'use client';

import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { cachedMembers } from '@/lib/cachedMembers';

export default function ContactPage() {
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    address: string;
    city: string;
    zipCode: string;
    email: string;
    phone: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const config = await cachedMembers.getConfig();
      if (config.companyInfo) {
        setCompanyInfo({
          name: config.clinicName,
          address: config.companyInfo.address?.street || '',
          city: config.companyInfo.address?.city || '',
          zipCode: config.companyInfo.address?.zipCode || '',
          email: config.companyInfo.email || '',
          phone: config.companyInfo.phone || ''
        });
      }
    } catch (err) {
      console.error('[Contact] Error loading company info:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf8f5]">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#502B30] to-[#5e3023] text-amber-100 py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-wide">
              Kontakt Os
            </h1>
            <p className="text-xl text-amber-100/90">
              Vi er her for at hjælpe dig
            </p>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                {/* Contact Information */}
                <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 border border-[#502B30]/10">
                  <h2 className="text-2xl font-bold text-[#502B30] mb-6">
                    Kontakt Information
                  </h2>
                  
                  <div className="space-y-6">
                    {companyInfo?.address && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <MapPin className="h-6 w-6 text-[#502B30]" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-[#502B30] mb-1">
                            Adresse
                          </h3>
                          <p className="text-[#4a2329]/80">
                            {companyInfo.address}<br />
                            {companyInfo.zipCode} {companyInfo.city}
                          </p>
                        </div>
                      </div>
                    )}

                    {companyInfo?.phone && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <Phone className="h-6 w-6 text-[#502B30]" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-[#502B30] mb-1">
                            Telefon
                          </h3>
                          <p className="text-[#4a2329]/80">
                            <a 
                              href={`tel:${companyInfo.phone.replace(/\s/g, '')}`} 
                              className="hover:text-[#5e3023] transition-colors"
                            >
                              {companyInfo.phone}
                            </a>
                          </p>
                        </div>
                      </div>
                    )}

                    {companyInfo?.email && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <Mail className="h-6 w-6 text-[#502B30]" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-[#502B30] mb-1">
                            Email
                          </h3>
                          <p className="text-[#4a2329]/80">
                            <a 
                              href={`mailto:${companyInfo.email}`} 
                              className="hover:text-[#5e3023] transition-colors"
                            >
                              {companyInfo.email}
                            </a>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Clock className="h-6 w-6 text-[#502B30]" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-[#502B30] mb-1">
                          Åbningstider
                        </h3>
                        <p className="text-[#4a2329]/80">
                          Mandag - Fredag: 10:00 - 20:00<br />
                          Lørdag - Søndag: 10:00 - 18:00
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 border border-[#502B30]/10">
                  <h2 className="text-2xl font-bold text-[#502B30] mb-6">
                    Send Os En Besked
                  </h2>
                  
                  <form className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-[#502B30] mb-2">
                        Navn
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent bg-white"
                        placeholder="Dit navn"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-[#502B30] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent bg-white"
                        placeholder="din@email.dk"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-[#502B30] mb-2">
                        Telefon (valgfrit)
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent bg-white"
                        placeholder="+45 12 34 56 78"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-[#502B30] mb-2">
                        Besked
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent bg-white"
                        placeholder="Hvordan kan vi hjælpe dig?"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#502B30] hover:bg-[#5e3023] text-amber-100 px-6 py-3 rounded-sm font-semibold transition-colors"
                    >
                      Send Besked
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

