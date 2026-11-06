# Polysoko

## Local development

Install dependencies and start the Nuxt server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to browse the marketplace. Choose **Sign in** and then **Create an account** to register. New public sign-ups always receive the customer role. User records, sessions, products, carts, and purchases are stored in SQLite at `.data/polysoko.sqlite`; the directory and database are created automatically. No Supabase project keys are required.

### Administrator account

Configure the initial administrator with environment variables before starting the server:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "use-a-unique-password-of-at-least-8-characters"
npm run dev
```

The configured credentials provision the administrator account; keep them private and use a unique password (12 or more characters is recommended). Administrators can add customer accounts and products, remove products, review purchases, and view the recorded sales total. Customers and administrators can use the storefront cart.

Checkout is currently a demo: it records orders and updates stock but does not collect real payments. The admin wallet displays the sum of those recorded order totals; it is not a payment balance. Integrate and verify a payment provider before accepting real payments.

Set `SQLITE_DB_PATH` to choose another database file. Keep the database on persistent storage when deploying: a local SQLite file is suitable for a single server with a writable persistent disk, not ephemeral or multi-instance serverless deployments.

## Production build

```bash
npm run build
npm run preview
```

Authentication uses server-side API routes, scrypt password hashes, role checks, and expiring HTTP-only session cookies. Product photos added by an administrator can be HTTPS URLs, one per line.

Administrators can also upload up to five JPEG, PNG, or WebP photos per item (5 MB each). Uploaded photos are stored in the `product-images` directory beside the configured SQLite database.
