import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const admin = createAdminClient()
    
    const { data: centre } = await admin
      .from('ecd_centres')
      .select('name, suburb, city, fees_display_mode, monthly_fee_min, is_registered, cover_image_url')
      .eq('slug', slug)
      .maybeSingle()

    if (!centre) {
      return new Response('Not Found', { status: 404 })
    }

    const feesLabel = centre.fees_display_mode === 'exact' 
      ? `R${centre.monthly_fee_min}` 
      : centre.fees_display_mode === 'range' 
        ? `From R${centre.monthly_fee_min}` 
        : 'Contact for fees'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            backgroundColor: 'rgb(15,23,42)',
            backgroundImage: 'linear-gradient(to bottom right, rgb(15,23,42), rgb(30,41,59))',
            padding: '80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Subtle Accent */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, borderRadius: '50%', backgroundColor: 'rgb(14,165,233)', opacity: 0.1, filter: 'blur(100px)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: 'rgb(14,165,233)', padding: '12px 24px', borderRadius: '100px', display: 'flex' }}>
              <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                CentreConnect Verified
              </span>
            </div>
            {centre.is_registered && (
              <div style={{ backgroundColor: 'rgb(16,185,129)', padding: '12px 24px', borderRadius: '100px', display: 'flex' }}>
                <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>DSD Registered</span>
              </div>
            )}
          </div>

          <h1 style={{ color: 'white', fontSize: '100px', fontWeight: '900', margin: 0, lineHeight: 0.9, letterSpacing: '-0.04em', marginBottom: '32px' }}>
            {centre.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'rgb(148,163,184)', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Location</span>
              <span style={{ color: 'white', fontSize: '48px', fontWeight: 'bold' }}>{centre.suburb}, {centre.city}</span>
            </div>
            <div style={{ width: '2px', height: '80px', backgroundColor: 'rgb(51,65,85)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'rgb(148,163,184)', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Monthly Fee</span>
              <span style={{ color: 'rgb(56,189,248)', fontSize: '48px', fontWeight: 'bold' }}>{feesLabel}</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 })
  }
}
