import { ServerClient } from 'postmark';

// Initialize Postmark client
let postmarkClient: ServerClient | null = null;

function getPostmarkClient(): ServerClient {
  if (!postmarkClient) {
    const apiKey = process.env.POSTMARK_API_KEY;
    if (!apiKey) {
      throw new Error('POSTMARK_API_KEY is not configured');
    }
    postmarkClient = new ServerClient(apiKey);
  }
  return postmarkClient;
}

// Premium email style template (matching Employee Welcome design)
const PREMIUM_EMAIL_STYLES = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #faf8f5; }
  .header { background: linear-gradient(135deg, #502B30 0%, #5e3023 100%); color: #FFF5E1; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
  .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
  .header p { margin: 10px 0 0 0; color: #f59e0b; font-style: italic; }
  .content { background: #fff; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
  .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #502B30; }
  .details strong { color: #502B30; display: block; margin-bottom: 5px; }
  .detail-item { background: white; padding: 12px; margin: 10px 0; border-radius: 5px; border: 1px solid #e5e7eb; }
  .info-box { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
  .success-box { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
  .warning-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
  .error-box { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
  .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #502B30 0%, #5e3023 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(80, 43, 48, 0.3); }
  .button:hover { background: linear-gradient(135deg, #5e3023 0%, #502B30 100%); }
  .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 14px; }
  .footer strong { color: #502B30; }
  .divider { height: 2px; background: linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%); margin: 30px 0; }
`;

// Email types
export interface BookingConfirmationEmail {
  to: string;
  userName: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  location: string;
  spots: number;
  price: number;
  paymentMethod: string;
  bookingId: string;
}

export interface BookingCancellationEmail {
  to: string;
  userName: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  refundInfo: string;
  punchCardAdded?: boolean;
}

export interface PunchCardPurchaseEmail {
  to: string;
  userName: string;
  punchCardName: string;
  clips: number;
  price: number;
  purchaseDate: string;
}

export interface PunchCardUsedEmail {
  to: string;
  userName: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  clipsRemaining: number;
  punchCardName: string;
}

export interface PunchCardAddedEmail {
  to: string;
  userName: string;
  punchCardName: string;
  clips: number;
  reason: string;
}

export interface EmployeeWelcomeEmail {
  to: string;
  employeeName: string;
  email: string;
  password: string;
  title?: string;
  permissions: {
    staff: boolean;
    gusmester: boolean;
    administration: boolean;
  };
}

export interface SessionReminderEmail {
  to: string;
  userName: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  location: string;
  spots: number;
  bookingId: string;
}

export interface PaymentFailedEmail {
  to: string;
  userName: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  amount: number;
  bookingId: string;
}

export interface GusmesterPointsEarnedEmail {
  to: string;
  employeeName: string;
  pointsEarned: number;
  totalPoints: number;
  sessionName: string;
  sessionDate: string;
  reason: string;
}

export interface ContactFormEmail {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface PrivateEventConfirmationEmail {
  to: string;
  userName: string;
  themeName: string;
  sessionDate: string;
  sessionTime: string;
  location: string;
  spots: number;
  totalPrice: number;
  bookingId: string;
}

export interface SeatsAddedConfirmationEmail {
  to: string;
  userName: string;
  themeName: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  location: string;
  additionalSeats: number;
  newTotalSeats: number;
  amount: number;
  pricePerSeat: number;
  invoiceNumber: string;
}

export interface BookingMovedEmail {
  to: string;
  userName: string;
  oldSessionName: string;
  oldSessionDate: string;
  oldSessionTime: string;
  newSessionName: string;
  newSessionDate: string;
  newSessionTime: string;
  location: string;
  spots: number;
  reason: string;
  bookingId: string;
}

// Send booking confirmation
export async function sendBookingConfirmation(data: BookingConfirmationEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="margin-top: 0; color: #502B30;">Booking Bekræftet! ✅</h2>
            <p style="margin-bottom: 0; color: #065f46;">Hej ${data.userName}, vi glæder os til at se dig!</p>
          </div>
          
          <p>Din booking er bekræftet og klar. Se detaljer nedenfor:</p>
          
          <div class="details">
            <div class="detail-item">
              <strong>Session</strong>
              ${data.sessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.sessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Lokation</strong>
              ${data.location}
            </div>
            <div class="detail-item">
              <strong>Antal pladser</strong>
              ${data.spots}
            </div>
            <div class="detail-item">
              <strong>Betaling</strong>
              ${data.paymentMethod === 'punch_card' ? 'Klippekort' : data.price + ' DKK'}
            </div>
          </div>
          
          <div class="info-box">
            <strong>Booking ID:</strong> ${data.bookingId}
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Husk at medbringe:</h3>
          <ul style="color: #4b5563;">
            <li>Håndklæde</li>
            <li>Vand (vi har også drikkevarer til salg)</li>
            <li>Godt humør! 😊</li>
          </ul>
          
          <p>Hvis du har spørgsmål, er du velkommen til at kontakte os.</p>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">Vi ses til gus! 🧖‍♂️🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Booking bekræftet - ${data.sessionName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nDin booking er bekræftet!\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime.substring(0, 5)}\nLokation: ${data.location}\nAntal pladser: ${data.spots}\n\nBooking ID: ${data.bookingId}\n\nVi ses til gus!`,
    MessageStream: 'outbound'
  });
}

// Send booking cancellation
export async function sendBookingCancellation(data: BookingCancellationEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="warning-box">
            <h2 style="margin-top: 0; color: #502B30;">Booking Aflyst</h2>
            <p style="margin-bottom: 0; color: #78350f;">Hej ${data.userName}, din booking er blevet aflyst.</p>
          </div>
          
          <div class="details">
            <div class="detail-item">
              <strong>Session</strong>
              ${data.sessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.sessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Refusion</strong>
              ${data.refundInfo}
            </div>
          </div>
          
          ${data.punchCardAdded ? '<div class="success-box"><p style="margin: 0;"><strong>✅ Et klip er blevet tilføjet til dit klippekort som kompensation.</strong></p></div>' : ''}
          
          <div class="divider"></div>
          
          <p style="text-align: center;">Vi håber at se dig til en anden session! 🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Booking aflyst - ${data.sessionName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nDin booking er blevet aflyst.\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime.substring(0, 5)}\nRefusion: ${data.refundInfo}\n\n${data.punchCardAdded ? 'Et klip er blevet tilføjet til dit klippekort som kompensation.' : ''}`,
    MessageStream: 'outbound'
  });
}

// Send punch card purchase confirmation
export async function sendPunchCardPurchase(data: PunchCardPurchaseEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="margin-top: 0; color: #502B30;">Klippekort Købt! 🎉</h2>
            <p style="margin-bottom: 0; color: #065f46;">Hej ${data.userName}, tak for dit køb!</p>
          </div>
          
          <p>Dit klippekort er nu aktivt og klar til brug.</p>
          
          <div class="details">
            <div class="detail-item">
              <strong>Klippekort</strong>
              ${data.punchCardName}
            </div>
            <div class="detail-item">
              <strong>Antal klip</strong>
              ${data.clips} klip
            </div>
            <div class="detail-item">
              <strong>Pris</strong>
              ${data.price} DKK
            </div>
            <div class="detail-item">
              <strong>Købsdato</strong>
              ${data.purchaseDate}
            </div>
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Næste skridt:</h3>
          <ul style="color: #4b5563;">
            <li>Gå til "Klippekort" i din profil</li>
            <li>Se dine tilgængelige klip</li>
            <li>Book sessioner med dit klippekort</li>
          </ul>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">God gus! 🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Klippekort købt - ${data.punchCardName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nTak for dit køb!\n\nKlippekort: ${data.punchCardName}\nAntal klip: ${data.clips}\nPris: ${data.price} DKK\n\nDit klippekort er nu aktivt og klar til brug.`,
    MessageStream: 'outbound'
  });
}

// Send punch card used notification
export async function sendPunchCardUsed(data: PunchCardUsedEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="info-box">
            <h2 style="margin-top: 0; color: #502B30;">Klip Brugt</h2>
            <p style="margin-bottom: 0; color: #1e40af;">Hej ${data.userName}, et klip er blevet brugt fra dit klippekort.</p>
          </div>
          
          <div class="details">
            <div class="detail-item">
              <strong>Session</strong>
              ${data.sessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.sessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Klippekort</strong>
              ${data.punchCardName}
            </div>
          </div>
          
          <div class="highlight-box" style="text-align: center;">
            <div style="font-size: 48px; color: #502B30; font-weight: bold; margin-bottom: 10px;">${data.clipsRemaining}</div>
            <p style="margin: 0; color: #78350f; font-size: 18px;">klip tilbage</p>
          </div>
          
          ${data.clipsRemaining === 0 ? '<div class="warning-box"><p style="margin: 0;"><strong>⚠️ Dit klippekort er nu brugt op.</strong> Køb et nyt for at fortsætte med at booke sessioner.</p></div>' : ''}
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Klip brugt - ${data.sessionName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nEt klip er blevet brugt fra dit klippekort.\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime.substring(0, 5)}\n\nKlip tilbage: ${data.clipsRemaining}`,
    MessageStream: 'outbound'
  });
}

// Send punch card added notification
export async function sendPunchCardAdded(data: PunchCardAddedEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="margin-top: 0; color: #502B30;">Nyt Klippekort Tilføjet! 🎁</h2>
            <p style="margin-bottom: 0; color: #065f46;">Hej ${data.userName}, du har modtaget et nyt klippekort!</p>
          </div>
          
          <div class="details">
            <div class="detail-item">
              <strong>Klippekort</strong>
              ${data.punchCardName}
            </div>
            <div class="detail-item">
              <strong>Antal klip</strong>
              ${data.clips} klip
            </div>
            <div class="detail-item">
              <strong>Årsag</strong>
              ${data.reason}
            </div>
          </div>
          
          <div class="divider"></div>
          
          <p>Dit klippekort er nu aktivt og klar til brug. Du kan bruge det til at booke sessioner.</p>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">God gus! 🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Nyt klippekort tilføjet - ${data.punchCardName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nEt nyt klippekort er blevet tilføjet til din konto.\n\nKlippekort: ${data.punchCardName}\nAntal klip: ${data.clips}\nÅrsag: ${data.reason}`,
    MessageStream: 'outbound'
  });
}

// Send employee welcome email
export async function sendEmployeeWelcome(data: EmployeeWelcomeEmail) {
  const client = getPostmarkClient();
  
  const permissionsList = [];
  if (data.permissions.administration) permissionsList.push('Administrator');
  if (data.permissions.staff) permissionsList.push('Ledelse');
  if (data.permissions.gusmester) permissionsList.push('Gusmester');
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #faf8f5; }
        .header { background: linear-gradient(135deg, #502B30 0%, #5e3023 100%); color: #FFF5E1; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
        .header p { margin: 10px 0 0 0; color: #f59e0b; font-style: italic; }
        .content { background: #fff; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .welcome-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .credentials { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #502B30; }
        .credentials h3 { color: #502B30; margin-top: 0; }
        .credential-item { background: white; padding: 12px; margin: 10px 0; border-radius: 5px; border: 1px solid #e5e7eb; }
        .credential-item strong { color: #502B30; display: block; margin-bottom: 5px; }
        .credential-item code { background: #f3f4f6; padding: 8px 12px; display: block; border-radius: 4px; font-family: monospace; color: #1f2937; font-size: 14px; }
        .permissions { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .permissions h3 { color: #502B30; margin-top: 0; }
        .permission-badge { display: inline-block; background: #502B30; color: #FFF5E1; padding: 6px 12px; border-radius: 20px; margin: 5px; font-size: 14px; }
        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #502B30 0%, #5e3023 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(80, 43, 48, 0.3); }
        .button:hover { background: linear-gradient(135deg, #5e3023 0%, #502B30 100%); }
        .info-box { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 14px; }
        .footer strong { color: #502B30; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%); margin: 30px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="welcome-box">
            <h2 style="margin-top: 0; color: #502B30;">Velkommen til INIPI Teamet! 🎉</h2>
            <p style="margin-bottom: 0; color: #78350f;">Hej ${data.employeeName}, vi er glade for at have dig med!</p>
          </div>
          
          <p>Du er nu oprettet som medarbejder hos INIPI Saunagus. Din konto er klar, og du kan logge ind med nedenstående oplysninger.</p>
          
          <div class="credentials">
            <h3>🔐 Dine Login Oplysninger</h3>
            <div class="credential-item">
              <strong>Email:</strong>
              <code>${data.email}</code>
            </div>
            <div class="credential-item">
              <strong>Midlertidig Adgangskode:</strong>
              <code>${data.password}</code>
            </div>
          </div>
          
          <div class="info-box">
            <strong>⚠️ Vigtigt:</strong> Af sikkerhedsmæssige årsager anbefaler vi, at du ændrer din adgangskode efter første login. Gå til "Min Profil" for at opdatere den.
          </div>
          
          ${data.title ? `<p><strong>Din titel:</strong> ${data.title}</p>` : ''}
          
          <div class="permissions">
            <h3>✨ Dine Rettigheder</h3>
            <div>
              ${permissionsList.map(p => `<span class="permission-badge">${p}</span>`).join('')}
            </div>
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Hvad kan du gøre?</h3>
          <ul style="color: #4b5563;">
            ${data.permissions.administration ? '<li><strong>Administration:</strong> Opret og administrer sessioner, brugere, klippekort og indstillinger</li>' : ''}
            ${data.permissions.staff ? '<li><strong>Ledelse:</strong> Se alle bookinger og administrer deltagere på alle sessioner</li>' : ''}
            ${data.permissions.gusmester ? '<li><strong>Gusmester:</strong> Administrer dine egne sessioner og inviter gæster</li>' : ''}
            <li><strong>Min Profil:</strong> Opdater dine personlige oplysninger</li>
            <li><strong>Mine Hold:</strong> Se dine kommende sessioner</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="https://inipi.dk/login" class="button">Log Ind Nu →</a>
          </div>
          
          <div class="info-box">
            <strong>💡 Tip:</strong> Gem denne email et sikkert sted. Hvis du har spørgsmål eller brug for hjælp, er du altid velkommen til at kontakte administrationen.
          </div>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Velkommen til INIPI Teamet, ${data.employeeName}! 🔥`,
    HtmlBody: htmlBody,
    TextBody: `Velkommen til INIPI Teamet!\n\nHej ${data.employeeName},\n\nDu er nu oprettet som medarbejder hos INIPI Saunagus.\n\nDine login oplysninger:\nEmail: ${data.email}\nAdgangskode: ${data.password}\n\nLog ind på: https://inipi.dk/login\n\nHusk at ændre din adgangskode efter første login.\n\nVi glæder os til at arbejde sammen med dig!\n\nVenlig hilsen,\nINIPI Teamet`,
    MessageStream: 'outbound'
  });
}

// Send session reminder (24h before)
export async function sendSessionReminder(data: SessionReminderEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="warning-box">
            <h2 style="margin-top: 0; color: #502B30;">Påmindelse: Din Session Er I Morgen! ⏰</h2>
            <p style="margin-bottom: 0; color: #78350f; font-size: 18px;"><strong>Din session starter om ca. 24 timer!</strong></p>
          </div>
          
          <p>Hej ${data.userName}, vi glæder os til at se dig!</p>
          
          <div class="details">
            <div class="detail-item">
              <strong>Session</strong>
              ${data.sessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.sessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Lokation</strong>
              ${data.location}
            </div>
            <div class="detail-item">
              <strong>Antal pladser</strong>
              ${data.spots}
            </div>
          </div>
          
          <div class="info-box">
            <strong>Booking ID:</strong> ${data.bookingId}
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Husk at medbringe:</h3>
          <ul style="color: #4b5563;">
            <li>Håndklæde</li>
            <li>Vand (vi har også drikkevarer til salg)</li>
            <li>Godt humør! 😊</li>
          </ul>
          
          <div class="info-box">
            <strong>💡 Vigtigt:</strong> Hvis du ikke kan deltage, bedes du aflyse din booking så snart som muligt, så andre kan få pladsen.
          </div>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">Vi ses til gus! 🧖‍♂️🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Påmindelse: ${data.sessionName} i morgen kl. ${data.sessionTime.substring(0, 5)}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nPåmindelse: Din session starter om ca. 24 timer!\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime.substring(0, 5)}\nLokation: ${data.location}\nAntal pladser: ${data.spots}\n\nBooking ID: ${data.bookingId}\n\nHusk at medbringe håndklæde og vand.\n\nVi ses til gus!`,
    MessageStream: 'outbound'
  });
}

// Send payment failed notification
export async function sendPaymentFailed(data: PaymentFailedEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="error-box">
            <h2 style="margin-top: 0; color: #991b1b;">Betaling Mislykkedes ⚠️</h2>
            <p style="margin-bottom: 0; color: #991b1b;"><strong>Din betaling kunne ikke gennemføres.</strong></p>
          </div>
          
          <p>Hej ${data.userName}, desværre kunne vi ikke behandle din betaling for følgende booking:</p>
          
          <div class="details">
            <div class="detail-item">
              <strong>Session</strong>
              ${data.sessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.sessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Beløb</strong>
              ${data.amount} DKK
            </div>
            <div class="detail-item">
              <strong>Booking ID</strong>
              ${data.bookingId}
            </div>
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Hvad skal du gøre?</h3>
          <ul style="color: #4b5563;">
            <li>Tjek at dit kort har tilstrækkelige midler</li>
            <li>Kontakt din bank hvis problemet fortsætter</li>
            <li>Prøv at booke igen med et andet betalingskort</li>
            <li>Eller køb et klippekort og book med det</li>
          </ul>
          
          <div class="warning-box">
            <p style="margin: 0;"><strong>💡 Vigtigt:</strong> Din booking er ikke bekræftet før betalingen er gennemført.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="https://inipi.dk/sessions" class="button">Book Igen</a>
          </div>
          
          <p style="text-align: center;">Hvis du har spørgsmål, er du velkommen til at kontakte os.</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Betaling mislykkedes - ${data.sessionName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nDin betaling kunne ikke gennemføres.\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime.substring(0, 5)}\nBeløb: ${data.amount} DKK\n\nTjek dit kort og prøv igen, eller kontakt os for hjælp.`,
    MessageStream: 'outbound'
  });
}

// Send gusmester points earned notification
export async function sendGusmesterPointsEarned(data: GusmesterPointsEarnedEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⭐ INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="margin-top: 0; color: #502B30;">Du Har Optjent Point! 🎉</h2>
            <p style="margin-bottom: 0; color: #065f46;">Hej ${data.employeeName}, tillykke med dine nye gusmester point!</p>
          </div>
          
          <div class="highlight-box" style="text-align: center;">
            <div style="font-size: 64px; color: #502B30; font-weight: bold; margin-bottom: 10px;">+${data.pointsEarned}</div>
            <p style="margin: 0; color: #78350f; font-size: 24px; font-weight: bold;">Gusmester Point</p>
          </div>
          
          <div class="details">
            <div class="detail-item">
              <strong>Årsag</strong>
              ${data.reason}
            </div>
            <div class="detail-item">
              <strong>Session</strong>
              ${data.sessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Dine samlede point</strong>
              ${data.totalPoints} point
            </div>
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Sådan bruger du dine point:</h3>
          <ul style="color: #4b5563;">
            <li>Gå til Gusmester-siden</li>
            <li>Find en ledig gusmester plads</li>
            <li>Book med dine point (150 point pr. session)</li>
          </ul>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">Tak for din indsats som gusmester! 🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Du har optjent ${data.pointsEarned} gusmester point! ⭐`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.employeeName},\n\nDu har optjent ${data.pointsEarned} gusmester point!\n\nÅrsag: ${data.reason}\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\n\nDine samlede point: ${data.totalPoints}\n\nTak for din indsats!`,
    MessageStream: 'outbound'
  });
}

// Send private event confirmation (for theme bookings)
export async function sendPrivateEventConfirmation(data: PrivateEventConfirmationEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="margin-top: 0; color: #502B30;">Dit Private Event Er Bekræftet! 🎉</h2>
            <p style="margin-bottom: 0; color: #065f46;">Hej ${data.userName}, tak for din booking!</p>
          </div>
          
          <div class="highlight-box" style="text-align: center; padding: 30px;">
            <h2 style="margin: 0 0 10px 0; color: #502B30; font-size: 32px;">${data.themeName}</h2>
            <p style="margin: 0; color: #78350f; font-size: 18px; font-style: italic;">Din eksklusive saunagus oplevelse</p>
          </div>
          
          <p>Vi glæder os til at give dig og dine gæster en uforglemmelig oplevelse.</p>
          
          <div class="details">
            <div class="detail-item">
              <strong>Tema</strong>
              ${data.themeName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.sessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Lokation</strong>
              ${data.location}
            </div>
            <div class="detail-item">
              <strong>Antal pladser</strong>
              ${data.spots} pladser (privat event)
            </div>
            <div class="detail-item">
              <strong>Total pris</strong>
              ${data.totalPrice} DKK
            </div>
          </div>
          
          <div class="info-box">
            <strong>Booking ID:</strong> ${data.bookingId}
          </div>
          
          <div class="warning-box">
            <p style="margin: 0;"><strong>💡 Vigtigt:</strong> Dette er et privat event. Alle ${data.spots} pladser er reserveret til dig og dine gæster.</p>
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Hvad sker der nu?</h3>
          <ul style="color: #4b5563;">
            <li>Du vil modtage en påmindelse 24 timer før eventet</li>
            <li>Husk at informere dine gæster om dato og tidspunkt</li>
            <li>Alle skal medbringe håndklæde</li>
            <li>Vi sørger for resten! 🔥</li>
          </ul>
          
          <div class="info-box">
            <strong>Aflysning:</strong> Private events kan aflyses op til 48 timer før start for fuld refusion eller kompensation.
          </div>
          
          <p style="text-align: center;">Hvis du har spørgsmål eller særlige ønsker til dit event, er du velkommen til at kontakte os.</p>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">Vi glæder os til at se dig og dine gæster! 🧖‍♂️🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Private Event Bekræftet - ${data.themeName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nDit private event er bekræftet!\n\nTema: ${data.themeName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime.substring(0, 5)}\nLokation: ${data.location}\nAntal pladser: ${data.spots}\nTotal pris: ${data.totalPrice} DKK\n\nBooking ID: ${data.bookingId}\n\nVi glæder os til at se dig og dine gæster!`,
    MessageStream: 'outbound'
  });
}

// Send seats added confirmation (for adding seats to private events)
export async function sendSeatsAddedConfirmation(data: SeatsAddedConfirmationEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="margin-top: 0; color: #502B30;">Ekstra Pladser Tilføjet! ✅</h2>
            <p style="margin-bottom: 0; color: #065f46;">Hej ${data.userName}, dine ekstra pladser er bekræftet!</p>
          </div>
          
          <p>Vi har tilføjet <strong>${data.additionalSeats} ekstra pladser</strong> til din private saunagus. Din betaling er modtaget, og din reservation er nu opdateret.</p>
          
          <div class="highlight-box" style="text-align: center;">
            <h2 style="margin: 0 0 10px 0; color: #502B30; font-size: 28px;">${data.themeName}</h2>
            <p style="margin: 0; color: #78350f; font-size: 16px;">Nu med plads til ${data.newTotalSeats} personer</p>
          </div>
          
          <div class="details">
            <div class="detail-item">
              <strong>Tema</strong>
              ${data.themeName}
            </div>
            <div class="detail-item">
              <strong>Session</strong>
              ${data.sessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.sessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.sessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Lokation</strong>
              ${data.location}
            </div>
            <div class="detail-item">
              <strong>Antal pladser i alt</strong>
              ${data.newTotalSeats} personer
            </div>
          </div>
          
          <div class="divider"></div>
          
          <h3 style="color: #502B30;">Betaling for ekstra pladser</h3>
          <div class="details">
            <div class="detail-item">
              <strong>Ekstra pladser</strong>
              ${data.additionalSeats} personer
            </div>
            <div class="detail-item">
              <strong>Pris pr. person</strong>
              ${data.pricePerSeat.toFixed(2)} DKK
            </div>
            <div class="detail-item">
              <strong>Betalt beløb</strong>
              ${data.amount.toFixed(2)} DKK
            </div>
          </div>
          
          <div class="info-box">
            <strong>Kvitteringsnr:</strong> ${data.invoiceNumber}
          </div>
          
          <div class="divider"></div>
          
          <p>Du kan se din opdaterede reservation og kvittering under <strong>"Mine hold"</strong> på vores hjemmeside.</p>
          
          <div style="text-align: center;">
            <a href="https://inipi.dk/mine-hold" class="button">Se Mine Hold →</a>
          </div>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">Vi glæder os til at se dig og alle dine gæster! 🧖‍♂️🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Ekstra pladser tilføjet - ${data.themeName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nVi har tilføjet ${data.additionalSeats} ekstra pladser til din private saunagus.\n\nTema: ${data.themeName}\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime.substring(0, 5)}\nLokation: ${data.location}\nAntal pladser i alt: ${data.newTotalSeats}\n\nBetaling:\nEkstra pladser: ${data.additionalSeats}\nPris pr. person: ${data.pricePerSeat.toFixed(2)} DKK\nBetalt beløb: ${data.amount.toFixed(2)} DKK\n\nKvitteringsnr: ${data.invoiceNumber}\n\nVi glæder os til at se dig og alle dine gæster!`,
    MessageStream: 'outbound'
  });
}

// Send booking moved notification
export async function sendBookingMoved(data: BookingMovedEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI</h1>
          <p>"Kom som du er, gå hjem som dig selv"</p>
        </div>
        <div class="content">
          <div class="info-box">
            <h2 style="margin-top: 0; color: #502B30;">Din Booking Er Blevet Flyttet 📅</h2>
            <p style="margin-bottom: 0; color: #1e40af;">Hej ${data.userName}, din booking er blevet flyttet til en ny tid.</p>
          </div>
          
          <p>Din booking er blevet flyttet af personalet. Se de nye detaljer nedenfor:</p>
          
          <div class="warning-box">
            <p style="margin: 0;"><strong>Årsag:</strong> ${data.reason}</p>
          </div>

          <div class="divider"></div>

          <h3 style="color: #502B30;">Ny Session</h3>
          <div class="details">
            <div class="detail-item">
              <strong>Session</strong>
              ${data.newSessionName}
            </div>
            <div class="detail-item">
              <strong>Ny Dato</strong>
              ${data.newSessionDate}
            </div>
            <div class="detail-item">
              <strong>Ny Tid</strong>
              ${data.newSessionTime.substring(0, 5)}
            </div>
            <div class="detail-item">
              <strong>Lokation</strong>
              ${data.location}
            </div>
            <div class="detail-item">
              <strong>Antal pladser</strong>
              ${data.spots}
            </div>
          </div>

          <div class="divider"></div>

          <h3 style="color: #502B30;">Tidligere Session</h3>
          <div class="details" style="opacity: 0.6;">
            <div class="detail-item">
              <strong>Session</strong>
              ${data.oldSessionName}
            </div>
            <div class="detail-item">
              <strong>Dato</strong>
              ${data.oldSessionDate}
            </div>
            <div class="detail-item">
              <strong>Tid</strong>
              ${data.oldSessionTime.substring(0, 5)}
            </div>
          </div>
          
          <div class="info-box">
            <strong>Booking ID:</strong> ${data.bookingId}
          </div>
          
          <div class="divider"></div>
          
          <p>Hvis du har spørgsmål til denne ændring, er du velkommen til at kontakte os.</p>
          
          <p style="text-align: center; font-size: 18px; color: #502B30; font-weight: bold;">Vi ses til gus! 🧖‍♂️🔥</p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: data.to,
    Subject: `Booking flyttet - ${data.newSessionName}`,
    HtmlBody: htmlBody,
    TextBody: `Hej ${data.userName},\n\nDin booking er blevet flyttet til en ny tid.\n\nÅrsag: ${data.reason}\n\nNy session:\nSession: ${data.newSessionName}\nDato: ${data.newSessionDate}\nTid: ${data.newSessionTime}\nLokation: ${data.location}\nAntal pladser: ${data.spots}\n\nTidligere session:\nSession: ${data.oldSessionName}\nDato: ${data.oldSessionDate}\nTid: ${data.oldSessionTime}\n\nBooking ID: ${data.bookingId}\n\nVi ses til gus!`,
    MessageStream: 'outbound'
  });
}

/**
 * Send contact form submission to mail@inipi.dk
 */
export async function sendContactForm(data: ContactFormEmail): Promise<void> {
  const client = getPostmarkClient();

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${PREMIUM_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Ny Kontaktformular</h1>
          <p>Fra INIPI Website</p>
        </div>
        <div class="content">
          <div class="highlight-box">
            <h2 style="margin: 0 0 10px 0; color: #502B30;">Besked fra ${data.name}</h2>
          </div>

          <div class="details">
            <div class="detail-item">
              <strong>Navn:</strong>
              ${data.name}
            </div>
            <div class="detail-item">
              <strong>Email:</strong>
              <a href="mailto:${data.email}" style="color: #502B30;">${data.email}</a>
            </div>
            ${data.phone ? `
            <div class="detail-item">
              <strong>Telefon:</strong>
              <a href="tel:${data.phone}" style="color: #502B30;">${data.phone}</a>
            </div>
            ` : ''}
          </div>

          <div class="info-box">
            <strong style="color: #1e40af; display: block; margin-bottom: 10px;">Besked:</strong>
            <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
          </div>

          <div class="divider"></div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Denne besked blev sendt via kontaktformularen på inipi.dk
          </p>
        </div>
        <div class="footer">
          <strong>INIPI Saunagus</strong><br>
          Havkajakvej, Amagerstrand<br>
          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.sendEmail({
    From: 'noreply@inipi.dk',
    To: 'mail@inipi.dk',
    ReplyTo: data.email,
    Subject: `Kontaktformular: ${data.name}`,
    HtmlBody: htmlBody,
    TextBody: `Ny besked fra kontaktformularen\n\nNavn: ${data.name}\nEmail: ${data.email}${data.phone ? `\nTelefon: ${data.phone}` : ''}\n\nBesked:\n${data.message}\n\n---\nDenne besked blev sendt via kontaktformularen på inipi.dk`,
    MessageStream: 'outbound'
  });
}
