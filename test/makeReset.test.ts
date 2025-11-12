import {describe, expect, test, vi} from 'vitest'
import {makeReset} from '../index'

describe('makeReset', () => {
	test('returns a reset function', () => {
		const reset = makeReset()
		expect(typeof reset).toBe('function')
	})

	test('reset returns a new disposer', () => {
		const reset = makeReset()
		const disposer1 = reset()

		expect(disposer1).toHaveProperty('addDispose')
		expect(disposer1).toHaveProperty('dispose')
		expect(disposer1).toHaveProperty('signal')
		expect(disposer1.signal).toBeInstanceOf(AbortSignal)
		expect(disposer1.signal.aborted).toBe(false)
	})

	test('reset disposes previous disposer and returns a new one', () => {
		const reset = makeReset()
		const disposer1 = reset()

		expect(disposer1.signal.aborted).toBe(false)

		const disposer2 = reset()

		expect(disposer1.signal.aborted).toBe(true)
		expect(disposer2.signal.aborted).toBe(false)
		expect(disposer1).not.toBe(disposer2)
	})

	test('cleanup functions from previous disposer are called on reset', () => {
		const reset = makeReset()
		const disposer1 = reset()
		const fn1 = vi.fn()
		const fn2 = vi.fn()

		disposer1.addDispose(fn1)
		disposer1.addDispose(fn2)

		expect(fn1).not.toHaveBeenCalled()
		expect(fn2).not.toHaveBeenCalled()

		const disposer2 = reset()

		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).toHaveBeenCalledTimes(1)
	})

	test('cleanup functions are called in reverse order on reset', () => {
		const reset = makeReset()
		const disposer1 = reset()
		const callOrder: number[] = []

		disposer1.addDispose(() => callOrder.push(1))
		disposer1.addDispose(() => callOrder.push(2))
		disposer1.addDispose(() => callOrder.push(3))

		reset()

		expect(callOrder).toEqual([3, 2, 1])
	})

	test('multiple resets work correctly', () => {
		const reset = makeReset()
		const disposer1 = reset()
		const fn1 = vi.fn()
		disposer1.addDispose(fn1)

		const disposer2 = reset()
		const fn2 = vi.fn()
		disposer2.addDispose(fn2)

		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).not.toHaveBeenCalled()

		const disposer3 = reset()
		const fn3 = vi.fn()
		disposer3.addDispose(fn3)

		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).toHaveBeenCalledTimes(1)
		expect(fn3).not.toHaveBeenCalled()

		expect(disposer1.signal.aborted).toBe(true)
		expect(disposer2.signal.aborted).toBe(true)
		expect(disposer3.signal.aborted).toBe(false)
	})

	test('new disposer after reset is independent', () => {
		const reset = makeReset()
		const disposer1 = reset()
		const fn1 = vi.fn()
		disposer1.addDispose(fn1)

		const disposer2 = reset()
		const fn2 = vi.fn()
		disposer2.addDispose(fn2)

		// Manually dispose disposer2
		disposer2.dispose()

		// fn1 should have been called only once (during reset)
		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).toHaveBeenCalledTimes(1)
		expect(disposer2.signal.aborted).toBe(true)
	})

	test('can be used for resource cleanup and recreation pattern', () => {
		const reset = makeReset()
		let resource1Active = false
		let resource2Active = false

		// First usage
		const disposer1 = reset()
		resource1Active = true
		disposer1.addDispose(() => { resource1Active = false })

		expect(resource1Active).toBe(true)

		// Reset and create new resource
		const disposer2 = reset()
		resource2Active = true
		disposer2.addDispose(() => { resource2Active = false })

		expect(resource1Active).toBe(false) // Previous resource cleaned up
		expect(resource2Active).toBe(true)  // New resource active

		// Final cleanup
		disposer2.dispose()
		expect(resource2Active).toBe(false)
	})

	test('reset can be called without storing the returned disposer', () => {
		const reset = makeReset()
		const fn1 = vi.fn()
		const fn2 = vi.fn()

		reset().addDispose(fn1)
		reset().addDispose(fn2)

		expect(fn1).toHaveBeenCalledTimes(1) // Called when second reset() happened
		expect(fn2).not.toHaveBeenCalled()
	})

	test('signal abort event fires when reset is called', async () => {
		const reset = makeReset()
		const disposer1 = reset()
		const abortHandler = vi.fn()

		disposer1.signal.addEventListener('abort', abortHandler)

		expect(abortHandler).not.toHaveBeenCalled()
		reset()

		// AbortSignal fires events asynchronously
		await new Promise(resolve => setTimeout(resolve, 0))

		expect(abortHandler).toHaveBeenCalled()
	})

	test('works with fetch API pattern', async () => {
		const reset = makeReset()
		const disposer1 = reset()

		// Mock fetch to test signal usage
		const mockFetch = vi.fn((url, options) => {
			return new Promise((resolve) => {
				options.signal.addEventListener('abort', () => {
					resolve({ aborted: true })
				})
			})
		})

		const fetchPromise = mockFetch('https://api.example.com', { signal: disposer1.signal })

		// Reset should abort the signal
		reset()

		const result = await fetchPromise
		expect(result).toEqual({ aborted: true })
	})

	test('cleanup functions added to new disposer are not affected by previous reset', () => {
		const reset = makeReset()
		const disposer1 = reset()
		const fn1 = vi.fn()
		disposer1.addDispose(fn1)

		const disposer2 = reset()
		const fn2 = vi.fn()
		const fn3 = vi.fn()
		disposer2.addDispose(fn2)
		disposer2.addDispose(fn3)

		expect(fn1).toHaveBeenCalledTimes(1) // Called during reset
		expect(fn2).not.toHaveBeenCalled()
		expect(fn3).not.toHaveBeenCalled()

		disposer2.dispose()

		expect(fn1).toHaveBeenCalledTimes(1) // Still only once
		expect(fn2).toHaveBeenCalledTimes(1)
		expect(fn3).toHaveBeenCalledTimes(1)
	})

	test('empty disposers can be reset', () => {
		const reset = makeReset()
		const disposer1 = reset()
		// Don't add any cleanup functions

		const disposer2 = reset()

		expect(disposer1.signal.aborted).toBe(true)
		expect(disposer2.signal.aborted).toBe(false)
	})

	test('reset with complex cleanup scenarios', () => {
		const reset = makeReset()
		const events: string[] = []

		// First cycle
		const disposer1 = reset()
		disposer1.addDispose(() => events.push('cleanup-1a'))
		disposer1.addDispose(() => events.push('cleanup-1b'))

		// Second cycle
		const disposer2 = reset()
		expect(events).toEqual(['cleanup-1b', 'cleanup-1a']) // Reverse order
		disposer2.addDispose(() => events.push('cleanup-2a'))
		disposer2.addDispose(() => events.push('cleanup-2b'))

		// Third cycle
		const disposer3 = reset()
		expect(events).toEqual([
			'cleanup-1b', 'cleanup-1a',
			'cleanup-2b', 'cleanup-2a'
		])

		disposer3.addDispose(() => events.push('cleanup-3'))

		// Final dispose
		disposer3.dispose()
		expect(events).toEqual([
			'cleanup-1b', 'cleanup-1a',
			'cleanup-2b', 'cleanup-2a',
			'cleanup-3'
		])
	})
})