# INIPI - Sauna Booking System

A complete, independent sauna booking and management system built with Next.js and Supabase. Perfect for wellness businesses, saunas, and group activity providers.

## 🌟 Features

### For Members/Guests
- 🔥 **Browse Sessions** - View all available sauna sessions with real-time availability
- 👤 **Member Registration & Login** - Supabase Authentication
- 📅 **Session Booking** - Book sauna sessions with multiple payment options
- 💳 **Stripe Payments** - Secure card payments for bookings and purchases
- 🎫 **Punch Card System** - Buy and use punch cards (klippekort)
- 🛒 **Online Shop** - Purchase punch cards and products
- 📊 **Member Dashboard** - Manage bookings, view invoices, and profile
- 📄 **Invoices/Receipts** - View all payment history and receipts
- ❌ **Booking Cancellation** - Cancel bookings with automatic refunds/compensation

### For Staff/Gusmester
- 🎯 **Gusmester System** - Points-based system for employees
- 👥 **Host Sessions** - Manage guest spots for sessions
- 📈 **Employee Dashboard** - Track points and hosting sessions
- 🎁 **Guest Spot Booking** - Book spots for guests using points

### For Administrators
- ⚙️ **Admin Dashboard** - Centralized management interface
- 📅 **Session Management** - Create, edit, and delete sessions
- 🎫 **Punch Card Management** - Create and manage punch cards
- 👥 **User Management** - Create users and employees
- 💳 **Stripe Integration** - Configure payment processing
- 📊 **Full Control** - Complete system administration

## 🛠️ Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Modern, responsive styling
- **Supabase** - Backend (Database, Auth, RLS)
- **PostgreSQL** - Relational database
- **Stripe** - Payment processing
- **Coolify** - Self-hosted deployment

## 📦 Database Schema

The system includes 17 tables:
- `profiles` - User profiles
- `employees` - Staff and gusmester data
- `sessions` - Sauna sessions/classes
- `bookings` - User bookings
- `punch_cards` - User punch cards
- `punch_card_templates` - Admin-created punch card types
- `invoices` - Payment receipts
- `group_types` - Session categories
- `themes` - Session themes
- `guest_spots` - Gusmester guest spots
- `gusmester_bookings` - Guest bookings
- And more...

## 🚀 Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/inipi-supabase.git
cd inipi-supabase
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Database Migrations

In Supabase SQL Editor, run these files in order:

1. `supabase-setup/SUPABASE_SCHEMA.sql` - Main database schema
2. `supabase-setup/PUNCH_CARD_FUNCTIONS.sql` - Punch card logic
3. `supabase-setup/GUSMESTER_FUNCTIONS.sql` - Gusmester system
4. `supabase-setup/PUNCH_CARD_RLS_ADMIN.sql` - Admin policies
5. `supabase-setup/STRIPE_SETUP.sql` - Stripe configuration
6. `supabase-setup/FIX_PUNCH_CARD_FK.sql` - Foreign key fix
7. `supabase-setup/CREATE_MISSING_GUEST_SPOTS.sql` - Guest spots setup

Optional test data:
- `supabase-setup/SUPABASE_TEST_DATA.sql` - Sample data

### 5. Create Admin User

In Supabase SQL Editor:

```sql
-- Create admin user (replace with your email)
INSERT INTO employees (user_id, name, email, frontend_permissions, status)
VALUES (
  'your-user-id-from-auth-users',
  'Admin Name',
  'admin@example.com',
  '{"gusmester": true, "staff": true, "administration": true}',
  'active'
);
```

### 6. Configure Stripe (Optional)

