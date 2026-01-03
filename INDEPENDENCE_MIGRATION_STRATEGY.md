# INIPI Independence & Supabase Migration Strategy

**Date:** January 3, 2026  
**Project:** INIPI (Sauna Business)  
**Goal:** Make INIPI independent from Clinio health sector codebase

---

## EXECUTIVE SUMMARY

INIPI is currently tightly integrated with Clinio's Firebase infrastructure, using 31 Cloud Functions and sharing the same Firestore database. This document outlines a strategy to make INIPI fully independent and migrate from Firebase to Supabase.

**Key Findings:**
- ✅ **Feasible:** INIPI can be made independent
- ⚠️ **Complex:** Requires significant refactoring (estimated 40-60 hours)
- 💰 **Cost Effective:** Supabase is cheaper than Firebase at scale
- 🎯 **Recommended:** Proceed with phased migration approach

---

## CURRENT DEPENDENCIES

### 1. Firebase Cloud Functions (31 endpoints)

INIPI depends on these Clinio Cloud Functions:

#### **Public Endpoints** (No Auth Required)
1. `getMembersConfig` - Get clinic configuration
2. `getMembersClasses` - List available sessions
3. `getMembersSessionDetails` - Get session details
4. `getMembersGroupTypes` - Get session type filters
5. `getMembersShopProducts` - Get shop products
6. `getMembersShopPunchCards` - Get available punch cards

#### **Member Endpoints** (Auth Required)
7. `membersRegister` - Register new member
8. `getMembersMyBookings` - Get my bookings
9. `getMembersPunchCards` - Get my punch cards
10. `getMembersPunchCardHistory` - Get punch card usage history
11. `getMembersProfile` - Get member profile
12. `updateMembersProfile` - Update member profile
13. `getMembersPaymentHistory` - Get payment history
14. `memberBookSession` - Book a session
15. `memberCancelBooking` - Cancel booking
16. `createConnectPaymentIntent` - Create Stripe payment
17. `fixMemberAccess` - Migration helper (temporary)

#### **Employee (Gusmester) Endpoints**
18. `checkIfMemberIsEmployee` - Check employee status & permissions
19. `getEmployeeStats` - Get employee points/stats
20. `getAvailableGusmesterSpots` - Get available employee spots
21. `getMyGusmesterBookings` - Get my employee bookings
22. `bookGusmesterSpot` - Book employee spot
23. `cancelGusmesterBooking` - Cancel employee booking
24. `getMyHostingSessions` - Get sessions I'm hosting
25. `releaseGuestSpot` - Release guest spot to public
26. `bookGuestForSession` - Book guest for session

#### **Staff Management Endpoints**
27. `getStaffSessions` - Get all sessions with participants
28. `getStaffSessionParticipants` - Get detailed participant list

#### **Administration Endpoints**
29. `getAdminMembers` - Get all members (paginated)
30. `getAdminMemberDetails` - Get detailed member info
31. `adminCancelBooking` - Admin cancel booking with punch card handling
32. `adminMoveBooking` - Admin move booking to another session

### 2. Firebase Authentication
- Email/password authentication
- User management
- Session handling

### 3. Firestore Database
INIPI reads/writes to these Firestore collections:

```
/clinics/{clinicId}/
  ├── groupSessions/          # Sauna sessions
  ├── groupAppointmentTypes/  # Session types (e.g., "Saunagus")
  ├── appointments/           # Individual bookings
  ├── patients/               # Members/customers
  │   └── punchCards/         # Punch cards per member
  │       └── usageLog/       # Usage history
  ├── employees/              # Staff members
  └── adminLogs/              # Admin action audit trail
```

### 4. Clinio Members SDK
- TypeScript SDK wrapper
- Firebase initialization
- Type definitions
- Error handling

---

## MIGRATION OPTIONS

### Option A: Keep Firebase, Make Functions Independent ⭐ RECOMMENDED

**Approach:** Copy all 31 Cloud Functions to INIPI's own Firebase project

