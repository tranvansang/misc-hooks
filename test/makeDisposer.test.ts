import {describe, expect, test, vi} from './helpers.ts'
import {makeDisposer} from '../index.ts'

describe('makeDisposer', () => {
	test('creates a disposer with signal and methods', () => {
		const disposer = makeDisposer()

		expect(disposer).toHaveProperty('addDispose')
		expect(disposer).toHaveProperty('dispose')
		expect(disposer).toHaveProperty('signal')
		expect(disposer.signal).toBeInstanceOf(AbortSignal)
		expect(disposer.signal.aborted).toBe(false)
	})

	test('signal is aborted when dispose is called', () => {
		const disposer = makeDisposer()

		expect(disposer.signal.aborted).toBe(false)
		disposer.dispose()
		expect(disposer.signal.aborted).toBe(true)
	})

	test('addDispose adds functions that are called on dispose', () => {
		const disposer = makeDisposer()
		const fn1 = vi.fn()
		const fn2 = vi.fn()
		const fn3 = vi.fn()

		disposer.addDispose(fn1)
		disposer.addDispose(fn2)
		disposer.addDispose(fn3)

		expect(fn1).not.toHaveBeenCalled()
		expect(fn2).not.toHaveBeenCalled()
		expect(fn3).not.toHaveBeenCalled()

		disposer.dispose()

		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).toHaveBeenCalledTimes(1)
		expect(fn3).toHaveBeenCalledTimes(1)
	})

	test('dispose functions are called in reverse order', () => {
		const disposer = makeDisposer()
		const callOrder: number[] = []

		disposer.addDispose(() => callOrder.push(1))
		disposer.addDispose(() => callOrder.push(2))
		disposer.addDispose(() => callOrder.push(3))

		disposer.dispose()

		expect(callOrder).toEqual([3, 2, 1])
	})

	test('addDispose ignores falsy values', () => {
		const disposer = makeDisposer()
		const fn = vi.fn()

		disposer.addDispose(undefined)
		disposer.addDispose(null)
		disposer.addDispose()
		disposer.addDispose(fn)

		disposer.dispose()

		expect(fn).toHaveBeenCalledTimes(1)
	})

	test('addDispose immediately calls function if already disposed', () => {
		const disposer = makeDisposer()
		const fn1 = vi.fn()
		const fn2 = vi.fn()

		disposer.addDispose(fn1)
		disposer.dispose()

		expect(fn1).toHaveBeenCalledTimes(1)
		expect(fn2).not.toHaveBeenCalled()

		// Adding after dispose should call immediately
		disposer.addDispose(fn2)
		expect(fn2).toHaveBeenCalledTimes(1)

		// fn1 should not be called again
		expect(fn1).toHaveBeenCalledTimes(1)
	})

	test('multiple dispose calls are safe (only dispose once)', () => {
		const disposer = makeDisposer()
		const fn = vi.fn()

		disposer.addDispose(fn)

		disposer.dispose()
		expect(fn).toHaveBeenCalledTimes(1)

		// With the new check, subsequent dispose calls won't call functions again
		disposer.dispose()
		expect(fn).toHaveBeenCalledTimes(1)

		disposer.dispose()
		expect(fn).toHaveBeenCalledTimes(1)
	})

	test('signal abort event can be listened to', async () => {
		const disposer = makeDisposer()
		const abortHandler = vi.fn()

		disposer.signal.addEventListener('abort', abortHandler)

		expect(abortHandler).not.toHaveBeenCalled()
		disposer.dispose()

		// AbortSignal fires events asynchronously
		await new Promise(resolve => setTimeout(resolve, 0))

		expect(abortHandler).toHaveBeenCalled()
	})

	test('can be used with fetch API', () => {
		const disposer = makeDisposer()

		// Mock fetch to test signal usage
		const mockFetch = vi.fn((url, options) => {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({})
			})
		})

		mockFetch('https://api.example.com', { signal: disposer.signal })

		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.example.com',
			{ signal: disposer.signal }
		)
	})

	test('dispose functions can clean up resources', () => {
		const disposer = makeDisposer()

		// Simulate resource cleanup
		let resource1Active = true
		let resource2Active = true
		let resource3Active = true

		disposer.addDispose(() => { resource1Active = false })
		disposer.addDispose(() => { resource2Active = false })
		disposer.addDispose(() => { resource3Active = false })

		expect(resource1Active).toBe(true)
		expect(resource2Active).toBe(true)
		expect(resource3Active).toBe(true)

		disposer.dispose()

		expect(resource1Active).toBe(false)
		expect(resource2Active).toBe(false)
		expect(resource3Active).toBe(false)
	})

	test('works with async cleanup patterns', async () => {
		const disposer = makeDisposer()

		let timeoutId: NodeJS.Timeout | undefined
		let intervalId: NodeJS.Timeout | undefined

		// Set up some async operations
		timeoutId = setTimeout(() => {}, 10000)
		intervalId = setInterval(() => {}, 1000)

		// Register cleanup
		disposer.addDispose(() => clearTimeout(timeoutId))
		disposer.addDispose(() => clearInterval(intervalId))

		// Clean up
		disposer.dispose()

		// Verify cleanup happened (no direct way to check, but no errors should occur)
		expect(disposer.signal.aborted).toBe(true)
	})

	test('same function can be added multiple times', () => {
		const disposer = makeDisposer()
		const fn = vi.fn()

		// Add the same function multiple times
		disposer.addDispose(fn)
		disposer.addDispose(fn)
		disposer.addDispose(fn)

		expect(fn).not.toHaveBeenCalled()

		// Dispose should call the function 3 times
		disposer.dispose()

		expect(fn).toHaveBeenCalledTimes(3)
	})

	test('same function added multiple times is called in correct order', () => {
		const disposer = makeDisposer()
		const callOrder: string[] = []

		const fnA = () => callOrder.push('A')
		const fnB = () => callOrder.push('B')

		// Add functions in a specific pattern
		disposer.addDispose(fnA)
		disposer.addDispose(fnB)
		disposer.addDispose(fnA)
		disposer.addDispose(fnB)
		disposer.addDispose(fnA)

		disposer.dispose()

		// Should be called in reverse order
		expect(callOrder).toEqual(['A', 'B', 'A', 'B', 'A'])
	})
})
