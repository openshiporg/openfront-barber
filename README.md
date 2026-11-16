![openfront-barber](.github/logo.svg)

> Openfront Barber is related to [Openfront Barbershop](https://github.com/openshiporg/openfront-barbershop), but they are different products. Barbershop is for a shop owner who has employee barbers; Barber is for the barber who runs their own business. Some barbershop businesses are neither shape exactly, so pick the one that matches how you work.

Openfront Barber is a self-hostable booking, payments and earnings application for the independent barber. Clients book from your own page and can pay a deposit by card. You keep your services, hours, time off, clients, products and tips in one dashboard, and see what you actually keep, including chair rent if you rent a chair.

## What you get

- **Your booking page** at `/book/your-address`: services, open times from your own hours and time off, and no double booking.
- **Deposits** through Stripe Checkout. The deposit is confirmed by reading the payment back from Stripe, and cancelling refunds it.
- **Today**: open appointments with client notes and preferences; check out with price, tip, product sold and how the client paid (cash, card, Zelle/Venmo/Cash App); mark no-shows.
- **Earnings**: services, tips and products for the last week, month or year, less chair rent.
- **Clients, services, hours, time off, products and chair rental** under Models. A barber only ever sees their own records.

## Setup

```bash
npm install
cp .env.example .env   # DATABASE_URL, SESSION_SECRET, optional STRIPE_SECRET_KEY
npm run dev
```

Open `/dashboard`, create your account, then **Set up business** to choose your booking address, timezone and hours. Add services under Models → Services. Set `STRIPE_SECRET_KEY` to take deposits online; without it clients are told to pay in person.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopenshiporg%2Fopenfront-barber&env=DATABASE_URL%2CSESSION_SECRET)

## The Openfront Ecosystem

Every Openfront is open source and self-hostable.

