import { list } from '@keystone-6/core'
import { checkbox, integer, relationship, select, text } from '@keystone-6/core/fields'

import { permissions } from '../access'
import { ownerFilter } from '../utils/ownership'
import { trackingFields } from './trackingFields'

export const BarberProfile = list({
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: () => false,
      update: permissions.canManageBusiness,
      delete: () => false,
    },
    filter: { query: ownerFilter, update: ownerFilter },
  },
  ui: { listView: { initialColumns: ['businessName', 'slug', 'timezone', 'bookingOpen'] } },
  fields: {
    owner: relationship({ ref: 'User.barberProfile', access: { create: () => false, update: () => false } }),
    businessName: text({ validation: { isRequired: true } }),
    slug: text({
      isIndexed: 'unique',
      validation: { isRequired: true, match: { regex: /^[a-z0-9][a-z0-9-]{1,40}$/, explanation: 'Use lowercase letters, numbers and hyphens (2 to 41 characters).' } },
      ui: { description: 'Your booking page address: /book/<this>.' },
    }),
    bio: text({ ui: { displayMode: 'textarea' } }),
    photoPath: text({ ui: { description: 'Photo on your booking page: an image address, e.g. /images/barber/barber-at-work.webp or https://…' } }),
    phone: text(),
    email: text(),
    location: text({ ui: { description: 'Where clients find you: shop, booth, or mobile area.' } }),
    timezone: text({ defaultValue: 'America/New_York', validation: { isRequired: true } }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    bookingOpen: checkbox({ defaultValue: true, ui: { description: 'Clients can book from your page.' } }),
    slotMinutes: integer({ defaultValue: 15, validation: { isRequired: true, min: 5, max: 120 } }),
    bufferMinutes: integer({ defaultValue: 10, validation: { isRequired: true, min: 0, max: 120 }, ui: { description: 'Clean-up time after each client.' } }),
    minNoticeHours: integer({ defaultValue: 2, validation: { isRequired: true, min: 0, max: 720 } }),
    maxAdvanceDays: integer({ defaultValue: 60, validation: { isRequired: true, min: 1, max: 365 } }),
    cancellationWindowHours: integer({ defaultValue: 24, validation: { isRequired: true, min: 0, max: 720 } }),
    // Fresha lets salons pick 1 to 72 hours; Square and Booksy take the deposit at booking. 6 hours frees a prime slot the same day.
    unpaidHoldHours: integer({
      label: 'Hold unpaid bookings for',
      defaultValue: 6,
      validation: { isRequired: true, min: 1, max: 72 },
      ui: { description: 'Hours an online booking waiting for its deposit keeps its time (1 to 72). After that it is cancelled and the time opens for other clients.' },
    }),
    noShowFeeCents: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    workStyle: select({
      type: 'enum',
      options: [
        { label: 'Own space', value: 'own_space' },
        { label: 'Rent a chair', value: 'chair_rental' },
        { label: 'Mobile', value: 'mobile' },
      ],
      defaultValue: 'own_space',
      validation: { isRequired: true },
    }),
    services: relationship({ ref: 'Service.profile', many: true, access: { create: () => false, update: () => false } }),
    weeklyHours: relationship({ ref: 'WeeklyHours.profile', many: true, access: { create: () => false, update: () => false } }),
    timeOff: relationship({ ref: 'TimeOff.profile', many: true, access: { create: () => false, update: () => false } }),
    clients: relationship({ ref: 'Client.profile', many: true, access: { create: () => false, update: () => false } }),
    appointments: relationship({ ref: 'Appointment.profile', many: true, access: { create: () => false, update: () => false } }),
    clientNotes: relationship({ ref: 'ClientNote.profile', many: true, access: { create: () => false, update: () => false } }),
    products: relationship({ ref: 'Product.profile', many: true, access: { create: () => false, update: () => false } }),
    productSales: relationship({ ref: 'ProductSale.profile', many: true, access: { create: () => false, update: () => false } }),
    payments: relationship({ ref: 'Payment.profile', many: true, access: { create: () => false, update: () => false } }),
    paymentProviders: relationship({ ref: 'PaymentProvider.profile', many: true, access: { create: () => false, update: () => false } }),
    paymentSessions: relationship({ ref: 'PaymentSession.profile', many: true, access: { create: () => false, update: () => false } }),
    chairRentals: relationship({ ref: 'ChairRental.profile', many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields,
  },
})
