# Using INIPI as a Template for New Client Websites

This guide explains how to use the INIPI website as a template for creating new client websites with Clinio integration.

## When to Use This Template

Use INIPI as a starting point when building websites for:
- ✅ Sauna/spa businesses
- ✅ Yoga studios
- ✅ Fitness studios
- ✅ Wellness centers
- ✅ Any business using Clinio's Members Area

## Quick Start: Create New Client Website

### Step 1: Copy the Template

```bash
# Navigate to where you want the new project
cd /Users/kenneth/Desktop/GitHub\ Projects/

# Copy INIPI to new project name
cp -r inipi new-client-name

# Navigate into new project
cd new-client-name
```

### Step 2: Open in Cursor as NEW Project

**Important:** Don't open this in the Clinio Cursor workspace!

1. Open **new** Cursor window
2. File → Open Folder
3. Select `/Users/kenneth/Desktop/GitHub Projects/new-client-name`
4. The AI will read `.cursorrules` automatically

### Step 3: Customize Branding

Tell the AI assistant:

```
I want to rebrand this website for [CLIENT NAME].
Business type: [yoga studio / fitness center / spa / etc]
Primary color: [blue / green / purple / etc]
Language: [Danish / English / etc]

Please update:
1. All instances of "INIPI" to "[CLIENT NAME]"
2. Tailwind colors from amber to [color]
3. All text to match [business type]
4. README.md with new client name
```

The AI will automatically update all necessary files.

### Step 4: Configure Clinio

Get the client's `uniqueId` from Clinio and tell the AI:

```
Update lib/clinio.ts with uniqueId: "abc123def456"
```

### Step 5: Test & Deploy

Follow `DEPLOYMENT.md` instructions.

## Customization Checklist

When creating a new client website, customize:

### Branding
- [ ] Business name (replace "INIPI")
- [ ] Logo/favicon
- [ ] Primary color scheme
- [ ] Font choices (if needed)

### Content
- [ ] Homepage hero text
- [ ] About section content
- [ ] Features/benefits
- [ ] Footer content
- [ ] Meta tags (SEO)

### Functionality
- [ ] Session terminology ("gus" vs "class" vs "session")
- [ ] Payment methods enabled
- [ ] Booking flow customization
- [ ] Additional pages (e.g., contact, about team)

### Technical
- [ ] Clinio `uniqueId` configured
- [ ] Firebase domain whitelisted
- [ ] Custom domain DNS
- [ ] Analytics tracking

## Common Customization Examples

### Example 1: Yoga Studio

```
// Update terminology in pages
"Saunagus" → "Yoga Class"
"Gus tider" → "Class Schedule"
"Book saunagus" → "Book Class"

// Update colors
amber-600 → purple-600
orange-50 → purple-50

// Update icons/emojis
🔥 → 🧘
💨 → 🌸
```

### Example 2: Fitness Center

```
// Update terminology
"Saunagus" → "Workout Session"
"Gus tider" → "Class Schedule"

// Update colors
amber-600 → blue-600
orange-50 → blue-50

// Update content focus
Focus on: strength, cardio, group fitness
Add: trainer bios, equipment list
```

### Example 3: English Language Site

Ask the AI:

```
Convert all Danish text to English:
- UI labels
- Button text
- Form placeholders
- Date formatting (use 'en-US' locale)
- Keep URL structure
```

## Advanced Customizations

### Add New Page

1. Create `app/newpage/page.tsx`
2. Copy structure from existing page
3. Mark as `'use client'` if using Clinio SDK
4. Add navigation link in header

Example:
```typescript
'use client';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Your content */}
    </div>
  );
}
```

### Add Contact Form

Already available in `/components` (if you copied from Clinio):
```typescript
import { ContactForm } from '@/components/ContactForm';
```

Or create new one with your preferred email service.

### Add CMS Integration

For clients who want to edit content:
1. Install Contentful/Sanity/Strapi
2. Create content types for: pages, sessions, settings
3. Replace hardcoded text with CMS queries

### Custom Booking Fields

Modify `app/book/[sessionId]/page.tsx`:
```typescript
// Add custom fields to booking form
<input 
  name="dietaryRequirements" 
  placeholder="Dietary requirements"
/>
```

