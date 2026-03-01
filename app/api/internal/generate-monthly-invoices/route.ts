// app/api/internal/generate-monthly-invoices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('CC_INTERNAL_API_KEY')
  if (authHeader !== process.env.CC_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ecdId, year, month } = await req.json()
  if (!ecdId || !year || !month) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const billingMonthDate = `${year}-${String(month).padStart(2, '0')}-01`
  const supabase = createAdminClient()

  // 1. Find all enrolled applications with monthly fees for this centre
  const { data: applications, error: appError } = await supabase
    .from('applications')
    .select('id,ecd_id,parent_id,child_id,monthly_fee_cents,children(first_name),ecd_centres(name)')
    .eq('ecd_id', ecdId)
    .eq('status', 'enrolled')
    .gt('monthly_fee_cents', 0)

  if (appError) {
    console.error('Error fetching applications for billing:', appError)
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }

  if (!applications || applications.length === 0) {
    return NextResponse.json({ success: true, count: 0, message: 'No applications with monthly fees found' })
  }

  // 2. Fetch existing invoices for this month to prevent duplicates
  const { data: existingInvoices, error: invError } = await supabase
    .from('invoices')
    .select('child_id')
    .eq('ecd_id', ecdId)
    .eq('billing_month', billingMonthDate)

  if (invError) {
    console.error('Error fetching existing invoices:', invError)
    return NextResponse.json({ error: invError.message }, { status: 500 })
  }

  const existingChildIds = new Set(existingInvoices?.map(inv => inv.child_id) || [])
  const newApplications = applications.filter(app => !existingChildIds.has(app.child_id))

  if (newApplications.length === 0) {
    return NextResponse.json({ success: true, count: 0, message: 'Invoices for this month already exist' })
  }

  // 3. Generate invoices and notify parents
  const results = []
  const lastDayOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

  for (const app of newApplications) {
    const child = Array.isArray(app.children) ? app.children[0] : app.children
    const centre = Array.isArray(app.ecd_centres) ? app.ecd_centres[0] : app.ecd_centres
    const childName = child?.first_name || 'your child'
    const centreName = centre?.name || 'the centre'
    const amountRand = (app.monthly_fee_cents / 100).toFixed(2)

    // Create invoice record
    const invoiceNumber = `INV-${ecdId.slice(0,4)}-${app.child_id.slice(0,4)}-${year}${String(month).padStart(2, '0')}`
    
    const { data: invoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        ecd_id: app.ecd_id,
        parent_id: app.parent_id,
        child_id: app.child_id,
        invoice_number: invoiceNumber,
        total: app.monthly_fee_cents / 100, // Database uses NUMERIC Rand values
        subtotal: app.monthly_fee_cents / 100,
        status: 'sent',
        billing_month: billingMonthDate,
        issued_at: new Date().toISOString(),
        due_at: lastDayOfMonth,
        line_items: JSON.stringify([{
          description: `Monthly Fee for ${childName} - ${new Date(year, month-1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' })}`,
          amount: app.monthly_fee_cents / 100
        }])
      })
      .select()
      .single()

    if (createError) {
      console.error(`Error creating invoice for child ${app.child_id}:`, createError)
      results.push({ childId: app.child_id, success: false, error: createError.message })
      continue
    }

    // 4. Send parent notification
    const { error: notifError } = await supabase
      .from('parent_notifications')
      .insert({
        parent_id: app.parent_id,
        title: 'New Monthly Invoice',
        body: `Your monthly fee of R${amountRand} for ${childName} at ${centreName} is due by ${lastDayOfMonth}.`,
        link: `/parent/dashboard`, // Link to parent dashboard
        priority: 'high'
      })

    if (notifError) {
      console.error(`Error sending notification to parent ${app.parent_id}:`, notifError)
    }

    results.push({ childId: app.child_id, success: true, invoiceId: invoice.id })
  }

  const successCount = results.filter(r => r.success).length
  return NextResponse.json({ 
    success: true, 
    count: successCount, 
    total: results.length,
    results 
  })
}
