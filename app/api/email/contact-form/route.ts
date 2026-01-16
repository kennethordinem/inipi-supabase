import { NextRequest, NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, message } = await request.json();

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Navn, email og besked er påkrævet' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ugyldig email adresse' },
        { status: 400 }
      );
    }

    // Send email to mail@inipi.dk
    await sendContactForm({
      name,
      email,
      phone,
      message,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Contact-Form] Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Kunne ikke sende besked' },
      { status: 500 }
    );
  }
}
