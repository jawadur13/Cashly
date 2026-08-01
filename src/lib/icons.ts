import {
  Utensils,
  ShoppingBag,
  Car,
  Home,
  Receipt,
  HeartPulse,
  GraduationCap,
  Clapperboard,
  Plane,
  Smartphone,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  Wallet,
  Landmark,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-bag': ShoppingBag,
  car: Car,
  home: Home,
  receipt: Receipt,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  clapperboard: Clapperboard,
  plane: Plane,
  smartphone: Smartphone,
  'more-horizontal': MoreHorizontal,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  gift: Gift,
}

export const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  cash: Wallet,
  bank: Landmark,
  'mobile-wallet': Smartphone,
}

export function getCategoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] ?? MoreHorizontal
}

export function getAccountIcon(key: string): LucideIcon {
  return ACCOUNT_ICONS[key] ?? Wallet
}
