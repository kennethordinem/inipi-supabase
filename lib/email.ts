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

// Send booking confirmation
export async function sendBookingConfirmation(data: BookingConfirmationEmail) {
  const client = getPostmarkClient();
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #502B30; color: #FFF5E1; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #502B30; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #502B30; margin: 20px 0; }
        .details strong { color: #502B30; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI Saunagus</h1>
        </div>
        <div class="content">
          <h2>Booking Bekræftet!</h2>
          <p>Hej ${data.userName},</p>
          <p>Din booking er bekræftet. Vi glæder os til at se dig!</p>
          
          <div class="details">
            <strong>Session:</strong> ${data.sessionName}<br>
            <strong>Dato:</strong> ${data.sessionDate}<br>
            <strong>Tid:</strong> ${data.sessionTime}<br>
            <strong>Lokation:</strong> ${data.location}<br>
            <strong>Antal pladser:</strong> ${data.spots}<br>
            <strong>Betaling:</strong> ${data.paymentMethod === 'punch_card' ? 'Klippekort' : data.price + ' DKK'}
          </div>
          
          <p><strong>Booking ID:</strong> ${data.bookingId}</p>
          
          <p>Husk at møde op i god tid og medbringe håndklæde.</p>
          
          <p>Hvis du har spørgsmål, er du velkommen til at kontakte os.</p>
          
          <p>Vi ses til gus! 🧖‍♂️</p>
        </div>
        <div class="footer">
          <p>INIPI Saunagus<br>
          Havkajakvej, Amagerstrand</p>
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
    TextBody: `Hej ${data.userName},\n\nDin booking er bekræftet!\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime}\nLokation: ${data.location}\nAntal pladser: ${data.spots}\n\nBooking ID: ${data.bookingId}\n\nVi ses til gus!`,
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
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #502B30; color: #FFF5E1; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #502B30; margin: 20px 0; }
        .details strong { color: #502B30; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 INIPI Saunagus</h1>
        </div>
        <div class="content">
          <h2>Booking Aflyst</h2>
          <p>Hej ${data.userName},</p>
          <p>Din booking er blevet aflyst.</p>
          
          <div class="details">
            <strong>Session:</strong> ${data.sessionName}<br>
            <strong>Dato:</strong> ${data.sessionDate}<br>
            <strong>Tid:</strong> ${data.sessionTime}<br>
            <strong>Refusion:</strong> ${data.refundInfo}
          </div>
          
          ${data.punchCardAdded ? '<p><strong>✅ Et klip er blevet tilføjet til dit klippekort som kompensation.</strong></p>' : ''}
          
          <p>Vi håber at se dig til en anden session!</p>
        </div>
        <div class="footer">
          <p>INIPI Saunagus<br>
          Havkajakvej, Amagerstrand</p>
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
    TextBody: `Hej ${data.userName},\n\nDin booking er blevet aflyst.\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime}\nRefusion: ${data.refundInfo}\n\n${data.punchCardAdded ? 'Et klip er blevet tilføjet til dit klippekort som kompensation.' : ''}`,
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
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #502B30; color: #FFF5E1; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #502B30; margin: 20px 0; }
        .details strong { color: #502B30; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 INIPI Klippekort</h1>
        </div>
        <div class="content">
          <h2>Klippekort Købt!</h2>
          <p>Hej ${data.userName},</p>
          <p>Tak for dit køb! Dit klippekort er nu aktivt og klar til brug.</p>
          
          <div class="details">
            <strong>Klippekort:</strong> ${data.punchCardName}<br>
            <strong>Antal klip:</strong> ${data.clips}<br>
            <strong>Pris:</strong> ${data.price} DKK<br>
            <strong>Købsdato:</strong> ${data.purchaseDate}
          </div>
          
          <p>Du kan nu bruge dit klippekort til at booke sessioner.</p>
          <p>Se dine klippekort i din profil under "Klippekort".</p>
        </div>
        <div class="footer">
          <p>INIPI Saunagus<br>
          Havkajakvej, Amagerstrand</p>
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
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #502B30; color: #FFF5E1; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #502B30; margin: 20px 0; }
        .details strong { color: #502B30; }
        .clips-remaining { font-size: 24px; color: #502B30; font-weight: bold; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 INIPI Klippekort</h1>
        </div>
        <div class="content">
          <h2>Klip Brugt</h2>
          <p>Hej ${data.userName},</p>
          <p>Et klip er blevet brugt fra dit klippekort.</p>
          
          <div class="details">
            <strong>Session:</strong> ${data.sessionName}<br>
            <strong>Dato:</strong> ${data.sessionDate}<br>
            <strong>Tid:</strong> ${data.sessionTime}<br>
            <strong>Klippekort:</strong> ${data.punchCardName}
          </div>
          
          <div class="clips-remaining">
            ${data.clipsRemaining} klip tilbage
          </div>
          
          ${data.clipsRemaining === 0 ? '<p><strong>⚠️ Dit klippekort er nu brugt op. Køb et nyt for at fortsætte med at booke sessioner.</strong></p>' : ''}
        </div>
        <div class="footer">
          <p>INIPI Saunagus<br>
          Havkajakvej, Amagerstrand</p>
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
    TextBody: `Hej ${data.userName},\n\nEt klip er blevet brugt fra dit klippekort.\n\nSession: ${data.sessionName}\nDato: ${data.sessionDate}\nTid: ${data.sessionTime}\n\nKlip tilbage: ${data.clipsRemaining}`,
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
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #502B30; color: #FFF5E1; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #502B30; margin: 20px 0; }
        .details strong { color: #502B30; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 INIPI Klippekort</h1>
        </div>
        <div class="content">
          <h2>Nyt Klippekort Tilføjet!</h2>
          <p>Hej ${data.userName},</p>
          <p>Et nyt klippekort er blevet tilføjet til din konto.</p>
          
          <div class="details">
            <strong>Klippekort:</strong> ${data.punchCardName}<br>
            <strong>Antal klip:</strong> ${data.clips}<br>
            <strong>Årsag:</strong> ${data.reason}
          </div>
          
          <p>Du kan nu bruge dit klippekort til at booke sessioner.</p>
        </div>
        <div class="footer">
          <p>INIPI Saunagus<br>
          Havkajakvej, Amagerstrand</p>
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

