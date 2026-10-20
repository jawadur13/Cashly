/** Re-mounts on each navigation, giving every screen a short fade-and-rise. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>
}
