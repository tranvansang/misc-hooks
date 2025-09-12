import { JSDOM } from 'jsdom'
import assert from 'node:assert/strict'

// Setup jsdom environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
})

global.window = dom.window as any
global.document = dom.window.document
global.navigator = dom.window.navigator

// Export React Testing Library functions
export { renderHook, act, cleanup, waitFor } from '@testing-library/react'

// Re-export node:test functions with aliases matching vitest
export { describe, it as test, beforeEach, afterEach, before, after, it } from 'node:test'

// Re-export assert functions with vitest-like API  
export const expect = Object.assign((actual: any) => ({
  toBe: (expected: any) => assert.equal(actual, expected),
  toEqual: (expected: any) => assert.deepEqual(actual, expected),
  toStrictEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
  toBeTruthy: () => assert.ok(actual),
  toBeFalsy: () => assert.ok(!actual),
  toBeUndefined: () => assert.equal(actual, undefined),
  toBeNull: () => assert.equal(actual, null),
  toBeDefined: () => assert.notEqual(actual, undefined),
  toBeGreaterThan: (expected: number) => assert.ok(actual > expected, `Expected ${actual} to be greater than ${expected}`),
  toBeInstanceOf: (expected: any) => assert.ok(actual instanceof expected, `Expected ${actual} to be instance of ${expected.name}`),
  toHaveProperty: (property: string) => assert.ok(property in actual, `Expected object to have property "${property}"`),
  toContain: (expected: any) => {
    if (typeof actual === 'string') {
      assert.ok(actual.includes(expected), `Expected "${actual}" to contain "${expected}"`)
    } else if (Array.isArray(actual)) {
      assert.ok(actual.includes(expected), `Expected array to contain ${expected}`)
    } else {
      throw new Error('toContain can only be used with strings or arrays')
    }
  },
  toThrow: (expectedError?: string | RegExp | Error) => {
    if (typeof actual !== 'function') {
      throw new Error('Expected a function to test for thrown errors')
    }
    if (typeof expectedError === 'string') {
      // For string messages, create a RegExp to avoid ambiguity
      assert.throws(actual, new RegExp(expectedError))
    } else {
      assert.throws(actual, expectedError)
    }
  },
  toHaveBeenCalled: () => {
    if (!actual || !actual.mock) {
      throw new Error('Expected a mock function')
    }
    assert.ok(actual.mock.calls.length > 0, 'Expected function to have been called')
  },
  toHaveBeenCalledTimes: (times: number) => {
    if (!actual || !actual.mock) {
      throw new Error('Expected a mock function')
    }
    assert.equal(actual.mock.calls.length, times, `Expected function to have been called ${times} times, but was called ${actual.mock.calls.length} times`)
  },
  toHaveBeenCalledWith: (...args: any[]) => {
    if (!actual || !actual.mock) {
      throw new Error('Expected a mock function')
    }
    const calls = actual.mock.calls
    const found = calls.some((call: any[]) => {
      if (call.length !== args.length) return false
      for (let i = 0; i < args.length; i++) {
        if (args[i] && args[i].asymmetricMatch) {
          if (!args[i].asymmetricMatch(call[i])) return false
        } else {
          try {
            assert.deepEqual(call[i], args[i])
          } catch {
            return false
          }
        }
      }
      return true
    })
    assert.ok(found, `Expected function to have been called with ${JSON.stringify(args)}`)
  },
  toHaveBeenNthCalledWith: (n: number, ...args: any[]) => {
    if (!actual || !actual.mock) {
      throw new Error('Expected a mock function')
    }
    const calls = actual.mock.calls
    assert.ok(calls.length >= n, `Expected at least ${n} calls, but got ${calls.length}`)
    assert.deepEqual(calls[n - 1], args, `Expected call ${n} to have been called with ${JSON.stringify(args)}, but was called with ${JSON.stringify(calls[n - 1])}`)
  },
  not: {
    toBe: (expected: any) => assert.notEqual(actual, expected),
    toEqual: (expected: any) => assert.notDeepEqual(actual, expected),
    toStrictEqual: (expected: any) => assert.notDeepStrictEqual(actual, expected),
    toHaveBeenCalled: () => {
      if (!actual || !actual.mock) {
        throw new Error('Expected a mock function')
      }
      assert.equal(actual.mock.calls.length, 0, 'Expected function not to have been called')
    },
    toThrow: () => {
      if (typeof actual !== 'function') {
        throw new Error('Expected a function to test for thrown errors')
      }
      assert.doesNotThrow(actual)
    },
    toBeDefined: () => assert.equal(actual, undefined, 'Expected value to be undefined')
  },
  resolves: {
    toBe: async (expected: any) => {
      const resolved = await actual
      assert.equal(resolved, expected)
    },
    toEqual: async (expected: any) => {
      const resolved = await actual
      assert.deepEqual(resolved, expected)
    }
  },
  rejects: {
    toThrow: async (expectedError?: string | RegExp | Error) => {
      try {
        await actual
        assert.fail('Expected promise to reject')
      } catch (error: any) {
        if (typeof expectedError === 'string') {
          assert.ok(error.message.includes(expectedError), `Expected error message to include "${expectedError}"`)
        } else if (expectedError instanceof RegExp) {
          assert.match(error.message, expectedError)
        } else if (expectedError) {
          assert.equal(error, expectedError)
        }
      }
    }
  }
}), {
  any: (constructor: any) => {
    return {
      asymmetricMatch: (value: any) => value instanceof constructor,
      toString: () => constructor.name
    }
  },
  objectContaining: (expected: any) => {
    return {
      asymmetricMatch: (actual: any) => {
        if (typeof actual !== 'object' || actual === null) return false
        for (const key in expected) {
          if (!(key in actual)) return false
          if (expected[key] && expected[key].asymmetricMatch) {
            if (!expected[key].asymmetricMatch(actual[key])) return false
          } else if (expected[key] !== actual[key]) {
            return false
          }
        }
        return true
      },
      toString: () => `ObjectContaining(${JSON.stringify(expected)})`
    }
  }
})

