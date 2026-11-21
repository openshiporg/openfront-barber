import { PageContainer } from '@/features/dashboard/components/PageContainer'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { Notice } from '../lib/ui'
import { SetupForm } from './SetupForm'
import { SettingsForm, type Settings } from './SettingsForm'
import Link from 'next/link'

const crumbs = [{ type: 'link' as const, label: 'Dashboard', href: '/dashboard' }, { type: 'page' as const, label: 'Settings' }]

export default async function SetupPage() {
  const me = await keystoneClient<{ barberProfiles: Array<Settings & { slug: string }> }>(`query { barberProfiles { id businessName slug phone email location bio bookingOpen minNoticeHours maxAdvanceDays bufferMinutes cancellationWindowHours unpaidHoldHours } }`)
  const profile = me.success ? me.data.barberProfiles[0] : null
  return (
    <PageContainer title={profile ? "Settings" : "Set up business"} breadcrumbs={crumbs}>
      <div className="flex flex-col gap-4 px-4 pb-24 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight">{profile ? profile.businessName : 'Set up your business'}</h1>
        {profile ? (
          <>
            <Notice>Clients book at <Link className="underline" href={`/book/${profile.slug}`}>/book/{profile.slug}</Link>. Change your <Link className="underline" href="/dashboard/weekly-hours">hours</Link>, <Link className="underline" href="/dashboard/services">services</Link> and <Link className="underline" href="/dashboard/time-offs">time off</Link> from their pages.</Notice>
            <SettingsForm settings={profile} />
          </>
        ) : <SetupForm />}
      </div>
    </PageContainer>
  )
}
