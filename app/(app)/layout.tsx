import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthGuard } from '@/components/AuthGuard'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <ThemeProvider>
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F4F1' }}>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </ThemeProvider>
    </AuthGuard>
  )
}
