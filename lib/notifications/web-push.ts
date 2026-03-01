import webpush from 'web-push'

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || ''

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:support@centreconnect.co.za',
    publicVapidKey,
    privateVapidKey
  )
}

export async function sendWebPush(subscription: any, payload: { title: string; body: string; url?: string }) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { success: true }
  } catch (error: any) {
    console.error('Web Push error:', error)
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { success: false, expired: true }
    }
    return { success: false, error: error.message }
  }
}
