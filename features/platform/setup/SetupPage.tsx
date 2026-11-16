import { PageContainer } from '@/features/dashboard/components/PageContainer'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { Notice } from '../lib/ui'
import { SetupForm } from './SetupForm'
import Link from 'next/link'

const crumbs = [{ type: 'link' as const, label: 'Dashboard', href: '/dashboard' }, { type: 'page' as const, label: 'Set up business' }]

export default async function SetupPage() {
  const me = await keystoneClient<{ barberProfiles: Array<{ businessName: string; slug: string }> }>(`query { barberProfiles { businessName slug } }`)
  const profile = me.success ? me.data.barberProfiles[0] : null
  return (
    <PageContainer title="Set up business" breadcrumbs={crumbs}>
      <div className="flex flex-col gap-4 px-4 pb-24 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight">{profile ? profile.businessName : 'Set up your business'}</h1>
        {profile ? (
          <>
            <Notice>Your business is set up. Clients book at <Link className="underline" href={`/book/${profile.slug}`}>/book/{profile.slug}</Link>. Add your services, change your hours and time off from the Models menu.</Notice>
          </>
        ) : <SetupForm />}
      </div>
    </PageContainer>
  )
}