1. Sign up at [stripe.com](https://stripe.com)
2. Get your Test Mode API keys
3. Log in as admin → Administration → Stripe Integration
4. Enter your keys and enable Stripe

See `supabase-setup/STRIPE_SETUP_GUIDE.md` for detailed instructions.

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
inipi-supabase/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Homepage
│   ├── sessions/                # Browse sessions
│   ├── login/                   # Authentication
│   ├── dashboard/               # Member dashboard
│   ├── profile/                 # User profile
│   ├── mine-hold/               # My bookings
│   ├── invoices/                # Payment receipts
│   ├── klippekort/              # Punch cards
│   ├── shop/                    # Online shop
│   ├── gusmester/               # Gusmester dashboard
│   ├── personale/               # Staff dashboard
│   ├── admin/                   # Admin dashboard
│   ├── admin-sessions/          # Session management
│   ├── admin-users/             # User management
│   ├── admin-punch-cards/       # Punch card management
│   ├── admin-stripe/            # Stripe settings
│   ├── book/[sessionId]/        # Booking flow
│   ├── components/              # Reusable components
│   └── api/                     # API routes
│       ├── admin/               # Admin endpoints
│       └── stripe/              # Stripe endpoints
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── supabase-sdk.ts          # Custom SDK wrapper
│   ├── stripe-server.ts         # Stripe server utilities
│   ├── cache.ts                 # Caching utilities
│   └── cachedMembers.ts         # Cached SDK wrapper
├── supabase-setup/              # SQL migration files
│   ├── SUPABASE_SCHEMA.sql
│   ├── STRIPE_SETUP.sql
│   ├── STRIPE_SETUP_GUIDE.md
│   └── ...
└── public/
    └── images/                  # Image assets
```

## 🔑 Key Features Explained

### Booking System
- Users can book sauna sessions
- Pay with Stripe or use punch cards
- Automatic invoice generation
- Email confirmations (if configured)
- Cancellation with refunds/compensation

### Punch Card System
- Admins create punch card templates
- Users purchase in shop with Stripe
- Use for bookings instead of payment
- Automatic deduction and restoration
- Expiry date tracking

### Gusmester System
- Employees earn points for hosting sessions
- Spend points to book guest spots
- Automatic guest spot creation
- Points tracking and management

### Payment Processing
- Stripe integration for card payments
- Test and Live modes
- Webhook support for payment events
- Automatic invoice creation
- Refund handling

### Admin Features
- Complete session management
- User and employee creation
- Punch card template management
- Stripe configuration
- Full system control

## 🎨 Customization

### Branding
- Update colors in Tailwind classes (search for `#502B30`, `amber-*`)
- Replace "INIPI" with your business name
- Add your logo in `public/images/`
- Update Danish text throughout

### Styling
All styling uses Tailwind CSS:
- Primary: `#502B30` (dark brown)
- Secondary: `amber-*` (warm orange)
- Background: `#faf8f5` (cream)

### Content
- Homepage: `app/page.tsx`
- About page: `app/about/page.tsx`
- Contact: `app/contact/page.tsx`

## 🚢 Deployment

### Deploy to Coolify

1. **Push to Git**
```bash
git add .
git commit -m "Initial setup"
git push origin main
```

2. **Configure Coolify**
- Connect Git repository
- Set build command: `npm run build`
- Set start command: `npm start`
- Add environment variables
- Deploy!

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📚 Documentation

- **Setup Guide**: This README
- **Stripe Integration**: `supabase-setup/STRIPE_SETUP_GUIDE.md`
- **Database Schema**: `supabase-setup/SUPABASE_SCHEMA.sql`
- **API Documentation**: Check `app/api/` folders

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Admin-only access to sensitive operations
- Secure Stripe key storage
- Authentication required for bookings
- Encrypted payment processing

## 🧪 Testing

### Test Accounts
Create test users via `/login` or admin panel

### Test Payments
Use Stripe test cards in Test Mode:
- Success: `4242 4242 4242 4242`
- 3D Secure: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

### Test Bookings
1. Create sessions in admin panel
2. Assign employees as gusmester
3. Book as regular user
4. Test cancellations and refunds

## 🤝 Contributing

This is a standalone project. Feel free to fork and customize for your needs.

## 📄 License

MIT License - Use freely for your business

## 💡 Support

For questions or issues:
- Check documentation in `supabase-setup/`
- Review SQL files for database structure
- Check API routes for endpoint details

## 🎯 Roadmap

Potential future features:
- Email notifications
- SMS reminders
- Multi-language support
- Advanced reporting
- Mobile app
- Calendar integrations

---

Built with ❤️ for wellness businesses
