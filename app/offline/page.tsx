import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="h-20 w-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-6">
        <WifiOff className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">You&apos;re Offline</h1>
      <p className="text-slate-500 mb-8 max-w-xs">
        It looks like you don&apos;t have an active internet connection. Please check your network and try again.
      </p>
      <Link href="/">
        <Button className="h-12 px-8 rounded-xl bg-[#065A82] text-white font-bold shadow-lg">
          Try Again
        </Button>
      </Link>
    </div>
  )
}
