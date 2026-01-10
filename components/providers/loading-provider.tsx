"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"
import "nprogress/nprogress.css"

// Configure NProgress for optimal UX
NProgress.configure({
  showSpinner: false, // Disable spinner for cleaner look
  trickleSpeed: 100,  // Faster trickle animation
  minimum: 0.08,      // Start at 8%
  easing: 'ease',
  speed: 400,         // Faster transitions
})

function LoadingProviderContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Complete the loading bar when navigation finishes
    NProgress.done()
  }, [pathname, searchParams])

  // Start loading on initial mount
  useEffect(() => {
    // Handle browser back/forward navigation
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    window.addEventListener('popstate', handleStart)

    return () => {
      window.removeEventListener('popstate', handleStart)
      NProgress.done()
    }
  }, [])

  return <>{children}</>
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <LoadingProviderContent>{children}</LoadingProviderContent>
    </Suspense>
  )
}
