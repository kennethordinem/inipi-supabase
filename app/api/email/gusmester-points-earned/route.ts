import { NextRequest, NextResponse } from 'next/server';
import { sendGusmesterPointsEarned } from '@/lib/email';
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
    const { employeeId, pointsEarned, sessionId, reason } = await request.json();

    if (!employeeId || !pointsEarned || !sessionId) {
      return NextResponse.json({ error: 'Employee ID, points, and session ID are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('email, name, gusmester_points')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!employee.email) {
      console.error('No email found for employee:', employeeId);
      return NextResponse.json({ error: 'Employee email not found' }, { status: 404 });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('name, date')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Format date
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email
    await sendGusmesterPointsEarned({
      to: employee.email,
      employeeName: employee.name,
      pointsEarned,
      totalPoints: employee.gusmester_points || 0,
      sessionName: session.name,
      sessionDate: formattedDate,
      reason: reason || 'Hosted session',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending gusmester points earned email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
