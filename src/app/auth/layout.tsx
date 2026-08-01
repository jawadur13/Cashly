export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <img src="/cashly-logo.svg" alt="" aria-hidden="true" className="size-10 shrink-0" />
        <span className="text-2xl font-bold text-text-primary">Cashly</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