**Pros:**
- ✅ Minimal code changes
- ✅ Faster migration (2-3 weeks)
- ✅ Keep existing SDK structure
- ✅ No database migration needed
- ✅ Firebase Auth already works

**Cons:**
- ❌ Still dependent on Firebase ecosystem
- ❌ Firebase costs can be high at scale
- ❌ Vendor lock-in continues

**Estimated Effort:** 20-30 hours

**Steps:**
1. Create new Firebase project for INIPI
2. Copy all 31 Cloud Functions to new project
3. Migrate Firestore data (export/import)
4. Update Firebase config in INIPI
5. Update SDK to point to new functions
6. Test all endpoints
7. Deploy and switch over

---

### Option B: Migrate to Supabase ⭐⭐ BEST LONG-TERM

**Approach:** Replace Firebase with Supabase (Postgres + REST API)

**Pros:**
- ✅ Open source (no vendor lock-in)
- ✅ Cheaper at scale
- ✅ SQL database (better for complex queries)
- ✅ Built-in REST API
- ✅ Real-time subscriptions
- ✅ Better admin tools
- ✅ Row Level Security (RLS)
- ✅ Can self-host if needed

**Cons:**
- ❌ Requires complete rewrite of all 31 functions
- ❌ Database schema redesign
- ❌ More complex migration (6-8 weeks)
- ❌ Learning curve for team

**Estimated Effort:** 40-60 hours

**Cost Comparison:**
```
Firebase (at 10,000 users):
- Cloud Functions: $50-100/month
- Firestore: $50-150/month
- Auth: Free
- Total: $100-250/month

Supabase (at 10,000 users):
- Pro Plan: $25/month
- Additional compute: $10-20/month
- Total: $35-45/month

Savings: ~$65-205/month
```

---

## RECOMMENDED APPROACH: PHASED MIGRATION

### Phase 1: Create Independent Firebase Project (Week 1-2)
**Goal:** Make INIPI independent from Clinio

1. **Create new Firebase project** for INIPI
2. **Copy Cloud Functions** (all 31 endpoints)
3. **Migrate data structure** (keep only INIPI-relevant data)
4. **Update INIPI config** to use new Firebase project
5. **Test thoroughly**
6. **Deploy to production**

**Deliverables:**
- ✅ INIPI runs on own Firebase project
- ✅ No dependency on Clinio codebase
- ✅ Can be updated independently

---

### Phase 2: Prepare Supabase Migration (Week 3-4)
**Goal:** Design new architecture

1. **Design Postgres schema**
2. **Create Supabase project**
3. **Set up Row Level Security policies**
4. **Create Edge Functions** (Supabase equivalent of Cloud Functions)
5. **Build new SDK** for Supabase
6. **Create migration scripts**

**Deliverables:**
- ✅ Complete database schema
- ✅ All security policies defined
- ✅ New SDK ready
- ✅ Migration scripts tested

---

### Phase 3: Migrate to Supabase (Week 5-6)
**Goal:** Switch from Firebase to Supabase

1. **Migrate authentication** (Firebase Auth → Supabase Auth)
2. **Migrate database** (Firestore → Postgres)
3. **Deploy Edge Functions**
4. **Update INIPI frontend** to use new SDK
5. **Run parallel systems** for testing
6. **Switch over to Supabase**
7. **Monitor and fix issues**

**Deliverables:**
- ✅ INIPI fully on Supabase
- ✅ All features working
- ✅ Firebase project can be shut down

---

## SUPABASE ARCHITECTURE DESIGN

### Database Schema (Postgres)

