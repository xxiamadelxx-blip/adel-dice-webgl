import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

class ResizeObserverMock implements ResizeObserver {
  readonly observe = () => undefined
  readonly unobserve = () => undefined
  readonly disconnect = () => undefined
}

globalThis.ResizeObserver = ResizeObserverMock
