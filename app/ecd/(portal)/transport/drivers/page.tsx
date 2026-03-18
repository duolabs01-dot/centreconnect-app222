import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { CopyRouteLinkButton } from './copy-route-link-button'

export const metadata: Metadata = {
  title: 'Drivers | CentreConnect',
  description: 'Manage transport drivers and route links.',
}

type DriverRow = {
  id: string
  full_name: string
  phone: string
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_plate: string | null
  vehicle_colour: string | null
  status: 'active' | 'suspended' | string
  capacity: number
  driver_token: string
}

function statusClasses(status: string) {
  if (status === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'suspended') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

export default async function EcdTransportDriversPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const canManage = role === 'ecd_admin'

  async function createDriver(formData: FormData) {
    'use server'

    const { supabase: actionSupabase, ecdId: actionEcdId, role: actionRole } = await requireEcdPortalSession({
      cached: false,
    })
    if (actionRole !== 'ecd_admin') {
      throw new Error('Only ECD admins can add drivers.')
    }

    const fullName = String(formData.get('full_name') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()
    const vehicleMake = String(formData.get('vehicle_make') ?? '').trim() || null
    const vehicleModel = String(formData.get('vehicle_model') ?? '').trim() || null
    const vehiclePlate = String(formData.get('vehicle_plate') ?? '').trim() || null
    const vehicleColour = String(formData.get('vehicle_colour') ?? '').trim() || null
    const capacityRaw = Number.parseInt(String(formData.get('capacity') ?? '8'), 10)
    const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : 8

    if (!fullName || !phone) {
      throw new Error('Full name and phone are required.')
    }

    const { error } = await actionSupabase.from('transport_drivers').insert({
      ecd_id: actionEcdId,
      full_name: fullName,
      phone,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_plate: vehiclePlate,
      vehicle_colour: vehicleColour,
      capacity,
    })

    if (error) {
      throw new Error(error.message || 'Failed to add driver')
    }

    revalidatePath('/ecd/transport/drivers')
  }

  async function updateDriver(formData: FormData) {
    'use server'

    const { supabase: actionSupabase, ecdId: actionEcdId, role: actionRole } = await requireEcdPortalSession({
      cached: false,
    })
    if (actionRole !== 'ecd_admin') {
      throw new Error('Only ECD admins can edit drivers.')
    }

    const driverId = String(formData.get('driver_id') ?? '').trim()
    const fullName = String(formData.get('full_name') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()
    const vehicleMake = String(formData.get('vehicle_make') ?? '').trim() || null
    const vehicleModel = String(formData.get('vehicle_model') ?? '').trim() || null
    const vehiclePlate = String(formData.get('vehicle_plate') ?? '').trim() || null
    const vehicleColour = String(formData.get('vehicle_colour') ?? '').trim() || null
    const status = String(formData.get('status') ?? 'active').trim() || 'active'
    const capacityRaw = Number.parseInt(String(formData.get('capacity') ?? '8'), 10)
    const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : 8

    if (!driverId || !fullName || !phone) {
      throw new Error('Missing driver details.')
    }

    const { error } = await actionSupabase
      .from('transport_drivers')
      .update({
        full_name: fullName,
        phone,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_plate: vehiclePlate,
        vehicle_colour: vehicleColour,
        capacity,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driverId)
      .eq('ecd_id', actionEcdId)

    if (error) {
      throw new Error(error.message || 'Failed to update driver')
    }

    revalidatePath('/ecd/transport/drivers')
  }

  const { data } = await supabase
    .from('transport_drivers')
    .select('id,full_name,phone,vehicle_make,vehicle_model,vehicle_plate,vehicle_colour,status,capacity,driver_token')
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: false })

  const drivers = (data ?? []) as DriverRow[]

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Drivers</h1>
            <p className="text-sm text-muted-foreground">Assign drivers and share token-based route links.</p>
          </div>
          {canManage ? (
            <Button asChild>
              <Link href="#add-driver">Add Driver</Link>
            </Button>
          ) : null}
        </div>

        {canManage ? (
          <Card id="add-driver" className="rounded-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle>Add Driver</CardTitle>
            </CardHeader>
            <CardContent>
              <details className="group">
                <summary className="inline-flex cursor-pointer items-center rounded-2xl border border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground">
                  Open form
                </summary>
                <form action={createDriver} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input name="full_name" required placeholder="Full Name" className="cc-native-field" />
                  <input name="phone" required placeholder="Phone" className="cc-native-field" />
                  <input name="vehicle_make" placeholder="Vehicle Make" className="cc-native-field" />
                  <input name="vehicle_model" placeholder="Vehicle Model" className="cc-native-field" />
                  <input name="vehicle_plate" placeholder="Vehicle Plate" className="cc-native-field" />
                  <input name="vehicle_colour" placeholder="Vehicle Colour" className="cc-native-field" />
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    max={60}
                    defaultValue={8}
                    placeholder="Capacity"
                    className="cc-native-field"
                  />
                  <div className="flex items-center">
                    <Button type="submit">Save Driver</Button>
                  </div>
                </form>
              </details>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-border bg-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Only ECD admins can add or edit drivers.</p>
            </CardContent>
          </Card>
        )}

        {drivers.length === 0 ? (
          <Card className="rounded-2xl border border-border bg-card">
            <CardContent className="pt-6">
              <p className="text-sm font-semibold text-foreground">No drivers added yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first driver to start sharing route links.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {drivers.map((driver) => (
              <Card key={driver.id} className="rounded-2xl border border-border bg-card">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{driver.full_name}</p>
                      <p className="text-sm text-muted-foreground">{driver.phone}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(driver.status)}`}
                    >
                      {driver.status}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>
                      Vehicle:{' '}
                      <span className="font-medium text-foreground">
                        {[driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ') || 'Not set'}
                      </span>
                    </p>
                    <p>
                      Plate / Colour:{' '}
                      <span className="font-medium text-foreground">
                        {driver.vehicle_plate ?? 'N/A'}
                        {driver.vehicle_colour ? ` | ${driver.vehicle_colour}` : ''}
                      </span>
                    </p>
                    <p>
                      Capacity: <span className="font-medium text-foreground">{driver.capacity}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <CopyRouteLinkButton driverToken={driver.driver_token} />
                    {canManage ? (
                      <details>
                        <summary className="inline-flex h-8 cursor-pointer items-center rounded-2xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-elevation-1)]">
                          Edit
                        </summary>
                        <form action={updateDriver} className="mt-3 grid gap-2 sm:grid-cols-2">
                          <input type="hidden" name="driver_id" value={driver.id} />
                          <input
                            name="full_name"
                            required
                            defaultValue={driver.full_name}
                            className="cc-native-field"
                          />
                          <input name="phone" required defaultValue={driver.phone} className="cc-native-field" />
                          <input
                            name="vehicle_make"
                            defaultValue={driver.vehicle_make ?? ''}
                            className="cc-native-field"
                          />
                          <input
                            name="vehicle_model"
                            defaultValue={driver.vehicle_model ?? ''}
                            className="cc-native-field"
                          />
                          <input
                            name="vehicle_plate"
                            defaultValue={driver.vehicle_plate ?? ''}
                            className="cc-native-field"
                          />
                          <input
                            name="vehicle_colour"
                            defaultValue={driver.vehicle_colour ?? ''}
                            className="cc-native-field"
                          />
                          <input
                            name="capacity"
                            type="number"
                            min={1}
                            max={60}
                            defaultValue={driver.capacity}
                            className="cc-native-field"
                          />
                          <select name="status" defaultValue={driver.status} className="cc-native-field">
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          <div className="sm:col-span-2">
                            <Button type="submit" size="sm">
                              Save Changes
                            </Button>
                          </div>
                        </form>
                      </details>
                    ) : (
                      <Button type="button" variant="outline" size="sm" disabled>
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}




