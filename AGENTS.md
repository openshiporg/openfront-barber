# Openfront Barber

THIS IS NOT A MOCK, A SANDBOX OR A DEMO. It is sold to real barbers. Booking and paying must work on the live site.

- Product: bookings, deposits, tips, products and earnings for one independent barber. Not Barbershop (shop owner with employees): no staff, shifts or commissions here.
- Layout: `app/` stays thin; code lives in `features/`. Models in `features/keystone/models`, commands in `features/keystone/utils`, GraphQL in `features/keystone/mutations`, dashboard slices in `features/platform`, public booking in `features/storefront`.
- Every business record belongs to a `BarberProfile`; a barber sees only their own (`utils/ownership.ts`).
- Payments go through `features/integrations/payment` (manual, stripe). Deposits are confirmed by reading Stripe back.
- Never `prisma db push`. Use `npm run migrate:gen` and `npm run migrate`.
- No outbox, texting/email machinery, cron or workers. External events arrive by webhook only.
- Never gate a core action behind an env var that is unset on live.
