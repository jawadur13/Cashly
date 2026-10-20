'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { ListGroup, ListRow, IconTile } from '@/components/ui/list'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useAuth } from '@/providers/auth-provider'
import { useTheme, type Theme } from '@/providers/theme-provider'
import { MANAGE_NAV, initials } from './nav-config'

/** The mobile "Me" menu: profile, the set-up screens, appearance, sign out. */
export function MeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <Sheet open={open} onClose={onClose} title="Me">
      <div className="space-y-5">
        <div className="flex items-center gap-3.5">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-on-primary gold-hairline">
            {initials(user?.name, user?.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text-primary">{user?.name || 'Your profile'}</p>
            <p className="truncate text-sm text-text-secondary">{user?.email}</p>
          </div>
        </div>

        <ListGroup>
          {MANAGE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <ListRow
                key={item.href}
                href={item.href}
                leading={<IconTile><Icon /></IconTile>}
                title={item.label}
              />
            )
          })}
        </ListGroup>

        <div>
          <p className="mb-2 px-1 text-sm font-medium text-text-secondary">Appearance</p>
          <SegmentedControl<Theme>
            label="Appearance"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Auto' },
            ]}
          />
        </div>

        <ListGroup>
          <ListRow
            onClick={async () => {
              onClose()
              await signOut()
              router.replace('/auth/login')
            }}
            leading={<IconTile tone="expense"><LogOut /></IconTile>}
            title={<span className="text-expense">Sign out</span>}
          />
        </ListGroup>
      </div>
    </Sheet>
  )
}