```sql
-- Clinic configuration
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unique_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session types (e.g., "Saunagus", "Yoga")
CREATE TABLE group_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  duration INTEGER DEFAULT 60,
  price DECIMAL(10,2),
  is_private BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (individual sauna sessions)
CREATE TABLE group_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  group_type_id UUID REFERENCES group_types(id),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER DEFAULT 60,
  location TEXT,
  capacity INTEGER DEFAULT 10,
  status TEXT DEFAULT 'scheduled',
  employee_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members/Customers
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  cpr TEXT,
  address JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, email)
);

-- Employees (staff members)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, email)
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  session_id UUID REFERENCES group_sessions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  spots INTEGER DEFAULT 1,
  status TEXT DEFAULT 'scheduled',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_amount DECIMAL(10,2),
  payment_intent_id TEXT,
  punch_card_id UUID REFERENCES punch_cards(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancellation_reason TEXT
);

-- Punch Cards
CREATE TABLE punch_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_punches INTEGER NOT NULL,
  remaining_punches INTEGER NOT NULL,
  price DECIMAL(10,2),
  group_types UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Punch Card Usage Log
CREATE TABLE punch_card_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  punch_card_id UUID REFERENCES punch_cards(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  action TEXT NOT NULL, -- 'used', 'restored', 'created_from_cancellation'
  spots_used INTEGER,
  session_name TEXT,
  session_date DATE,
  session_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Gusmester Bookings
CREATE TABLE gusmester_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  session_id UUID REFERENCES group_sessions(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  point_cost INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- Admin Action Logs
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES employees(id),
  performed_by_name TEXT,
  target_member_id UUID REFERENCES members(id),
  booking_id UUID REFERENCES bookings(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_clinic_date ON group_sessions(clinic_id, date);
CREATE INDEX idx_bookings_member ON bookings(member_id);
CREATE INDEX idx_bookings_session ON bookings(session_id);
CREATE INDEX idx_punch_cards_member ON punch_cards(member_id);
CREATE INDEX idx_employees_clinic ON employees(clinic_id);
CREATE INDEX idx_members_clinic_email ON members(clinic_id, email);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;

-- Public read access to clinics, sessions, and types
CREATE POLICY "Public can read clinics"
  ON clinics FOR SELECT
  USING (true);

CREATE POLICY "Public can read group types"
  ON group_types FOR SELECT
  USING (status = 'active');

CREATE POLICY "Public can read sessions"
  ON group_sessions FOR SELECT
  USING (status = 'scheduled' AND date >= CURRENT_DATE);

-- Members can read their own data
CREATE POLICY "Members can read own profile"
  ON members FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Members can read their own bookings
CREATE POLICY "Members can read own bookings"
  ON bookings FOR SELECT
  USING (member_id IN (
    SELECT id FROM members WHERE auth_user_id = auth.uid()
  ));

-- Members can create bookings
CREATE POLICY "Members can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE auth_user_id = auth.uid()
  ));

-- Members can read their own punch cards
CREATE POLICY "Members can read own punch cards"
  ON punch_cards FOR SELECT
  USING (member_id IN (
    SELECT id FROM members WHERE auth_user_id = auth.uid()
  ));

-- Employees can read all data in their clinic
CREATE POLICY "Employees can read clinic data"
  ON bookings FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM employees WHERE auth_user_id = auth.uid()
  ));

-- Admins have full access (checked via custom claims)
CREATE POLICY "Admins have full access"
  ON bookings FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR
    auth.jwt() ->> 'role' = 'employee'
  );
```

### Supabase Edge Functions

Replace Firebase Cloud Functions with Supabase Edge Functions (Deno):

