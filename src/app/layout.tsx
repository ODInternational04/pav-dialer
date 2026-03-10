import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { RealTimeProvider } from '@/contexts/RealTimeContext'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pavilion Hotel Dialer Tracking',
  description: 'Pavilion Hotel Dialer Tracking – Professional call management and client tracking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RealTimeProvider>
            {children}
          </RealTimeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}