import { NextRequest, NextResponse } from 'next/server';
import { sendPunchCardAdded } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const { punchCardId, reason } = await request.json();

    if (!punchCardId) {
      return NextResponse.json({ error: 'Punch card ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get punch card details
    const { data: punchCard, error: punchCardError } = await supabase
      .from('punch_cards')
      .select('*')
      .eq('id', punchCardId)
      .single();

    if (punchCardError || !punchCard) {
      return NextResponse.json({ error: 'Punch card not found' }, { status: 404 });
    }

    // Get user info - check both profiles and employees tables
    let userEmail: string | null = null;
    let userName: string | null = null;

    // Try profiles table first
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', punchCard.user_id)
      .single();

    if (profile && profile.email) {
      userEmail = profile.email;
      userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    } else {
      // Try employees table
      const { data: employee } = await supabase
        .from('employees')
        .select('email, name')
        .eq('id', punchCard.user_id)
        .single();

      if (employee && employee.email) {
        userEmail = employee.email;
        userName = employee.name;
      }
    }

    if (!userEmail) {
      console.error('No email found for user:', punchCard.user_id);
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Send email
    await sendPunchCardAdded({
      to: userEmail,
      userName: userName || 'Medlem',
      punchCardName: punchCard.name,
      clips: punchCard.total_punches,
      reason: reason || 'Administrativt tilføjet',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending punch card added email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

