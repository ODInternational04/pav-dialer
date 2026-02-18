import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { RealTimeProvider } from '@/contexts/RealTimeContext'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IBV Dialer',
  description: 'IBV Dialer – Professional dialer system for client management and call tracking',
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