| Product | For | Repository | Demo | Docs |
|---|---|---|---|---|
| Openfront E-commerce | Online store: catalog, checkout, orders, fulfillment | [openfront](https://github.com/openshiporg/openfront) | [e-commerce.openship.org](https://e-commerce.openship.org) | [Docs](https://docs.openship.org/docs/openfront/ecommerce) |
| Openfront Restaurant | Online ordering, POS and kitchen display | [openfront-restaurant](https://github.com/openshiporg/openfront-restaurant) | [restaurant.openship.org](https://restaurant.openship.org) | [Docs](https://docs.openship.org/docs/openfront/restaurant) |
| Openfront Grocery | Grocery ordering, lots, expiry and pickup | [openfront-grocery](https://github.com/openshiporg/openfront-grocery) | [grocery.openship.org](https://grocery.openship.org) | [Docs](https://docs.openship.org/docs/openfront/grocery) |
| Openfront Gym | Memberships, classes, check-in and billing | [openfront-gym](https://github.com/openshiporg/openfront-gym) | [gym.openship.org](https://gym.openship.org) | [Docs](https://docs.openship.org/docs/openfront/gym) |
| Openfront Hotel | Reservations, front desk, housekeeping, folios | [openfront-hotel](https://github.com/openshiporg/openfront-hotel) | [hotel.openship.org](https://hotel.openship.org) | [Docs](https://docs.openship.org/docs/openfront/hotel) |
| Openfront Rental | Short-term rental bookings and calendars | [openfront-rental](https://github.com/openshiporg/openfront-rental) | [rental.openship.org](https://rental.openship.org) | [Docs](https://docs.openship.org/docs/openfront/rental) |
| Openfront Salon | Appointments, stylists and services | [openfront-salon](https://github.com/openshiporg/openfront-salon) | [salon.openship.org](https://salon.openship.org) | [Docs](https://docs.openship.org/docs/openfront/salon) |
| Openfront Barbershop | Bookings, walk-ins and barbers | [openfront-barbershop](https://github.com/openshiporg/openfront-barbershop) | [barbershop.openship.org](https://barbershop.openship.org) | [Docs](https://docs.openship.org/docs/openfront/barbershop) |
| **Openfront Barber** (this repository) | The barber who runs their own business | [openfront-barber](https://github.com/openshiporg/openfront-barber) | Not deployed yet | Not published yet |
| Openfront Coffee Shop | Café ordering and counter POS | [openfront-coffeeshop](https://github.com/openshiporg/openfront-coffeeshop) | [coffee-shop.openship.org](https://coffee-shop.openship.org) | [Docs](https://docs.openship.org/docs/openfront/coffee-shop) |
| Openfront Real Estate | Listings, showings and transactions | [openfront-realestate](https://github.com/openshiporg/openfront-realestate) | [real-estate.openship.org](https://real-estate.openship.org) | [Docs](https://docs.openship.org/docs/openfront/real-estate) |
| Openfront Dealership | Inventory, test drives, deals and service | [openfront-dealership](https://github.com/openshiporg/openfront-dealership) | [dealership.openship.org](https://dealership.openship.org) | [Docs](https://docs.openship.org/docs/openfront/dealership) |
| Openfront Vape | Age-gated retail with compliance controls | [openfront-vape](https://github.com/openshiporg/openfront-vape) | [vape.openship.org](https://vape.openship.org) | [Docs](https://docs.openship.org/docs/openfront/vape) |
| Openfront Convenience | Convenience store POS and inventory | [openfront-convenience](https://github.com/openshiporg/openfront-convenience) | [convenience.openship.org](https://convenience.openship.org) | [Docs](https://docs.openship.org/docs/openfront/convenience) |
| Openfront Collectibles | Graded items, consignment and provenance | [openfront-collectibles](https://github.com/openshiporg/openfront-collectibles) | [collectibles.openship.org](https://collectibles.openship.org) | [Docs](https://docs.openship.org/docs/openfront/collectibles) |
| Openfront Cannabis | Dispensary menu, packages and recalls | [openfront-cannabis](https://github.com/openshiporg/openfront-cannabis) | [cannabis.openship.org](https://cannabis.openship.org) | [Docs](https://docs.openship.org/docs/openfront/cannabis) |
| Openfront Pharmacy | Prescriptions, inventory lots and pickup | [openfront-pharmacy](https://github.com/openshiporg/openfront-pharmacy) | [pharmacy.openship.org](https://pharmacy.openship.org) | [Docs](https://docs.openship.org/docs/openfront/pharmacy) |
| Openfront Med Spa | Treatments, consents and memberships | [openfront-medspa](https://github.com/openshiporg/openfront-medspa) | [medspa.openship.org](https://medspa.openship.org) | [Docs](https://docs.openship.org/docs/openfront/medspa) |
| Openfront Construction | Projects, bids, change orders and crews | [openfront-construction](https://github.com/openshiporg/openfront-construction) | [construction.openship.org](https://construction.openship.org) | [Docs](https://docs.openship.org/docs/openfront/construction) |
| Openfront Law Firm | Matters, intake, time and billing | [openfront-law-firm](https://github.com/openshiporg/openfront-law-firm) | [law-firm.openship.org](https://law-firm.openship.org) | [Docs](https://docs.openship.org/docs/openfront/law-firm) |
| Openfront Scheduling | Booking pages for appointment businesses | [openfront-scheduling](https://github.com/openshiporg/openfront-scheduling) | [scheduling.openship.org](https://scheduling.openship.org) | [Docs](https://docs.openship.org/docs/openfront/scheduling) |
| Openfront Social | Creator community and posts | [openfront-social](https://github.com/openshiporg/openfront-social) | [social.openship.org](https://social.openship.org) | [Docs](https://docs.openship.org/docs/openfront/social) |
| Openfront Rideshare | Rides, drivers and dispatch | [openfront-rideshare](https://github.com/openshiporg/openfront-rideshare) | [rideshare.openship.org](https://rideshare.openship.org) | [Docs](https://docs.openship.org/docs/openfront/rideshare) |
| Openfront Airline | Flights, booking and passenger operations | [openfront-airline](https://github.com/openshiporg/openfront-airline) | [airline.openship.org](https://airline.openship.org) | [Docs](https://docs.openship.org/docs/openfront/airline) |
| Openfront Hospital | Appointments, patients and care teams | [openfront-hospital](https://github.com/openshiporg/openfront-hospital) | [hospital.openship.org](https://hospital.openship.org) | [Docs](https://docs.openship.org/docs/openfront/hospital) |
| Openfront Sportsbook | Markets, bets and results | [openfront-sportsbook](https://github.com/openshiporg/openfront-sportsbook) | [sportsbook.openship.org](https://sportsbook.openship.org) | [Docs](https://docs.openship.org/docs/openfront/sportsbook) |
| Openfront Financial | Accounts, portfolios and advisory | [openfront-financial](https://github.com/openshiporg/openfront-financial) | [financial.openship.org](https://financial.openship.org) | [Docs](https://docs.openship.org/docs/openfront/financial) |
| Openfront Analytics | Privacy-friendly website analytics | [analytics](https://github.com/openshiporg/analytics) | [analytics.openship.org](https://analytics.openship.org) | [Docs](https://docs.openship.org/docs/openfront/analytics) |
| Openship | Order routing from sales channels to fulfillment | [openship](https://github.com/openshiporg/openship) | [os.openship.org](https://os.openship.org) | [Docs](https://docs.openship.org/docs/openship/ecommerce) |
| Marketplace | Shop across Openfront stores | [marketplace](https://github.com/openshiporg/marketplace) | [marketplace.openship.org](https://marketplace.openship.org) | [Docs](https://docs.openship.org/docs/openfront/marketplace) |


