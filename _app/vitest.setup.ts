import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Silence Next.js noise in tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