// Mock function implementation similar to vitest's vi.fn()
export const fn = (implementation?: (...args: any[]) => any) => {
  let mockImplementation = implementation
  const mockFn = function (...args: any[]) {
    mockFn.mock.calls.push(args)
    if (mockImplementation) {
      return mockImplementation(...args)
    }
  } as any
  
  mockFn.mock = {
    calls: [] as any[][]
  }
  
  mockFn.mockClear = () => {
    mockFn.mock.calls = []
  }
  
  mockFn.mockImplementation = (newImplementation: (...args: any[]) => any) => {
    mockImplementation = newImplementation
    return mockFn
  }
  
  mockFn.mockResolvedValue = (value: any) => {
    mockImplementation = () => Promise.resolve(value)
    return mockFn
  }
  
  mockFn.mockRejectedValue = (value: any) => {
    mockImplementation = () => Promise.reject(value)
    return mockFn
  }
  
  mockFn.mockReturnValue = (value: any) => {
    mockImplementation = () => value
    return mockFn
  }
  
  return mockFn
}

// Timer mocks
let timers: any[] = []
let currentTime = 0

const useFakeTimers = () => {
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  const originalSetInterval = global.setInterval
  const originalClearInterval = global.clearInterval
  const originalDate = global.Date
  
  timers = []
  currentTime = 0
  
  global.setTimeout = ((cb: any, delay: number = 0, ...args: any[]) => {
    const id = Math.random()
    timers.push({ id, cb, time: currentTime + delay, args, type: 'timeout' })
    return id
  }) as any
  
  global.clearTimeout = (id: any) => {
    timers = timers.filter(t => t.id !== id)
  }
  
  global.setInterval = ((cb: any, delay: number = 0, ...args: any[]) => {
    const id = Math.random()
    timers.push({ id, cb, time: currentTime + delay, args, type: 'interval', delay })
    return id
  }) as any
  
  global.clearInterval = (id: any) => {
    timers = timers.filter(t => t.id !== id)
  }
  
  ;(global as any).Date = class extends originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(currentTime)
      } else {
        super(...args)
      }
    }
    static now() {
      return currentTime
    }
  }
  
  return {
    restore: () => {
      global.setTimeout = originalSetTimeout
      global.clearTimeout = originalClearTimeout
      global.setInterval = originalSetInterval
      global.clearInterval = originalClearInterval
      global.Date = originalDate
      timers = []
      currentTime = 0
    }
  }
}

const advanceTimersByTime = (ms: number) => {
  const targetTime = currentTime + ms
  while (currentTime < targetTime) {
    const nextTimer = timers
      .filter(t => t.time <= targetTime)
      .sort((a, b) => a.time - b.time)[0]
    
    if (!nextTimer) {
      currentTime = targetTime
      break
    }
    
    currentTime = nextTimer.time
    const { cb, args, type, delay, id } = nextTimer
    
    if (type === 'timeout') {
      timers = timers.filter(t => t.id !== id)
    } else if (type === 'interval') {
      nextTimer.time = currentTime + delay
    }
    
    cb(...args)
  }
}

const runAllTimers = () => {
  while (timers.length > 0) {
    const timer = timers.shift()
    if (timer) {
      currentTime = timer.time
      timer.cb(...timer.args)
      if (timer.type === 'interval') {
        timer.time = currentTime + timer.delay
        timers.push(timer)
      }
    }
  }
}

// Store restore function globally for useRealTimers
let restoreFn: (() => void) | null = null

// Track all mocks for restoreAllMocks
const allMocks: any[] = []

// vi mock object similar to vitest
export const vi = {
  fn: (implementation?: (...args: any[]) => any) => {
    const mock = fn(implementation)
    allMocks.push(mock)
    return mock
  },
  useFakeTimers: () => {
    const restore = useFakeTimers()
    restoreFn = restore.restore
    return restore
  },
  useRealTimers: () => {
    if (restoreFn) {
      restoreFn()
      restoreFn = null
    }
  },
  advanceTimersByTime,
  runAllTimers,
  restoreAllMocks: () => {
    allMocks.forEach(mock => {
      if (mock && mock.mockClear) {
        mock.mockClear()
      }
    })
    // Also restore any fake timers
    if (restoreFn) {
      restoreFn()
      restoreFn = null
    }
  }
}