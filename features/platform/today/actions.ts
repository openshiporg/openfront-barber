'use server'

import { revalidatePath } from 'next/cache'
import { command, type Command } from '../lib/request'

const done = (result: Command) => { if (result.success) revalidatePath('/dashboard/platform/today'); return { success: result.success, error: result.error } }

export async function checkOut(form: FormData) {
  const lines = String(form.get('productId') || '') ? [{ productId: String(form.get('productId')), quantity: Math.max(1, Number(form.get('quantity') || 1)) }] : []
  return done(await command(
    `mutation($id: ID!, $method: String!, $tip: Int, $price: Int, $products: [SaleLineInput!]) { checkOutAppointment(appointmentId: $id, method: $method, tipCents: $tip, priceCents: $price, products: $products) { success error data } }`,
    { id: String(form.get('id')), method: String(form.get('method')), tip: Math.round(Number(form.get('tip') || 0) * 100), price: form.get('price') ? Math.round(Number(form.get('price')) * 100) : null, products: lines },
    'checkOutAppointment',
  ))
}

export async function noShow(id: string) {
  return done(await command(`mutation($id: ID!) { markAppointmentNoShow(appointmentId: $id) { success error data } }`, { id }, 'markAppointmentNoShow'))
}

export async function cancelAppointment(id: string, reason: string) {
  return done(await command(`mutation($id: ID!, $reason: String) { cancelAppointmentAsBarber(appointmentId: $id, reason: $reason) { success error data } }`, { id, reason }, 'cancelAppointmentAsBarber'))
}