```typescript
// supabase/functions/get-sessions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { uniqueId, startDate, endDate, typeFilter } = await req.json()
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )
  
  // Get clinic by uniqueId
  const { data: clinic } = await supabaseClient
    .from('clinics')
    .select('id')
    .eq('unique_id', uniqueId)
    .single()
  
  if (!clinic) {
    return new Response(
      JSON.stringify({ error: 'Clinic not found' }),
      { status: 404 }
    )
  }
  
  // Get sessions
  let query = supabaseClient
    .from('group_sessions')
    .select(`
      *,
      group_type:group_types(*),
      employee:employees(name),
      bookings(spots)
    `)
    .eq('clinic_id', clinic.id)
    .eq('status', 'scheduled')
    .gte('date', startDate || new Date().toISOString())
    .order('date', { ascending: true })
  
  if (typeFilter) {
    query = query.eq('group_type_id', typeFilter)
  }
  
  const { data: sessions, error } = await query
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
  
  // Calculate available spots
  const sessionsWithAvailability = sessions.map(session => {
    const bookedSpots = session.bookings.reduce((sum, b) => sum + b.spots, 0)
    return {
      ...session,
      currentParticipants: session.bookings.length,
      availableSpots: session.capacity - bookedSpots
    }
  })
  
  return new Response(
    JSON.stringify({ sessions: sessionsWithAvailability }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

### New SDK for Supabase

```typescript
// lib/inipi-client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class InipiClient {
  private supabase: SupabaseClient
  private uniqueId: string
  
  constructor(config: { uniqueId: string; supabaseUrl: string; supabaseKey: string }) {
    this.uniqueId = config.uniqueId
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey)
  }
  
  // Authentication
  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }
  
  async register(email: string, password: string, profile: any) {
    // 1. Create auth user
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password
    })
    if (authError) throw authError
    
    // 2. Create member profile
    const { data: clinic } = await this.supabase
      .from('clinics')
      .select('id')
      .eq('unique_id', this.uniqueId)
      .single()
    
    const { data: member, error: memberError } = await this.supabase
      .from('members')
      .insert({
        clinic_id: clinic.id,
        auth_user_id: authData.user.id,
        email,
        ...profile
      })
      .select()
      .single()
    
    if (memberError) throw memberError
    return { user: authData.user, member }
  }
  
  async logout() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }
  
  // Sessions
  async getSessions(filters?: { startDate?: string; endDate?: string; typeFilter?: string }) {
    const { data, error } = await this.supabase.functions.invoke('get-sessions', {
      body: { uniqueId: this.uniqueId, ...filters }
    })
    if (error) throw error
    return data
  }
  
  // Bookings
  async bookSession(sessionId: string, spots: number, paymentMethod: string, punchCardId?: string) {
    const { data, error } = await this.supabase.functions.invoke('book-session', {
      body: { uniqueId: this.uniqueId, sessionId, spots, paymentMethod, punchCardId }
    })
    if (error) throw error
    return data
  }
  
  async getMyBookings() {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    
    const { data: member } = await this.supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        session:group_sessions(*),
        punch_card:punch_cards(name)
      `)
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  // ... all other methods
}
```

---

## COST-BENEFIT ANALYSIS

### Development Costs

| Option | Estimated Hours | Cost @ $100/hr |
|--------|----------------|----------------|
| Option A: Independent Firebase | 20-30 hours | $2,000-3,000 |
| Option B: Migrate to Supabase | 40-60 hours | $4,000-6,000 |

### Monthly Operating Costs (at 10,000 users)

| Service | Firebase | Supabase | Savings |
|---------|----------|----------|---------|
| Database | $50-150 | $25 (included) | $25-125 |
| Functions/Edge | $50-100 | $0-20 | $30-100 |
| Auth | $0 | $0 (included) | $0 |
| Storage | $20-50 | $10 (included) | $10-40 |
| **Total** | **$120-300** | **$25-45** | **$75-255** |

### Break-Even Analysis

```
Additional dev cost for Supabase: $2,000-3,000
Monthly savings: $75-255

Break-even: 8-40 months (depending on scale)

At 10,000 users: ~12 months
At 50,000 users: ~6 months
```

---

## RISKS & MITIGATION

### Risk 1: Data Loss During Migration
**Mitigation:**
- Run parallel systems during migration
- Export all Firebase data before migration
- Test migration scripts on copy of production data
- Keep Firebase project active for 3 months after migration

### Risk 2: Downtime During Switchover
**Mitigation:**
- Use blue-green deployment
- Migrate during low-traffic hours
- Have rollback plan ready
- Monitor closely for 48 hours after switch

### Risk 3: Missing Features in Supabase
**Mitigation:**
- Audit all Firebase features used
- Test Supabase equivalents before committing
- Build custom solutions for any gaps
- Keep Firebase as fallback option

### Risk 4: Team Learning Curve
**Mitigation:**
- Provide Supabase training
- Create comprehensive documentation
- Start with small features first
- Have expert support available

---

## TIMELINE

### Option A: Independent Firebase (3 weeks)

**Week 1: Setup**
- Create new Firebase project
- Copy Cloud Functions
- Set up CI/CD

**Week 2: Migration**
- Migrate Firestore data
- Update INIPI config
- Test all features

**Week 3: Deployment**
- Deploy to production
- Monitor and fix issues
- Documentation

### Option B: Supabase Migration (8 weeks)

**Week 1-2: Phase 1 (Independent Firebase)**
- Same as Option A

**Week 3-4: Phase 2 (Supabase Prep)**
- Design database schema
- Create Supabase project
- Build new SDK
- Write Edge Functions

**Week 5-6: Phase 3 (Migration)**
- Migrate authentication
- Migrate database
- Deploy Edge Functions
- Update frontend

**Week 7-8: Phase 4 (Testing & Launch)**
- Run parallel systems
- Fix bugs
- Switch over
- Monitor

---

## RECOMMENDATION

### Immediate Action (Next 3 weeks):
✅ **Execute Option A** - Make INIPI independent with its own Firebase project

**Why:**
- Urgent need to separate from health sector codebase
- Minimal risk
- Fast execution
- INIPI can be updated independently

### Future Action (3-6 months):
✅ **Plan Option B** - Migrate to Supabase

**Why:**
- Better long-term economics
- More control and flexibility
- No vendor lock-in
- Better for scaling

### Success Criteria

**Phase 1 Success:**
- ✅ INIPI runs on own Firebase project
- ✅ No dependencies on Clinio codebase
- ✅ All features working
- ✅ Can deploy independently

**Phase 2 Success:**
- ✅ INIPI fully on Supabase
- ✅ 50%+ cost reduction
- ✅ Better performance
- ✅ Easier to maintain

---

## NEXT STEPS

1. **Get approval** for Phase 1 (Independent Firebase)
2. **Create new Firebase project** for INIPI
3. **Set up development environment**
4. **Begin copying Cloud Functions**
5. **Schedule migration window**

**Questions to Answer:**
- What is the target date for Phase 1 completion?
- Who will be responsible for the migration?
- What is the budget for development?
- Should we proceed with Phase 2 (Supabase)?

---

## APPENDIX

### A. Firebase vs Supabase Feature Comparison

| Feature | Firebase | Supabase | Winner |
|---------|----------|----------|--------|
| Database | Firestore (NoSQL) | Postgres (SQL) | Supabase |
| Auth | Firebase Auth | Supabase Auth | Tie |
| Functions | Cloud Functions | Edge Functions | Tie |
| Real-time | Firestore listeners | Postgres subscriptions | Tie |
| Storage | Cloud Storage | S3-compatible | Tie |
| Pricing | Pay-per-use | Flat rate | Supabase |
| Self-hosting | No | Yes | Supabase |
| Admin UI | Basic | Excellent | Supabase |
| SQL Support | No | Yes | Supabase |
| Vendor Lock-in | High | Low | Supabase |

### B. Data Migration Checklist

- [ ] Export all Firestore collections
- [ ] Create Postgres schema
- [ ] Write migration scripts
- [ ] Test migration on copy
- [ ] Migrate authentication users
- [ ] Migrate clinic configuration
- [ ] Migrate members/patients
- [ ] Migrate sessions
- [ ] Migrate bookings
- [ ] Migrate punch cards
- [ ] Migrate employees
- [ ] Verify data integrity
- [ ] Test all features
- [ ] Update DNS/URLs
- [ ] Monitor for 48 hours

### C. Code Changes Summary

**Files to Update:**
- `lib/firebase.ts` → `lib/supabase.ts`
- `lib/clinio.ts` → `lib/inipi-client.ts`
- `lib/members-sdk/` → Delete (replaced by new SDK)
- All component files using `members.*` → Update to use new SDK

**Estimated Lines Changed:**
- New code: ~2,000 lines
- Modified code: ~1,500 lines
- Deleted code: ~500 lines
- Total: ~4,000 lines affected

---

**Document Version:** 1.0  
**Last Updated:** January 3, 2026  
**Author:** AI Assistant + Kenneth

