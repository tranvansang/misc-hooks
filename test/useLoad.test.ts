import {describe, expect, test, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {useLoad} from '../index'

describe('useLoad', () => {
		test('initial state without getInitial', () => {
			const {result} = renderHook(() => useLoad())

			expect(result.current.loading).toBe(false)
			expect(result.current.data).toBeUndefined()
			expect(result.current.error).toBeUndefined()
			expect(result.current.loadingRef.current).toBeUndefined()
		})

		test('initial state with getInitial returning value', () => {
			const {result} = renderHook(() => useLoad(() => 'initial'))

			expect(result.current.loading).toBe(false)
			expect(result.current.data).toBe('initial')
			expect(result.current.error).toBeUndefined()
		})

		test('initial state with getInitial throwing error', () => {
			const error = new Error('Initial error')
			const {result} = renderHook(() => useLoad(() => {
				throw error
			}))

			expect(result.current.loading).toBe(false)
			expect(result.current.data).toBeUndefined()
			expect(result.current.error).toBe(error)
		})

		test('synchronous load function', async () => {
			const {result} = renderHook(() => useLoad<number, [number, number]>())

			const loadFn = result.current.load((disposer, a, b) => a + b)

			expect(result.current.loading).toBe(false)

			let returnValue: number
			act(() => {
				returnValue = loadFn(2, 3)
			})

			expect(returnValue!).toBe(5)
			expect(result.current.loading).toBe(false)
			expect(result.current.data).toBe(5)
			expect(result.current.error).toBeUndefined()
		})

		test('asynchronous load function success', async () => {
			const {result} = renderHook(() => useLoad<string, [string]>())

			const loadFn = result.current.load(async (disposer, value) => {
				await new Promise(resolve => setTimeout(resolve, 10))
				return `async-${value}`
			})

			let promise: Promise<string>
			act(() => {
				promise = loadFn('test')
			})

			// Should be loading immediately
			expect(result.current.loading).toBe(true)
			expect(result.current.loadingRef.current).toBe(promise!)

			// Wait for async operation to complete
			const value = await promise!
			expect(value).toBe('async-test')

			// Check final state
			await waitFor(() => {
				expect(result.current.loading).toBe(false)
				expect(result.current.data).toBe('async-test')
				expect(result.current.error).toBeUndefined()
				expect(result.current.loadingRef.current).toBeUndefined()
			})
		})

		test('asynchronous load function error', async () => {
			const {result} = renderHook(() => useLoad<string, []>())

			const error = new Error('Async error')
			const loadFn = result.current.load(async () => {
				await new Promise(resolve => setTimeout(resolve, 10))
				throw error
			})

			let promise: Promise<string>
			act(() => {
				promise = loadFn()
			})

			// Should be loading immediately
			expect(result.current.loading).toBe(true)

			// Wait for async operation to fail
			await expect(promise!).rejects.toThrow('Async error')

			// Check final state
			await waitFor(() => {
				expect(result.current.loading).toBe(false)
				expect(result.current.data).toBeUndefined()
				expect(result.current.error).toBe(error)
				expect(result.current.loadingRef.current).toBeUndefined()
			})
		})

		test('synchronous load function error', () => {
			const {result} = renderHook(() => useLoad<string, []>())

			const error = new Error('Sync error')
			const loadFn = result.current.load(() => {
				throw error
			})

			// The error should be thrown
			let thrownError: Error | undefined
			act(() => {
				try {
					loadFn()
				} catch (e) {
					thrownError = e as Error
				}
			})

			expect(thrownError).toBe(error)

			// And the state should be updated with the error
			expect(result.current.loading).toBe(false)
			expect(result.current.data).toBeUndefined()
			expect(result.current.error).toBe(error)
		})

		test('dispose is called when component unmounts', () => {
			const disposeFn = vi.fn()
			const {result, unmount} = renderHook(() => useLoad<string, []>())

			const loadFn = result.current.load((disposer) => {
				disposer.addDispose(disposeFn)
				return 'test'
			})

			act(() => {
				loadFn()
			})

			expect(disposeFn).not.toHaveBeenCalled()

			unmount()

			expect(disposeFn).toHaveBeenCalledTimes(1)
		})

		test('previous load is cancelled when new load starts', async () => {
			const {result} = renderHook(() => useLoad<string, [string]>())

			let firstAborted = false
			let secondAborted = false

			const loadFn = result.current.load(async (disposer, value) => {
				disposer.signal.addEventListener('abort', () => {
					if (value === 'first') firstAborted = true
					if (value === 'second') secondAborted = true
				})
				await new Promise(resolve => setTimeout(resolve, 50))
				return value
			})

			// Start first load
			act(() => {
				loadFn('first')
			})

			expect(result.current.loading).toBe(true)

			// Start second load before first completes
			await new Promise(resolve => setTimeout(resolve, 10))
			let secondPromise: Promise<string>
			act(() => {
				secondPromise = loadFn('second')
			})

			// First should be aborted
			await new Promise(resolve => setTimeout(resolve, 10))
			expect(firstAborted).toBe(true)
			expect(secondAborted).toBe(false)

			// Wait for second to complete
			const value = await secondPromise!
			expect(value).toBe('second')

			await waitFor(() => {
				expect(result.current.data).toBe('second')
				expect(result.current.loading).toBe(false)
			})
		})

		test('aborted async operations do not update state', async () => {
			const {result} = renderHook(() => useLoad<number, [number]>())

			const loadFn = result.current.load(async (disposer, value) => {
				await new Promise(resolve => setTimeout(resolve, 20))
				if (disposer.signal.aborted) return -1
				return value
			})

			// Start first load
			act(() => {
				loadFn(1)
			})

			// Start second load immediately
			let secondPromise: Promise<number>
			act(() => {
				secondPromise = loadFn(2)
			})

			// Wait for both to complete
			await secondPromise!
			await new Promise(resolve => setTimeout(resolve, 30))

			// Only the second load should have updated the state
			expect(result.current.data).toBe(2)
		})

		test('load with signal already aborted returns immediately', () => {
			const {result, unmount} = renderHook(() => useLoad<string, []>())

			// Unmount to dispose the internal disposer
			unmount()

			// Remount
			const {result: newResult} = renderHook(() => useLoad<string, []>())

			const loadFn = newResult.current.load((disposer) => {
				if (disposer.signal.aborted) return 'aborted'
				return 'not-aborted'
			})

			// This should work normally since it's a new instance
			act(() => {
				const value = loadFn()
				expect(value).toBe('not-aborted')
			})
		})

		test('addDispose function is called on next load', () => {
			const disposeFn = vi.fn()
			const {result} = renderHook(() => useLoad<string, [string]>())

			const loadFn = result.current.load((disposer, value) => {
				disposer.addDispose(disposeFn)
				return value
			})

			act(() => {
				loadFn('first')
			})

			expect(disposeFn).not.toHaveBeenCalled()

			// Start second load
			act(() => {
				loadFn('second')
			})

			// First load's dispose should have been called
			expect(disposeFn).toHaveBeenCalledTimes(1)
		})

		test('multiple addDispose functions are all called', () => {
			const disposeFn1 = vi.fn()
			const disposeFn2 = vi.fn()
			const disposeFn3 = vi.fn()
			const {result, unmount} = renderHook(() => useLoad<string, []>())

			const loadFn = result.current.load((disposer) => {
				disposer.addDispose(disposeFn1)
				disposer.addDispose(disposeFn2)
				disposer.addDispose(disposeFn3)
				return 'test'
			})

			act(() => {
				loadFn()
			})

			expect(disposeFn1).not.toHaveBeenCalled()
			expect(disposeFn2).not.toHaveBeenCalled()
			expect(disposeFn3).not.toHaveBeenCalled()

			unmount()

			expect(disposeFn1).toHaveBeenCalledTimes(1)
			expect(disposeFn2).toHaveBeenCalledTimes(1)
			expect(disposeFn3).toHaveBeenCalledTimes(1)
		})

		test('loadingRef.current is set and cleared correctly', async () => {
			const {result} = renderHook(() => useLoad<string, []>())

			expect(result.current.loadingRef.current).toBeUndefined()

			const loadFn = result.current.load(async () => {
				await new Promise(resolve => setTimeout(resolve, 20))
				return 'done'
			})

			let promise: Promise<string>
			act(() => {
				promise = loadFn()
			})

			// loadingRef should be set to the promise
			expect(result.current.loadingRef.current).toBe(promise!)

			await promise!

			// loadingRef should be cleared after completion
			await waitFor(() => {
				expect(result.current.loadingRef.current).toBeUndefined()
			})
		})

		test('can use fetch with abort signal', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ data: 'test' })
			})
			global.fetch = mockFetch

			const {result} = renderHook(() => useLoad<any, [string]>())

			const loadFn = result.current.load(async (disposer, url) => {
				const response = await fetch(url, { signal: disposer.signal })
				return await response.json()
			})

			let promise: Promise<any>
			act(() => {
				promise = loadFn('https://api.example.com')
			})

			await promise!

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com',
				expect.objectContaining({
					signal: expect.any(AbortSignal)
				})
			)

			await waitFor(() => {
				expect(result.current.data).toEqual({ data: 'test' })
			})

			// Clean up
			vi.restoreAllMocks()
		})

		test('getInitial is only called once', () => {
			const getInitial = vi.fn(() => 'initial')
			const {result, rerender} = renderHook(() => useLoad(getInitial))

			expect(getInitial).toHaveBeenCalledTimes(1)
			expect(result.current.data).toBe('initial')

			rerender()
			rerender()
			rerender()

			// getInitial should still only be called once
			expect(getInitial).toHaveBeenCalledTimes(1)
		})

		test('fn can check loadingRef.current to avoid duplicate calls', async () => {
			const {result} = renderHook(() => useLoad<string, []>())

			// Track how many times we create a new promise
			let promiseCreationCount = 0

			// Create a load function that checks loadingRef to avoid duplicate work
			const loadFn = result.current.load(async () => {
				// Check if there's already an ongoing operation
				if (result.current.loadingRef.current) {
					// Return the existing promise to avoid duplicate work
					return result.current.loadingRef.current
				}

				// Create a new promise only if we don't have one
				promiseCreationCount++
				return new Promise<string>(resolve => {
					// Simulate async work
					setTimeout(() => resolve('result-' + promiseCreationCount), 50)
				})
			})

			// First call - should create a new promise
			let promise1: Promise<string>
			act(() => {
				promise1 = loadFn()
			})

			expect(promiseCreationCount).toBe(1)
			expect(result.current.loadingRef.current).toBe(promise1!)
			expect(result.current.loading).toBe(true)

			// Second call while first is still in progress
			// Should reuse the same underlying promise
			let promise2: Promise<string>
			act(() => {
				promise2 = loadFn()
			})

			expect(promiseCreationCount).toBe(1) // No new promise created
			expect(result.current.loadingRef.current).toBe(promise2!)

			// Third call - still reusing the same promise
			let promise3: Promise<string>
			act(() => {
				promise3 = loadFn()
			})

			expect(promiseCreationCount).toBe(1) // Still no new promise

			// All three calls should resolve to the same value
			const [value1, value2, value3] = await Promise.all([promise1!, promise2!, promise3!])
			expect(value1).toBe('result-1')
			expect(value2).toBe('result-1')
			expect(value3).toBe('result-1')

			await waitFor(() => {
				expect(result.current.data).toBe('result-1')
				expect(result.current.loading).toBe(false)
				expect(result.current.loadingRef.current).toBeUndefined()
			})


			// Fourth call after completion - should create a new promise
			let promise4: Promise<string>
			act(() => {
				promise4 = loadFn()
			})

			expect(promiseCreationCount).toBe(2) // New promise created

			const value4 = await promise4!
			expect(value4).toBe('result-2')

			await waitFor(() => {
				expect(result.current.data).toBe('result-2')
			})
		})

		test('multiple concurrent calls return different promises but share result', async () => {
			const {result} = renderHook(() => useLoad<string, [string]>())

			let resolveFirst: ((value: string) => void) | undefined
			let resolveSecond: ((value: string) => void) | undefined
			let resolveThird: ((value: string) => void) | undefined

			const loadFn = result.current.load(async (disposer, id) => {
				return new Promise<string>((resolve) => {
					if (id === 'first') resolveFirst = resolve
					else if (id === 'second') resolveSecond = resolve
					else if (id === 'third') resolveThird = resolve
				})
			})

			// Make three concurrent calls
			let promise1: Promise<string>
			let promise2: Promise<string>
			let promise3: Promise<string>

			act(() => {
				promise1 = loadFn('first')
			})

			act(() => {
				promise2 = loadFn('second')
			})

			act(() => {
				promise3 = loadFn('third')
			})

			// All three should be different promises (each call cancels the previous)
			expect(promise1).not.toBe(promise2)
			expect(promise2).not.toBe(promise3)
			expect(promise1).not.toBe(promise3)

			// Only the last one should be in loadingRef
			expect(result.current.loadingRef.current).toBe(promise3)

			// Resolve the first promise (but it was cancelled)
			act(() => {
				resolveFirst!('first-result')
			})

			// The first promise resolves with its value
			await expect(promise1!).resolves.toBe('first-result')

			// But state shouldn't update because it was cancelled
			expect(result.current.data).toBeUndefined()
			expect(result.current.loading).toBe(true)

			// Resolve the third promise (the active one)
			act(() => {
				resolveThird!('third-result')
			})

			await expect(promise3!).resolves.toBe('third-result')

			await waitFor(() => {
				expect(result.current.data).toBe('third-result')
				expect(result.current.loading).toBe(false)
			})

			// Second promise can still resolve but won't affect state
			act(() => {
				resolveSecond!('second-result')
			})

			await expect(promise2!).resolves.toBe('second-result')

			// State should still show third result
			expect(result.current.data).toBe('third-result')
		})

		test('loadingRef.current check pattern to avoid duplicate work', async () => {
			const {result} = renderHook(() => useLoad<string, []>())

			// Track how many times the expensive operation actually runs
			let operationCount = 0
			let resolvePromise: ((value: string) => void) | undefined

			const loadFn = result.current.load(async () => {
				// Check if there's already an ongoing operation
				// This is the key pattern - loadingRef.current is available here!
				if (result.current.loadingRef.current) {
					// Return the existing promise to avoid duplicate work
					return result.current.loadingRef.current
				}

				// No ongoing operation, start a new one
				operationCount++
				return new Promise<string>(resolve => {
					resolvePromise = resolve
				})
			})

			// First call starts the operation
			let promise1: Promise<string> | undefined
			act(() => {
				promise1 = loadFn()
			})

			expect(operationCount).toBe(1)
			expect(result.current.loading).toBe(true)
			expect(result.current.loadingRef.current).toBeDefined()

			// Second call while loading - should return the same promise
			let promise2: Promise<string> | undefined
			act(() => {
				promise2 = loadFn()
			})

			// Should NOT have started a new operation
			expect(operationCount).toBe(1)

			// Third call while still loading
			let promise3: Promise<string> | undefined
			act(() => {
				promise3 = loadFn()
			})

			// Still should NOT have started a new operation
			expect(operationCount).toBe(1)

			// Resolve the promise
			act(() => {
				resolvePromise!('result-value')
			})

			// All three calls should resolve to the same value
			const [value1, value2, value3] = await Promise.all([promise1!, promise2!, promise3!])
			expect(value1).toBe('result-value')
			expect(value2).toBe('result-value')
			expect(value3).toBe('result-value')

			await waitFor(() => {
				expect(result.current.data).toBe('result-value')
				expect(result.current.loading).toBe(false)
				expect(result.current.loadingRef.current).toBeUndefined()
			})

			// After completion, a new call should start a new operation
			let promise4: Promise<string> | undefined
			act(() => {
				promise4 = loadFn()
			})

			expect(operationCount).toBe(2) // New operation started
			expect(result.current.loading).toBe(true)
		})

		test('loadingRef.current with heavy computation pattern', async () => {
			const {result} = renderHook(() => useLoad<number, [number]>())

			// Simulate a heavy computation that we don't want to run multiple times
			let computationStartCount = 0
			let resolveComputation: ((value: number) => void) | undefined

			const loadFn = result.current.load(async (_disposer, input: number) => {
				// If already computing, return the ongoing promise
				// This pattern prevents running heavy computations multiple times
				if (result.current.loadingRef.current) {
					return result.current.loadingRef.current as Promise<number>
				}

				// Start the heavy computation
				computationStartCount++

				// Simulate heavy async work
				return new Promise<number>(resolve => {
					resolveComputation = () => resolve(input * 2)
				})
			})

			// First call with input 5
			let promise1: Promise<number> | undefined
			act(() => {
				promise1 = loadFn(5)
			})

			expect(computationStartCount).toBe(1)

			// Second call with different input while first is still running
			// Because loadingRef.current exists, it returns the ongoing promise
			// even though the input is different
			let promise2: Promise<number> | undefined
			act(() => {
				promise2 = loadFn(10)
			})

			// Should NOT have started a new computation
			expect(computationStartCount).toBe(1)

			// Complete the computation
			act(() => {
				resolveComputation!()
			})

			// Both promises get the same result (based on first input)
			const [value1, value2] = await Promise.all([promise1!, promise2!])
			expect(value1).toBe(10) // 5 * 2
			expect(value2).toBe(10) // Same result, even though input was different

			await waitFor(() => {
				expect(result.current.data).toBe(10)
				expect(result.current.loading).toBe(false)
			})
		})

		test('loadingRef.current behavior across multiple calls', async () => {
			const {result} = renderHook(() => useLoad<string, []>())

			let resolveFirst: ((value: string) => void) | undefined
			let resolveSecond: ((value: string) => void) | undefined
			let resolveThird: ((value: string) => void) | undefined

			const loadFn = result.current.load(async () => {
				// Create a new promise for this call (not reusing loadingRef.current)
				// This shows the default behavior without the optimization
				return new Promise<string>(resolve => {
					if (!resolveFirst) resolveFirst = resolve
					else if (!resolveSecond) resolveSecond = resolve
					else resolveThird = resolve
				})
			})

			// First call
			let promise1: Promise<string> | undefined
			act(() => {
				promise1 = loadFn()
			})

			// loadingRef.current is set to the first promise
			const firstLoadingRef = result.current.loadingRef.current
			expect(firstLoadingRef).toBe(promise1)
			expect(result.current.loading).toBe(true)

			// Second call - cancels the first and starts new
			let promise2: Promise<string> | undefined
			act(() => {
				promise2 = loadFn()
			})

			// loadingRef.current now points to the second promise
			const secondLoadingRef = result.current.loadingRef.current
			expect(secondLoadingRef).toBe(promise2)
			expect(secondLoadingRef).not.toBe(firstLoadingRef)

			// Third call - cancels the second and starts new
			let promise3: Promise<string> | undefined
			act(() => {
				promise3 = loadFn()
			})

			// loadingRef.current now points to the third promise
			const thirdLoadingRef = result.current.loadingRef.current
			expect(thirdLoadingRef).toBe(promise3)
			expect(thirdLoadingRef).not.toBe(secondLoadingRef)

			// Resolve first (cancelled) - doesn't affect state
			act(() => {
				resolveFirst!('first')
			})
			await expect(promise1!).resolves.toBe('first')
			expect(result.current.data).toBeUndefined()
			expect(result.current.loading).toBe(true)

			// Resolve third (active) - updates state
			act(() => {
				resolveThird!('third')
			})
			await expect(promise3!).resolves.toBe('third')

			await waitFor(() => {
				expect(result.current.data).toBe('third')
				expect(result.current.loading).toBe(false)
				expect(result.current.loadingRef.current).toBeUndefined()
			})

			// Resolve second (cancelled) - doesn't affect state
			act(() => {
				resolveSecond!('second')
			})
			await expect(promise2!).resolves.toBe('second')
			expect(result.current.data).toBe('third') // Still shows third result
		})

		test('simple loadingRef.current reuse pattern', async () => {
			const {result} = renderHook(() => useLoad<string, []>())

			let resolvePromise: ((value: string) => void) | undefined

			// Simple pattern: just return loadingRef.current if it exists
			const loadFn = result.current.load(async () => {
				// If already loading, just return the existing promise
				if (result.current.loadingRef.current) {
					return result.current.loadingRef.current
				}

				// Otherwise create a new promise for expensive work
				await new Promise(resolve => setTimeout(resolve, 100)) // Simulate delay
				return new Promise<string>(resolve => {
					resolvePromise = resolve
					// Auto-resolve after some time
					setTimeout(() => resolve('result'), 100)
				})
			})

			// First call starts the operation
			let promise1: any
			act(() => {
				promise1 = loadFn()
			})
			expect(result.current.loading).toBe(true)
			const firstLoadingRef = result.current.loadingRef.current
			expect(firstLoadingRef).toBeDefined()

			// Second call while first is still loading - returns the same promise
			let promise2: any
			act(() => {
				promise2 = loadFn()
			})
			// loadingRef.current should still be the same
			expect(result.current.loadingRef.current).toBe(promise2)

			// Third call also reuses the ongoing operation
			let promise3: any
			act(() => {
				promise3 = loadFn()
			})
			expect(result.current.loadingRef.current).toBe(promise3)

			// All three promises resolve to the same value
			const [v1, v2, v3] = await Promise.all([promise1, promise2, promise3])
			expect(v1).toBe('result')
			expect(v2).toBe('result')
			expect(v3).toBe('result')

			await waitFor(() => {
				expect(result.current.data).toBe('result')
				expect(result.current.loading).toBe(false)
				expect(result.current.loadingRef.current).toBeUndefined()
			})
		})

		test('concurrent calls with error handling', async () => {
			const {result} = renderHook(() => useLoad<string, [string]>())

			let rejectFirst: ((error: Error) => void) | undefined
			let resolveSecond: ((value: string) => void) | undefined
			let rejectThird: ((error: Error) => void) | undefined

			const loadFn = result.current.load(async (disposer, id) => {
				return new Promise<string>((resolve, reject) => {
					if (id === 'first') rejectFirst = reject
					else if (id === 'second') resolveSecond = resolve
					else if (id === 'third') rejectThird = reject
				})
			})

			// Start three operations
			let promise1: Promise<string>
			let promise2: Promise<string>
			let promise3: Promise<string>

			act(() => {
				promise1 = loadFn('first')
			})

			act(() => {
				promise2 = loadFn('second')
			})

			act(() => {
				promise3 = loadFn('third')
			})

			// Reject the first (cancelled)
			const error1 = new Error('First error')
			act(() => {
				rejectFirst!(error1)
			})

			await expect(promise1!).rejects.toThrow('First error')

			// State shouldn't be affected by cancelled operation
			expect(result.current.error).toBeUndefined()
			expect(result.current.loading).toBe(true)

			// Reject the third (active)
			const error3 = new Error('Third error')
			act(() => {
				rejectThird!(error3)
			})

			await expect(promise3!).rejects.toThrow('Third error')

			await waitFor(() => {
				expect(result.current.error).toBe(error3)
				expect(result.current.data).toBeUndefined()
				expect(result.current.loading).toBe(false)
			})

			// Resolve the second (cancelled) - shouldn't affect state
			act(() => {
				resolveSecond!('second-success')
			})

			await expect(promise2!).resolves.toBe('second-success')

			// Error state should persist
			expect(result.current.error).toBe(error3)
			expect(result.current.data).toBeUndefined()
		})

		test('loadingRef.current cleared after sync function completes', () => {
			const {result} = renderHook(() => useLoad<number, [number, number]>())

			const loadFn = result.current.load((disposer, a, b) => {
				// Check that loadingRef is undefined for sync functions
				expect(result.current.loadingRef.current).toBeUndefined()
				return a + b
			})

			let returnValue: number
			act(() => {
				returnValue = loadFn(5, 3)
			})

			expect(returnValue!).toBe(8)
			expect(result.current.data).toBe(8)
			expect(result.current.loading).toBe(false)
			expect(result.current.loadingRef.current).toBeUndefined()
		})
	})
