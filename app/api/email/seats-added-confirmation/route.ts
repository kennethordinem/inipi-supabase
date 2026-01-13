import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { bookingId, additionalSeats, amount, invoiceNumber } = await request.json();

    console.log('[Seats-Added-Email] Received request:', { bookingId, additionalSeats, amount, invoiceNumber });

    if (!bookingId || !additionalSeats || !amount || !invoiceNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch booking details with session and theme info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions!inner(
          id,
          name,
          date,
          time,
          location
        ),
        profiles!inner(
          id,
          name,
          email
        ),
        themes!inner(
          id,
          name,
          price_per_person
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[Seats-Added-Email] Error fetching booking:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const session = booking.sessions;
    const profile = booking.profiles;
    const theme = booking.themes;

    // Format date and time
    const sessionDate = new Date(session.date).toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const sessionTime = session.time;

    // Calculate new total seats
    const newTotalSeats = booking.spots;

    // Email subject
    const subject = `Bekræftelse: ${additionalSeats} ekstra pladser tilføjet til ${theme.name}`;

    // HTML Email
    const htmlBody = `
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #faf8f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #502B30 0%, #5e3023 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">INIPI Amagerstrand</h1>
              <p style="margin: 10px 0 0 0; color: #f9dcc4; font-size: 16px;">Ekstra pladser tilføjet ✓</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #502B30; font-size: 24px;">Hej ${profile.name}!</h2>
              
              <p style="margin: 0 0 20px 0; color: #4a2329; font-size: 16px; line-height: 1.6;">
                Vi har tilføjet <strong>${additionalSeats} ekstra pladser</strong> til din private saunagus. Din betaling er modtaget, og din reservation er nu opdateret.
              </p>

              <!-- Booking Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #faf8f5; border-radius: 8px; margin: 30px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 20px 0; color: #502B30; font-size: 18px; border-bottom: 2px solid #502B30; padding-bottom: 10px;">
                      Opdateret Reservation
                    </h3>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px; width: 40%;">
                          <strong>Tema:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          ${theme.name}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          <strong>Session:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          ${session.name}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          <strong>Dato:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          ${sessionDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          <strong>Tidspunkt:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          ${sessionTime}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          <strong>Lokation:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #4a2329; font-size: 14px;">
                          ${session.location || 'INIPI Amagerstrand'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; color: #502B30; font-size: 16px; font-weight: bold; border-top: 2px solid #502B30;">
                          <strong>Antal pladser i alt:</strong>
                        </td>
                        <td style="padding: 12px 0; color: #502B30; font-size: 16px; font-weight: bold; border-top: 2px solid #502B30;">
                          ${newTotalSeats} personer
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #e8f5e9; border-radius: 8px; margin: 30px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 20px 0; color: #2e7d32; font-size: 18px; border-bottom: 2px solid #2e7d32; padding-bottom: 10px;">
                      Betaling for ekstra pladser
                    </h3>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #1b5e20; font-size: 14px; width: 40%;">
                          <strong>Ekstra pladser:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1b5e20; font-size: 14px;">
                          ${additionalSeats} personer
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #1b5e20; font-size: 14px;">
                          <strong>Pris pr. person:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1b5e20; font-size: 14px;">
                          ${(amount / additionalSeats).toFixed(2)} kr.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; color: #2e7d32; font-size: 16px; font-weight: bold; border-top: 2px solid #2e7d32;">
                          <strong>Betalt beløb:</strong>
                        </td>
                        <td style="padding: 12px 0; color: #2e7d32; font-size: 16px; font-weight: bold; border-top: 2px solid #2e7d32;">
                          ${amount.toFixed(2)} kr.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #1b5e20; font-size: 14px;">
                          <strong>Kvitteringsnr:</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1b5e20; font-size: 14px;">
                          ${invoiceNumber}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px 0; color: #4a2329; font-size: 16px; line-height: 1.6;">
                Du kan se din opdaterede reservation og kvittering under <strong>"Mine hold"</strong> på vores hjemmeside.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://inipi.dk/mine-hold" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #502B30 0%, #5e3023 100%); color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">
                      Se mine hold
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #4a2329; font-size: 14px; line-height: 1.6;">
                Vi glæder os til at se dig!
              </p>

              <p style="margin: 10px 0 0 0; color: #4a2329; font-size: 14px; line-height: 1.6;">
                Varme hilsner,<br>
                <strong>INIPI Amagerstrand</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #faf8f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #4a2329; font-size: 14px;">
                <strong>INIPI Amagerstrand</strong><br>
                Havkajakvej 8, 2300 København S
              </p>
              <p style="margin: 0; color: #4a2329; font-size: 14px;">
                Email: <a href="mailto:mail@inipi.dk" style="color: #502B30; text-decoration: none;">mail@inipi.dk</a> | 
                Telefon: <a href="tel:+4531206011" style="color: #502B30; text-decoration: none;">+45 31 20 60 11</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Plain text version
    const textBody = `
Hej ${profile.name}!

Vi har tilføjet ${additionalSeats} ekstra pladser til din private saunagus. Din betaling er modtaget, og din reservation er nu opdateret.

OPDATERET RESERVATION
=====================
Tema: ${theme.name}
Session: ${session.name}
Dato: ${sessionDate}
Tidspunkt: ${sessionTime}
Lokation: ${session.location || 'INIPI Amagerstrand'}
Antal pladser i alt: ${newTotalSeats} personer

BETALING FOR EKSTRA PLADSER
============================
Ekstra pladser: ${additionalSeats} personer
Pris pr. person: ${(amount / additionalSeats).toFixed(2)} kr.
Betalt beløb: ${amount.toFixed(2)} kr.
Kvitteringsnr: ${invoiceNumber}

Du kan se din opdaterede reservation og kvittering under "Mine hold" på vores hjemmeside: https://inipi.dk/mine-hold

Vi glæder os til at se dig!

Varme hilsner,
INIPI Amagerstrand

---
INIPI Amagerstrand
Havkajakvej 8, 2300 København S
Email: mail@inipi.dk | Telefon: +45 31 20 60 11
    `;

    // Send email
    await sendEmail({
      to: profile.email,
      subject,
      htmlBody,
      textBody,
    });

    console.log('[Seats-Added-Email] Email sent successfully to:', profile.email);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Seats-Added-Email] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
