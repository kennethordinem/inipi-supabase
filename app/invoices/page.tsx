'use client';

import { useState, useEffect } from 'react';
import { cachedMembers } from '@/lib/cachedMembers';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Receipt, Clock, CheckCircle, XCircle, FileText, Calendar, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

// Add print styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      @page {
        margin: 1cm;
        size: A4;
      }
      
      /* Remove body padding/margin and set white background */
      body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Hide header and footer */
      header, footer {
        display: none !important;
      }
      
      /* Hide elements marked as print:hidden */
      .print\\:hidden {
        display: none !important;
      }
      
      /* Hide the main container's background and constraints */
      main {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      
      /* Make the container invisible but keep structure */
      .min-h-screen {
        min-height: 0 !important;
        background: white !important;
        padding: 0 !important;
      }
      
      /* Style the print content */
      .print-content {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 20px !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
        background: white !important;
      }
      
      /* Prevent page breaks inside the content */
      .print-content {
        page-break-inside: avoid;
      }
      
      /* Ensure all content inside is visible */
      .print-content * {
        visibility: visible !important;
      }
    }
  `;
  document.head.appendChild(style);
}

interface ReceiptItem {
  description: string;
  quantity: number;
  price: number;
}

interface ReceiptData {
  id: string;
  receiptNumber: string;
  total: number;
  status: 'paid' | 'pending' | 'cancelled';
  createdAt: Date;
  paidAt?: Date;
  items: ReceiptItem[];
  paymentMethod?: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    address: string;
    city: string;
    zipCode: string;
    cvr: string;
    email: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check authentication
      const userId = localStorage.getItem('userId');
      if (!userId) {
        window.location.href = '/login';
        return;
      }

      // Load company info from clinic config (CACHED)
      const config = await cachedMembers.getConfig();
      if (config.companyInfo) {
        setCompanyInfo({
          name: config.clinicName,
          address: config.companyInfo.address?.street || 'Adresse ikke angivet',
          city: config.companyInfo.address?.city || 'By ikke angivet',
          zipCode: config.companyInfo.address?.zipCode || '0000',
          cvr: config.companyInfo.cvr || 'CVR ikke angivet',
          email: config.companyInfo.email || 'Email ikke angivet',
          phone: config.companyInfo.phone || 'Telefon ikke angivet'
        });
      }

      // Use SDK to get payment history (CACHED)
      const { payments } = await cachedMembers.getPaymentHistory(50);
      
      // Convert payments to receipt format
      const receiptData: ReceiptData[] = payments.map((payment: any) => ({
        id: payment.id,
        receiptNumber: `INIPI-${payment.id.slice(-8).toUpperCase()}`,
        total: payment.amount,
        status: payment.status as 'paid' | 'pending' | 'cancelled',
        createdAt: payment.date ? parseISO(payment.date) : new Date(),
        paidAt: payment.status === 'paid' && payment.date ? parseISO(payment.date) : undefined,
        items: [{
          description: payment.description,
          quantity: 1,
          price: payment.amount
        }],
        paymentMethod: payment.method === 'stripe' ? 'Kort' : payment.method === 'punch_card' ? 'Klippekort' : payment.method
      }));

      setReceipts(receiptData);
    } catch (err: any) {
      console.error('[Receipts] Error loading data:', err);
      setError('Kunne ikke indlæse kvitteringer');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (receipt: ReceiptData) => {
    if (receipt.status === 'paid') {
      return {
        text: 'Betalt',
        icon: CheckCircle,
        className: 'text-green-600',
        bgClassName: 'bg-green-100'
      };
    } else if (receipt.status === 'cancelled') {
      return {
        text: 'Annulleret',
        icon: XCircle,
        className: 'text-gray-600',
        bgClassName: 'bg-gray-100'
      };
    } else {
      return {
        text: 'Afventer betaling',
        icon: Clock,
        className: 'text-amber-600',
        bgClassName: 'bg-amber-100'
      };
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser kvitteringer...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // If viewing a specific receipt
  if (selectedReceipt && companyInfo) {
    const statusInfo = getStatusInfo(selectedReceipt);
    const StatusIcon = statusInfo.icon;

    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5]">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Action Buttons */}
            <div className="mb-6 flex justify-between items-center print:hidden">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-[#502B30] hover:text-[#5e3023] flex items-center gap-2"
              >
                ← Tilbage til oversigt
              </button>
              
              <button
                onClick={() => window.print()}
                className="bg-[#502B30] hover:bg-[#5e3023] text-white px-6 py-2 rounded-sm flex items-center gap-2 transition-colors"
              >
                <Printer className="h-5 w-5" />
                Udskriv kvittering
              </button>
            </div>

            {/* Receipt Card */}
            <div className="print-content bg-white rounded-sm shadow-2xl border border-[#502B30]/20 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#502B30] to-[#5e3023] px-8 py-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">Kvittering</h2>
                      <p className="text-amber-100/80 text-sm">#{selectedReceipt.receiptNumber}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-sm ${statusInfo.bgClassName}`}>
                    <span className={`flex items-center gap-2 font-medium ${statusInfo.className}`}>
                      <StatusIcon className="h-5 w-5" />
                      {statusInfo.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Company Info */}
                <div className="mb-8 pb-6 border-b border-[#502B30]/20">
                  <h3 className="text-2xl font-bold text-[#502B30] mb-2">{companyInfo.name}</h3>
                  <p className="text-[#4a2329]/80 text-sm">{companyInfo.address}</p>
                  <p className="text-[#4a2329]/80 text-sm">{companyInfo.zipCode} {companyInfo.city}</p>
                  <p className="text-[#4a2329]/80 text-sm mt-2">CVR: {companyInfo.cvr}</p>
                  <p className="text-[#4a2329]/80 text-sm">Email: {companyInfo.email}</p>
                  {companyInfo.phone && <p className="text-[#4a2329]/80 text-sm">Tlf: {companyInfo.phone}</p>}
                </div>

                {/* Receipt Details */}
                <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b border-[#502B30]/20">
                  <div>
                    <p className="text-xs text-[#4a2329]/60 uppercase tracking-wider mb-1">Kvitteringsnummer</p>
                    <p className="text-sm font-semibold text-[#502B30]">{selectedReceipt.receiptNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#4a2329]/60 uppercase tracking-wider mb-1">Dato</p>
                    <p className="text-sm font-semibold text-[#502B30]">
                      {format(selectedReceipt.createdAt, 'd. MMMM yyyy', { locale: da })}
                    </p>
                  </div>
                  {selectedReceipt.paidAt && (
                    <div>
                      <p className="text-xs text-[#4a2329]/60 uppercase tracking-wider mb-1">Betalt</p>
                      <p className="text-sm font-semibold text-[#502B30]">
                        {format(selectedReceipt.paidAt, 'd. MMMM yyyy', { locale: da })}
                      </p>
                    </div>
                  )}
                  {selectedReceipt.paymentMethod && (
                    <div>
                      <p className="text-xs text-[#4a2329]/60 uppercase tracking-wider mb-1">Betalingsmetode</p>
                      <p className="text-sm font-semibold text-[#502B30]">{selectedReceipt.paymentMethod}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-[#502B30] uppercase tracking-wider mb-4">Produkter/Tjenester</h4>
                  <div className="space-y-3">
                    {selectedReceipt.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start py-3 border-b border-[#502B30]/10">
                        <div className="flex-1">
                          <p className="text-[#502B30] font-medium">{item.description}</p>
                          {item.quantity > 1 && (
                            <p className="text-sm text-[#4a2329]/60 mt-1">
                              Antal: {item.quantity} x {item.price.toLocaleString('da-DK')} kr.
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#502B30]">
                            {(item.price * item.quantity).toLocaleString('da-DK')} kr.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-[#502B30]/5 rounded-sm p-6 border-2 border-[#502B30]/20">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-[#502B30] uppercase tracking-wide">I alt betalt</span>
                    <span className="text-3xl font-bold text-[#502B30]">
                      {selectedReceipt.total.toLocaleString('da-DK')} kr.
                    </span>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-8 pt-6 border-t border-[#502B30]/20 text-center">
                  <p className="text-xs text-[#4a2329]/60">
                    Tak for dit køb hos {companyInfo.name}
                  </p>
                  <p className="text-xs text-[#4a2329]/60 mt-1">
                    Ved spørgsmål kontakt os på {companyInfo.email}
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  // List view
  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#faf8f5]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide">
              Mine Kvitteringer
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Se dine kvitteringer og betalinger
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-sm p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Receipts List */}
          {receipts.length > 0 ? (
            <div className="space-y-4">
              {receipts.map(receipt => {
                const statusInfo = getStatusInfo(receipt);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={receipt.id}
                    onClick={() => setSelectedReceipt(receipt)}
                    className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/20 p-6 hover:shadow-xl transition-all cursor-pointer hover:border-[#502B30]/40"
                  >
                    <div className="flex items-start justify-between">
                      {/* Left: Receipt Info */}
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className={`p-2 rounded-sm ${statusInfo.bgClassName} mr-3`}>
                            <StatusIcon className={`h-5 w-5 ${statusInfo.className}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#502B30]">
                              Kvittering #{receipt.receiptNumber}
                            </h3>
                            <p className="text-sm text-[#4a2329]/70">
                              {format(receipt.createdAt, 'd. MMMM yyyy', { locale: da })}
                            </p>
                          </div>
                        </div>

                        {/* Receipt Items */}
                        {receipt.items && receipt.items.length > 0 && (
                          <div className="mb-3 pl-14">
                            {receipt.items.map((item, idx) => (
                              <div key={idx} className="text-sm text-[#4a2329]/80">
                                {item.description}
                                {item.quantity > 1 && ` (${item.quantity} stk.)`}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Status Info */}
                        <div className="pl-14 flex items-center gap-3 flex-wrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-sm text-sm font-medium ${statusInfo.bgClassName} ${statusInfo.className}`}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {statusInfo.text}
                          </span>
                          {receipt.paidAt && (
                            <span className="text-sm text-[#4a2329]/70">
                              Betalt {format(receipt.paidAt, 'd. MMM yyyy', { locale: da })}
                            </span>
                          )}
                          {receipt.paymentMethod && (
                            <span className="text-xs text-[#4a2329]/60 px-2 py-1 bg-[#502B30]/10 rounded-sm">
                              {receipt.paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Arrow */}
                      <div className="text-right ml-6 flex items-center gap-4">
                        <div className="text-2xl font-bold text-[#502B30]">
                          {receipt.total.toLocaleString('da-DK')} kr.
                        </div>
                        <div className="text-[#502B30]/40">
                          →
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/20 p-8 text-center">
              <Receipt className="h-12 w-12 text-[#502B30]/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#502B30] mb-2">
                Ingen kvitteringer
              </h3>
              <p className="text-[#4a2329]/80">
                Du har ingen kvitteringer endnu. Når du booker og betaler for en saunagus, vil kvitteringen vises her.
              </p>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}

