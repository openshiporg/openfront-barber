'use server'

import { command } from '@/features/platform/lib/request'

export async function loadSlots(slug: string, serviceId: string, date: string) {
  return command<string[]>(`query($s: String!, $i: ID!, $d: String!) { publicSlots(slug: $s, serviceId: $i, date: $d) { success error data } }`, { s: slug, i: serviceId, d: date }, 'publicSlots')
}

export async function book(slug: string, serviceId: string, startsAt: string, guest: { name: string; phone: string; email: string; notes: string }) {
  return command<{ appointmentId: string; token: string; depositCents: number }>(
    `mutation($s: String!, $i: ID!, $t: String!, $g: GuestInput!) { bookOnline(slug: $s, serviceId: $i, startsAt: $t, guest: $g) { success error data } }`,
    { s: slug, i: serviceId, t: startsAt, g: guest }, 'bookOnline')
}

export async function payDeposit(id: string, token: string) {
  return command<{ url: string }>(`mutation($i: ID!, $t: String!) { payDepositOnline(id: $i, token: $t) { success error data } }`, { i: id, t: token }, 'payDepositOnline')
}

export async function confirmDeposit(id: string, token: string) {
  return command<{ paid: boolean }>(`mutation($i: ID!, $t: String!) { confirmDepositOnline(id: $i, token: $t) { success error data } }`, { i: id, t: token }, 'confirmDepositOnline')
}

export async function cancelBooking(id: string, token: string) {
  return command(`mutation($i: ID!, $t: String!) { cancelMyBooking(id: $i, token: $t) { success error data } }`, { i: id, t: token }, 'cancelMyBooking')
}
