import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmployeeWelcome } from '@/lib/email';

// Helper to get admin client (created on demand)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      isEmployee,
      employeeName,
      employeeTitle,
      permissions
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for test users
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || ''
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // Profile is auto-created by trigger, but we can update it if needed
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the request, profile might not exist yet due to trigger timing
    }

    // If employee, create employee record
    if (isEmployee) {
      const { error: employeeError } = await supabaseAdmin
        .from('employees')
        .insert({
          user_id: userId,
          name: employeeName || `${firstName} ${lastName}`,
          email: email,
          title: employeeTitle || '',
          points: 300, // Start with 300 points
          frontend_permissions: {
            gusmester: permissions?.gusmester || false,
            staff: permissions?.staff || false,
            administration: permissions?.administration || false
          },
          status: 'active'
        });

      if (employeeError) {
        console.error('Error creating employee:', employeeError);
        return NextResponse.json(
          { error: `User created but employee record failed: ${employeeError.message}` },
          { status: 500 }
        );
      }

      // Send welcome email to new employee
      try {
        await sendEmployeeWelcome({
          to: email,
          employeeName: employeeName || `${firstName} ${lastName}`,
          email: email,
          password: password,
          title: employeeTitle || undefined,
          permissions: {
            staff: permissions?.staff || false,
            gusmester: permissions?.gusmester || false,
            administration: permissions?.administration || false
          }
        });
        console.log('Welcome email sent to:', email);
      } catch (emailError: any) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      email,
      message: 'User created successfully'
    });

  } catch (error: any) {
    console.error('Error in create-user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