Pass to Clinio API in metadata:
```typescript
await members.bookSession({
  sessionId,
  spots,
  paymentMethod,
  metadata: {
    dietaryRequirements: form.dietaryRequirements
  }
});
```

## Working with AI on Client Sites

### Initial Setup Prompt

```
This is a client website template based on INIPI that integrates with Clinio Members API.

Client: [CLIENT NAME]
Business: [TYPE]
Main service: [GROUP SESSIONS / APPOINTMENTS]
Languages: [Danish/English/etc]

Please read .cursorrules for project context.

I need to customize this for the client. Let's start with [specific task].
```

### Good AI Prompts

✅ "Update all INIPI branding to 'Lotus Yoga Studio'"
✅ "Change color scheme from amber to green"
✅ "Add a new 'About Us' page with team bios"
✅ "Translate all text to English"
✅ "Add a newsletter signup form in footer"

❌ "Make it look better" (too vague)
❌ "Fix the API" (SDK is external, can't modify)
❌ "Add e-commerce" (out of scope, use shop in Clinio)

## File Structure Reference

```
new-client-name/
├── .cursorrules           # AI instructions (pre-configured)
├── README.md              # Update with client info
├── DEPLOYMENT.md          # Keep as-is
├── TEMPLATE_GUIDE.md      # This file
├── app/
│   ├── page.tsx          # Homepage - customize heavily
│   ├── sessions/         # Sessions list - minor tweaks
│   ├── login/            # Login - usually keep as-is
│   ├── dashboard/        # Dashboard - minor tweaks
│   └── book/             # Booking - minor tweaks
├── lib/
│   ├── firebase.ts       # DON'T EDIT (Clinio config)
│   ├── clinio.ts         # EDIT: Update uniqueId only
│   └── members-sdk/      # DON'T EDIT (Clinio SDK copy)
├── public/               # Add client logo, images, favicon
└── package.json          # Update "name" field
```

## Testing Checklist

Before deploying client site, test:

- [ ] Homepage loads and looks correct
- [ ] All client branding is updated (no "INIPI" remaining)
- [ ] Colors match client brand
- [ ] Sessions load from Clinio
- [ ] Can create account
- [ ] Can log in
- [ ] Dashboard shows correct data
- [ ] Can book a session
- [ ] Payment flow works (if configured)
- [ ] Mobile responsive
- [ ] All links work
- [ ] Contact form works (if added)

## Version Control Best Practices

```bash
# Each client = separate Git repo
git init
git remote add origin https://github.com/yourusername/client-name.git

# Use branches for major changes
git checkout -b feature/new-homepage
git checkout -b fix/booking-issue

# Tag releases
git tag -a v1.0.0 -m "Initial launch"
git push --tags
```

## Updating Clinio SDK

When Clinio SDK is updated:

**Option 1: If SDK is on NPM (future)**
```bash
npm install @clinio/members-sdk@latest
```

**Option 2: Manual copy (current method)**
```bash
# Copy updated SDK from Clinio project
cp -r ../Clinio/packages/members-sdk/dist/* lib/members-sdk/
```

## Multi-Site Management

If managing multiple client sites:

```
GitHub-Projects/
├── clinio/               # Main Clinio system
├── client-inipi/         # Sauna client
├── client-lotus/         # Yoga client
├── client-powerfit/      # Fitness client
└── website-templates/    # Shared templates/components
    └── clinio-base/      # Base template (INIPI)
```

Keep INIPI as your master template, copy it for new clients.

## Getting Help

1. **For website changes:** Use AI with `.cursorrules` guidance
2. **For Clinio integration:** Check main Clinio project docs
3. **For SDK issues:** Don't modify SDK, check with Clinio team
4. **For deployment:** Follow `DEPLOYMENT.md`

## Cost Estimation Per Client

- Development: 2-4 hours (with template)
- Testing: 1 hour
- Deployment: 30 minutes
- Training client: 1 hour
- **Total: 4-6 hours per client site**

Compare to: 20-40 hours building from scratch

## Future Enhancements

Consider adding to template:
- [ ] Multi-language support (i18n)
- [ ] Dark mode toggle
- [ ] Blog/news section
- [ ] Member testimonials
- [ ] Photo gallery
- [ ] SEO optimization
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Social media integration

---

**Remember:** Each client website is a **separate project** - don't edit them inside the Clinio workspace!

















