# INIPI - Saunagus Website

Example website demonstrating integration with Clinio Members API for booking sauna sessions (saunagus).

## Features

- 🔥 **Browse Saunagus Sessions** - View all available sauna sessions with real-time availability
- 👤 **Member Registration & Login** - Firebase Authentication powered by Clinio
- 📅 **Session Booking** - Book sauna sessions with multiple payment options
- 💳 **Multiple Payment Methods** - Card, MobilePay, or Punch Cards
- 🎫 **Punch Card Management** - View and use your punch cards
- 📊 **Member Dashboard** - Manage bookings and view your profile
- 🎨 **Modern Nordic Design** - Clean, minimalist aesthetic perfect for wellness businesses

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **@clinio/members-sdk** - Integration with Clinio Members API
- **Firebase** - Authentication and backend services

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Clinio Integration

Open `lib/clinio.ts` and replace `'your-unique-id'` with your actual clinic's uniqueId from Clinio:

```typescript
membersInstance = new ClinioMembers({
  uniqueId: 'your-actual-unique-id', // Get this from Clinio
  firebaseApp: firebaseApp
});
```

**Note:** The SDK is currently copied into `lib/members-sdk/` due to Next.js Turbopack compatibility. When the SDK is published to NPM, you can install it normally with `npm install @clinio/members-sdk` and import from the package.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the website.

## Project Structure

```
inipi/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Homepage
│   ├── sessions/            # Browse sessions
│   ├── login/               # Login & Registration
│   ├── dashboard/           # Member dashboard
│   └── book/[sessionId]/    # Booking flow
├── lib/
│   ├── firebase.ts          # Firebase configuration
│   └── clinio.ts            # Clinio SDK initialization
└── package.json
```

## Key Pages

### Homepage (`/`)
- Hero section with call-to-action
- About section explaining saunagus
- Features showcase
- Navigation to sessions and login

### Sessions (`/sessions`)
- List all available saunagus sessions
- Real-time availability
- Filter by date/time
- Quick booking buttons

### Login/Register (`/login`)
- Toggle between login and registration
- Firebase Authentication
- Automatic redirect after successful login

### Dashboard (`/dashboard`)
- View active bookings
- Manage punch cards
- Cancel bookings
- Profile information

### Booking (`/book/[sessionId]`)
- Session details
- Select number of spots
- Choose payment method (card, MobilePay, punch card)
- Complete booking

## Customization

### Branding
- Update color scheme in Tailwind config
- Replace "INIPI" with your business name
- Add your logo/images
- Customize Danish text to match your brand voice

### Styling
All styling uses Tailwind CSS utility classes. Main colors:
- `amber-*` - Primary brand color
- `orange-*` - Accent colors
- `gray-*` - Neutral colors

### Content
- Update homepage hero text in `app/page.tsx`
- Customize session display in `app/sessions/page.tsx`
- Modify dashboard sections in `app/dashboard/page.tsx`

## Deployment

### Deploy to Coolify

1. **Create Git Repository**
```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/inipi.git
git push -u origin main
```

2. **Deploy to Coolify**
- Connect your Git repository
- Set build command: `npm run build`
- Set start command: `npm start`
- Deploy!

### Environment Variables
No environment variables needed - Firebase config is public and SDK handles authentication.

## Integration with Clinio

This website uses the `@clinio/members-sdk` to integrate with Clinio. The SDK provides:

- ✅ Authentication (login, register, logout)
- ✅ Session browsing and details
- ✅ Booking management
- ✅ Punch card management
- ✅ Profile management
- ✅ Payment processing

All data is stored in Clinio's Firebase database and managed through the Clinio admin panel.

## Support

For issues related to:
- **Website functionality** - Check this repository
- **Clinio integration** - Refer to Clinio Members SDK documentation
- **Payment processing** - Contact Clinio support

## License

This is an example template for use with Clinio. Customize freely for your business.
