import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CAD Tutor - WoZ System',
  description: 'Wizard of Oz tutoring system for CAD learning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
