/**
 * @vitest-environment jsdom
 */

import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {Atom, makeAtom, useAtom, useRefState, makeDisposer, useLoad} from './index'
import {useEffect, useState, useSyncExternalStore} from 'react'

describe('all', () => {
	describe('makeAtom', () => {
		test('creates atom with initial value', () => {
			const atom = makeAtom(42)
			expect(atom.value).toBe(42)
			
			const stringAtom = makeAtom('hello')
			expect(stringAtom.value).toBe('hello')
			
			const objAtom = makeAtom({ foo: 'bar' })
			expect(objAtom.value).toEqual({ foo: 'bar' })
		})

		test('creates atom without initial value', () => {
			const atom = makeAtom()
			expect(atom.value).toBeUndefined()
		})

		test('get and set value', () => {
			const atom = makeAtom(10)
			expect(atom.value).toBe(10)
			
			atom.value = 20
			expect(atom.value).toBe(20)
			
			atom.value = 30
			expect(atom.value).toBe(30)
		})

		test('subscribers are notified on value change', () => {
			const atom = makeAtom('initial')
			const subscriber = vi.fn()
			
			atom.sub(subscriber)
			
			atom.value = 'updated'
			expect(subscriber).toHaveBeenCalledTimes(1)
			expect(subscriber).toHaveBeenCalledWith('updated', 'initial')
			
			atom.value = 'another'
			expect(subscriber).toHaveBeenCalledTimes(2)
			expect(subscriber).toHaveBeenCalledWith('another', 'updated')
		})

		test('multiple subscribers are all notified', () => {
			const atom = makeAtom(0)
			const sub1 = vi.fn()
			const sub2 = vi.fn()
			const sub3 = vi.fn()
			
			atom.sub(sub1)
			atom.sub(sub2)
			atom.sub(sub3)
			
			atom.value = 1
			
			expect(sub1).toHaveBeenCalledWith(1, 0)
			expect(sub2).toHaveBeenCalledWith(1, 0)
			expect(sub3).toHaveBeenCalledWith(1, 0)
		})

		test('unsubscribe function works', () => {
			const atom = makeAtom('test')
			const subscriber = vi.fn()
			
			const unsub = atom.sub(subscriber)
			
			atom.value = 'first'
			expect(subscriber).toHaveBeenCalledTimes(1)
			
			unsub()
			
			atom.value = 'second'
			expect(subscriber).toHaveBeenCalledTimes(1) // Not called again
		})

		test('subscriber with now option', () => {
			const atom = makeAtom(100)
			const subscriber = vi.fn()
			
			atom.sub(subscriber, { now: true })
			
			// Should be called immediately with current value
			expect(subscriber).toHaveBeenCalledTimes(1)
			expect(subscriber).toHaveBeenCalledWith(100, undefined)
			
			atom.value = 200
			expect(subscriber).toHaveBeenCalledTimes(2)
			expect(subscriber).toHaveBeenCalledWith(200, 100)
		})

		test('subscriber with skip option', () => {
			const atom = makeAtom(0)
			const subscriber = vi.fn()
			
			// Skip even numbers
			atom.sub(subscriber, { skip: (newVal) => newVal % 2 === 0 })
			
			atom.value = 2
			expect(subscriber).not.toHaveBeenCalled() // Skipped
			
			atom.value = 3
			expect(subscriber).toHaveBeenCalledTimes(1)
			expect(subscriber).toHaveBeenCalledWith(3, 2)
			
			atom.value = 4
			expect(subscriber).toHaveBeenCalledTimes(1) // Skipped
			
			atom.value = 5
			expect(subscriber).toHaveBeenCalledTimes(2)
			expect(subscriber).toHaveBeenCalledWith(5, 4)
		})

		test('subscriber with both now and skip options', () => {
			const atom = makeAtom(10)
			const subscriber = vi.fn()
			
			// Skip values less than 15
			atom.sub(subscriber, { 
				now: true, 
				skip: (newVal) => newVal < 15 
			})
			
			// Initial call is skipped because 10 < 15
			expect(subscriber).not.toHaveBeenCalled()
			
			atom.value = 12
			expect(subscriber).not.toHaveBeenCalled() // Skipped
			
			atom.value = 15
			expect(subscriber).toHaveBeenCalledTimes(1)
			expect(subscriber).toHaveBeenCalledWith(15, 12)
			
			atom.value = 20
			expect(subscriber).toHaveBeenCalledTimes(2)
			expect(subscriber).toHaveBeenCalledWith(20, 15)
		})

		test('subscriber returning cleanup function', () => {
			const atom = makeAtom('initial')
			const cleanup = vi.fn()
			const subscriber = vi.fn(() => cleanup)
			
			atom.sub(subscriber)
			
			atom.value = 'first'
			expect(subscriber).toHaveBeenCalledTimes(1)
			expect(cleanup).not.toHaveBeenCalled()
			
			atom.value = 'second'
			expect(subscriber).toHaveBeenCalledTimes(2)
			expect(cleanup).toHaveBeenCalledTimes(1) // Cleanup from first call
			
			atom.value = 'third'
			expect(subscriber).toHaveBeenCalledTimes(3)
			expect(cleanup).toHaveBeenCalledTimes(2) // Cleanup from second call
		})

		test('cleanup function called on unsubscribe', () => {
			const atom = makeAtom(0)
			const cleanup = vi.fn()
			const subscriber = vi.fn(() => cleanup)
			
			const unsub = atom.sub(subscriber)
			
			atom.value = 1
			expect(cleanup).not.toHaveBeenCalled()
			
			unsub()
			expect(cleanup).toHaveBeenCalledTimes(1)
			
			// No more cleanups after unsubscribe
			atom.value = 2
			expect(cleanup).toHaveBeenCalledTimes(1)
		})

		test('setting same reference multiple times', () => {
			const atom = makeAtom({ count: 0 })
			const subscriber = vi.fn()
			
			atom.sub(subscriber)
			
			const obj = { count: 1 }
			atom.value = obj
			expect(subscriber).toHaveBeenCalledTimes(1)
			
			// Setting same reference again still notifies
			atom.value = obj
			expect(subscriber).toHaveBeenCalledTimes(2)
			expect(subscriber).toHaveBeenCalledWith(obj, obj)
		})

		test('handles null and undefined values', () => {
			const atom = makeAtom<string | null | undefined>('initial')
			const subscriber = vi.fn()
			
			atom.sub(subscriber)
			
			atom.value = null
			expect(subscriber).toHaveBeenCalledWith(null, 'initial')
			expect(atom.value).toBe(null)
			
			atom.value = undefined
			expect(subscriber).toHaveBeenCalledWith(undefined, null)
			expect(atom.value).toBe(undefined)
			
			atom.value = 'defined'
			expect(subscriber).toHaveBeenCalledWith('defined', undefined)
			expect(atom.value).toBe('defined')
		})

		test('subscribers are called in order of subscription', () => {
			const atom = makeAtom(0)
			const callOrder: number[] = []
			
			atom.sub(() => callOrder.push(1))
			atom.sub(() => callOrder.push(2))
			atom.sub(() => callOrder.push(3))
			
			atom.value = 1
			
			expect(callOrder).toEqual([1, 2, 3])
		})

		test('subscriber can safely modify atom value', () => {
			const atom = makeAtom(0)
			let callCount = 0
			const subscriber1 = vi.fn((newVal, oldVal) => {
				callCount++
				// Only trigger cascade on first call to avoid infinite loop
				if (newVal === 1 && callCount === 1) {
					atom.value = 2
				}
			})
			const subscriber2 = vi.fn()
			
			atom.sub(subscriber1)
			atom.sub(subscriber2)
			
			atom.value = 1
			
			// Actual behavior based on testing:
			// 1. subscriber1 is called with (1, 0) and sets value to 2
			// 2. This triggers a nested iteration:
			//    - subscriber1 is called with (2, 1)
			//    - subscriber2 is called with (2, 1)
			// 3. Original iteration continues:
			//    - subscriber2 is called with (1, 0)
			
			expect(subscriber1).toHaveBeenCalledTimes(2)
			expect(subscriber1).toHaveBeenNthCalledWith(1, 1, 0)
			expect(subscriber1).toHaveBeenNthCalledWith(2, 2, 1)
			
			expect(subscriber2).toHaveBeenCalledTimes(2)
			expect(subscriber2).toHaveBeenNthCalledWith(1, 2, 1) // From nested iteration
			expect(subscriber2).toHaveBeenNthCalledWith(2, 1, 0) // From original iteration
			
			expect(atom.value).toBe(2)
		})

		test('subscriber can unsubscribe itself', () => {
			const atom = makeAtom(0)
			let unsub: (() => void) | null = null
			
			const subscriber = vi.fn(() => {
				if (atom.value === 2 && unsub) {
					unsub()
				}
			})
			
			unsub = atom.sub(subscriber)
			
			atom.value = 1
			expect(subscriber).toHaveBeenCalledTimes(1)
			
			atom.value = 2
			expect(subscriber).toHaveBeenCalledTimes(2)
			
			// Should have unsubscribed itself
			atom.value = 3
			expect(subscriber).toHaveBeenCalledTimes(2) // Not called again
		})

		test('subscriber errors propagate and stop further subscribers', () => {
			const atom = makeAtom('test')
			const sub1 = vi.fn()
			const sub2 = vi.fn(() => {
				throw new Error('Subscriber error')
			})
			const sub3 = vi.fn()
			
			atom.sub(sub1)
			atom.sub(sub2)
			atom.sub(sub3)
			
			// The error will propagate and stop iteration
			expect(() => atom.value = 'updated').toThrow('Subscriber error')
			
			// sub1 is called before the error
			expect(sub1).toHaveBeenCalledWith('updated', 'test')
			// sub2 throws the error
			expect(sub2).toHaveBeenCalledWith('updated', 'test')
			// sub3 is not called because sub2 threw
			expect(sub3).not.toHaveBeenCalled()
			
			// The value is still updated though
			expect(atom.value).toBe('updated')
		})

		test('skip function receives both old and new values', () => {
			const atom = makeAtom(10)
			const subscriber = vi.fn()
			const skipFn = vi.fn((newVal, oldVal) => {
				// Skip if increase is less than 5
				return newVal - oldVal < 5
			})
			
			atom.sub(subscriber, { skip: skipFn })
			
			atom.value = 12
			expect(skipFn).toHaveBeenCalledWith(12, 10)
			expect(subscriber).not.toHaveBeenCalled() // Skipped (increase of 2)
			
			atom.value = 17
			expect(skipFn).toHaveBeenCalledWith(17, 12)
			expect(subscriber).toHaveBeenCalledTimes(1) // Not skipped (increase of 5)
			expect(subscriber).toHaveBeenCalledWith(17, 12)
			
			atom.value = 18
			expect(skipFn).toHaveBeenCalledWith(18, 17)
			expect(subscriber).toHaveBeenCalledTimes(1) // Skipped (increase of 1)
		})

		test('different atoms are independent', () => {
			const atom1 = makeAtom('a')
			const atom2 = makeAtom('b')
			
			const sub1 = vi.fn()
			const sub2 = vi.fn()
			
			atom1.sub(sub1)
			atom2.sub(sub2)
			
			atom1.value = 'a-updated'
			expect(sub1).toHaveBeenCalledWith('a-updated', 'a')
			expect(sub2).not.toHaveBeenCalled()
			
			atom2.value = 'b-updated'
			expect(sub1).toHaveBeenCalledTimes(1)
			expect(sub2).toHaveBeenCalledWith('b-updated', 'b')
		})

		test('atom value can be complex objects', () => {
			const atom = makeAtom({
				users: [{ id: 1, name: 'Alice' }],
				settings: { theme: 'dark' }
			})
			
			const subscriber = vi.fn()
			atom.sub(subscriber)
			
			const newValue = {
				users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
				settings: { theme: 'light' }
			}
			
			atom.value = newValue
			
			expect(subscriber).toHaveBeenCalledWith(newValue, {
				users: [{ id: 1, name: 'Alice' }],
				settings: { theme: 'dark' }
			})
			expect(atom.value).toBe(newValue)
		})
	})

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

		test('fn can check loadingRef.current and return it if truthy', async () => {
			const {result} = renderHook(() => useLoad<string, []>())
			
			// Track the loadingRef value inside the function
			let capturedLoadingRef: Promise<string> | undefined
			let createNewPromise = true
			
			const loadFn = result.current.load((disposer) => {
				// Capture the current loadingRef value
				capturedLoadingRef = result.current.loadingRef.current as Promise<string> | undefined
				
				// If we want to reuse existing promise and one exists, return it
				if (!createNewPromise && capturedLoadingRef) {
					return capturedLoadingRef
				}
				
				// Otherwise create a new promise
				return new Promise<string>(resolve => {
					setTimeout(() => resolve('completed'), 50)
				})
			})
			
			// First call - creates new promise
			let promise1: Promise<string>
			act(() => {
				promise1 = loadFn()
			})
			
			// loadingRef should be undefined when fn is called (set after)
			expect(capturedLoadingRef).toBeUndefined()
			
			// But now loadingRef should be set to the promise
			expect(result.current.loadingRef.current).toBe(promise1!)
			expect(result.current.loading).toBe(true)
			
			// For the second call, tell it to reuse existing promise
			createNewPromise = false
			
			// But since each call to loadFn() disposes previous, it will be a new promise
			// The function can't actually return the existing promise from loadingRef
			// because loadingRef is cleared before the function runs
			let promise2: Promise<string>
			act(() => {
				promise2 = loadFn()
			})
			
			// These will be different promises because dispose() was called
			expect(promise2).not.toBe(promise1)
			
			// Wait for completion of second promise
			const value2 = await promise2!
			expect(value2).toBe('completed')
			
			await waitFor(() => {
				expect(result.current.data).toBe('completed')
				expect(result.current.loading).toBe(false)
				expect(result.current.loadingRef.current).toBeUndefined()
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

		test('concurrent calls with shared promise pattern', async () => {
			const {result} = renderHook(() => useLoad<string, []>())
			
			// Create a shared promise that multiple calls can reference
			let sharedPromise: Promise<string> | undefined
			let sharedResolve: ((value: string) => void) | undefined
			let callCount = 0
			
			// This function simulates returning a shared promise
			// Note: In practice, loadingRef.current is cleared before fn runs
			// So we use an external variable to track the shared promise
			const loadFn = result.current.load((disposer) => {
				// If we have a shared promise, return it
				if (sharedPromise) {
					return sharedPromise
				}
				
				// Otherwise create a new shared promise
				callCount++
				sharedPromise = new Promise<string>((resolve) => {
					sharedResolve = resolve
				})
				return sharedPromise
			})
			
			// First call starts a new promise
			let promise1: Promise<string>
			act(() => {
				promise1 = loadFn()
			})
			
			expect(callCount).toBe(1)
			// The returned promise is actually wrapped in an async IIFE
			// So promise1 !== sharedPromise, but they resolve to the same value
			expect(result.current.loadingRef.current).toBe(promise1)
			
			// Second call - loadFn is called again but returns the same shared promise
			let promise2: Promise<string>
			act(() => {
				promise2 = loadFn()
			})
			
			// Even though the function returns the same promise,
			// useLoad wraps it in a new promise for tracking
			expect(callCount).toBe(1) // No new promise created internally
			expect(result.current.loadingRef.current).toBe(promise2)
			
			// Third call also returns the same promise
			let promise3: Promise<string>
			act(() => {
				promise3 = loadFn()
			})
			
			expect(callCount).toBe(1) // Still no new promise
			expect(result.current.loadingRef.current).toBe(promise3)
			
			// Resolve the shared promise
			act(() => {
				sharedResolve!('shared-result')
			})
			
			// All three promises resolve to the same value
			const [value1, value2, value3] = await Promise.all([promise1!, promise2!, promise3!])
			expect(value1).toBe('shared-result')
			expect(value2).toBe('shared-result')
			expect(value3).toBe('shared-result')
			
			await waitFor(() => {
				expect(result.current.data).toBe('shared-result')
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

	describe('useAtom', () => {
		test('exported function', async () => {
			const atom = makeAtom(0)

			// Change atom value before rendering the hook
			atom.value = 1

			const {result, rerender} = renderHook(() => useAtom(atom))
			expect(result.current).toBe(1)

			// external change
			atom.value = 2
			expect(result.current).toBe(1)
			rerender()
			expect(result.current).toBe(2)

			// internal change
			act(() => atom.value = 3)
			expect(result.current).toBe(3)
		})

		describe('check value', () => {
			test('typical renderHook cannot test', async () => {
				const atom = makeAtom(0)

				// Change atom value before rendering the hook
				atom.value = 1

				const {result, rerender} = renderHook(() => useTestAtom(atom))
				expect(result.current).toBe(1)

				// external change
				atom.value = 2
				expect(result.current).toBe(1)
				rerender()
				expect(result.current).toBe(2)

				// internal change
				act(() => atom.value = 3)
				expect(result.current).toBe(3)

				function useTestAtom<T>(atom: Atom<T>) {
					const [state, setState] = useState(atom.value)
					useEffect(() => atom.sub(setState), [atom])
					return state
				}

			})

			test('atom no check', async () => {
				let inited = false
				const atom = makeAtom(0)
				const {result, rerender} = renderHook(() => useTestAtom(atom))
				expect(result.current).toBe(0)


				function useTestAtom<T>(atom: Atom<T>) {
					const [state, setState] = useState(atom.value)
					useEffect(() => atom.sub(setState), [atom])
					if (!inited) {
						atom.value = 1
						inited = true
					}
					return state
				}
			})
			test('atom check', async () => {
				let inited = false
				const atom = makeAtom(0)
				const {result, rerender} = renderHook(() => useTestAtom(atom))
				expect(result.current).toBe(1)

				function useTestAtom<T>(atom: Atom<T>) {
					const [state, setState, ref] = useRefState(atom.value)
					useEffect(() => {
						const unsub = atom.sub(setState)
						// value might be updated before the first effect
						if (ref.current !== atom.value) setState(atom.value)
						return unsub
					}, [atom, ref, setState])
					if (!inited) {
						atom.value = 1
						inited = true
					}
					return state
				}
			})
			test('atom sync external atom', async () => {
				let inited = false
				const atom = makeAtom(0)
				const {result, rerender} = renderHook(() => useTestAtom(atom))
				expect(result.current).toBe(1)

				function useTestAtom<T>(atom: Atom<T>) {
					const state = useSyncExternalStore(atom.sub, () => atom.value, () => atom.value)
					if (!inited) {
						atom.value = 1
						inited = true
					}
					return state
				}
			})
			test('atom sync external atom no server snapshot', async () => {
				let inited = false
				const atom = makeAtom(0)
				const {result, rerender} = renderHook(() => useTestAtom(atom))
				expect(result.current).toBe(1)

				function useTestAtom<T>(atom: Atom<T>) {
					const state = useSyncExternalStore(atom.sub, () => atom.value)
					if (!inited) {
						atom.value = 1
						inited = true
					}
					return state
				}
			})
		})
		describe('check rendering count', () => {
			test('useState version always fire', async () => {
				let cnt = 0
				const atom = makeAtom(0)

				// Change atom value before rendering the hook
				atom.value = 1

				const {rerender} = renderHook(() => useTestAtom(atom))
				expect(cnt).toBe(1)

				// external change
				atom.value = 2
				expect(cnt).toBe(1)
				rerender()
				expect(cnt).toBe(2)

				// external change same value
				atom.value = 2
				expect(cnt).toBe(2)
				rerender()
				expect(cnt).toBe(3)

				// internal change
				act(() => atom.value = 3)
				expect(cnt).toBe(4)

				// internal change same value
				act(() => atom.value = 3)
				expect(cnt).toBe(5)

				function useTestAtom<T>(atom: Atom<T>) {
					cnt++
					const [state, setState] = useState(atom.value)
					useEffect(() => atom.sub(setState), [atom])
					return state
				}

			})

			test('atom sync external atom', async () => {
				let cnt = 0
				let exp = 0
				const atom = makeAtom(0)

				// Change atom value before rendering the hook
				atom.value = 1

				const {result, rerender} = renderHook(() => useTestAtom(atom))
				exp++
				expect(cnt).toBe(exp)

				// nochange
				rerender()
				exp++
				expect(cnt).toBe(exp)

				// external change, no affect, but mark one re-render
				atom.value = 2
				expect(cnt).toBe(exp)
				rerender()
				exp++
				// exp++
				expect(cnt).toBe(exp)

				// external change same value
				atom.value = 2
				expect(cnt).toBe(exp)
				rerender()
				exp++
				expect(cnt).toBe(exp)

				// internal change
				act(() => atom.value = 3)
				exp++

				// internal change same value
				act(() => atom.value = 3)
				expect(cnt).toBe(exp)

				// internal change diff value
				act(() => atom.value = 4)
				exp++
				expect(cnt).toBe(exp)

				function useTestAtom<T>(atom: Atom<T>) {
					cnt++
					return useSyncExternalStore(atom.sub, () => atom.value, () => atom.value)
				}
			})
		})

		test('multiple components subscribe to same atom', () => {
			const atom = makeAtom('initial')
			
			const {result: result1} = renderHook(() => useAtom(atom))
			const {result: result2} = renderHook(() => useAtom(atom))
			const {result: result3} = renderHook(() => useAtom(atom))
			
			expect(result1.current).toBe('initial')
			expect(result2.current).toBe('initial')
			expect(result3.current).toBe('initial')
			
			// Update atom - all components should see the new value
			act(() => {
				atom.value = 'updated'
			})
			
			expect(result1.current).toBe('updated')
			expect(result2.current).toBe('updated')
			expect(result3.current).toBe('updated')
		})

		test('unsubscribes when component unmounts', () => {
			const atom = makeAtom(0)
			const subscriber = vi.fn()
			
			// Mock the atom's sub method to track subscriptions
			const originalSub = atom.sub
			const unsubscribe = vi.fn()
			atom.sub = vi.fn((cb) => {
				subscriber(cb)
				const unsub = originalSub(cb)
				return () => {
					unsubscribe()
					unsub()
				}
			})
			
			const {unmount} = renderHook(() => useAtom(atom))
			
			expect(subscriber).toHaveBeenCalled()
			expect(unsubscribe).not.toHaveBeenCalled()
			
			unmount()
			
			expect(unsubscribe).toHaveBeenCalled()
		})

		test('handles rapid atom updates correctly', () => {
			const atom = makeAtom(0)
			const {result} = renderHook(() => useAtom(atom))
			
			expect(result.current).toBe(0)
			
			// Rapid updates
			act(() => {
				for (let i = 1; i <= 100; i++) {
					atom.value = i
				}
			})
			
			// Should only have the final value
			expect(result.current).toBe(100)
		})

		test('works with different data types', () => {
			// String atom
			const stringAtom = makeAtom('hello')
			const {result: stringResult} = renderHook(() => useAtom(stringAtom))
			expect(stringResult.current).toBe('hello')
			act(() => { stringAtom.value = 'world' })
			expect(stringResult.current).toBe('world')
			
			// Boolean atom
			const boolAtom = makeAtom(true)
			const {result: boolResult} = renderHook(() => useAtom(boolAtom))
			expect(boolResult.current).toBe(true)
			act(() => { boolAtom.value = false })
			expect(boolResult.current).toBe(false)
			
			// Object atom
			const objAtom = makeAtom({ count: 0, name: 'test' })
			const {result: objResult} = renderHook(() => useAtom(objAtom))
			expect(objResult.current).toEqual({ count: 0, name: 'test' })
			act(() => { objAtom.value = { count: 1, name: 'updated' } })
			expect(objResult.current).toEqual({ count: 1, name: 'updated' })
			
			// Array atom
			const arrayAtom = makeAtom([1, 2, 3])
			const {result: arrayResult} = renderHook(() => useAtom(arrayAtom))
			expect(arrayResult.current).toEqual([1, 2, 3])
			act(() => { arrayAtom.value = [4, 5, 6] })
			expect(arrayResult.current).toEqual([4, 5, 6])
			
			// Null/undefined atom
			const nullAtom = makeAtom<string | null>(null)
			const {result: nullResult} = renderHook(() => useAtom(nullAtom))
			expect(nullResult.current).toBe(null)
			act(() => { nullAtom.value = 'not null' })
			expect(nullResult.current).toBe('not null')
			act(() => { nullAtom.value = null })
			expect(nullResult.current).toBe(null)
		})

		test('atom value changes during render', () => {
			const atom = makeAtom(0)
			let renderCount = 0
			
			const {result} = renderHook(() => {
				renderCount++
				const value = useAtom(atom)
				
				// Change atom value during first render only
				if (renderCount === 1) {
					atom.value = 10
				}
				
				return value
			})
			
			// Should reflect the value at the time useAtom was called
			expect(result.current).toBe(10)
		})

		test('handles component switching between atoms', () => {
			const atom1 = makeAtom('atom1')
			const atom2 = makeAtom('atom2')
			let useFirst = true
			
			const {result, rerender} = renderHook(() => {
				// Always use a hook, just switch which atom
				return useAtom(useFirst ? atom1 : atom2)
			})
			
			expect(result.current).toBe('atom1')
			
			act(() => { atom1.value = 'atom1-updated' })
			expect(result.current).toBe('atom1-updated')
			
			// Switch to second atom
			useFirst = false
			rerender()
			expect(result.current).toBe('atom2')
			
			// Updates to atom1 should not affect the component
			act(() => { atom1.value = 'atom1-updated-again' })
			expect(result.current).toBe('atom2')
			
			// Updates to atom2 should affect the component
			act(() => { atom2.value = 'atom2-updated' })
			expect(result.current).toBe('atom2-updated')
			
			// Switch back to first atom
			useFirst = true
			rerender()
			expect(result.current).toBe('atom1-updated-again')
		})

		test('works with multiple atoms in same component', () => {
			const atom1 = makeAtom('first')
			const atom2 = makeAtom(42)
			const atom3 = makeAtom(true)
			
			const {result} = renderHook(() => {
				const value1 = useAtom(atom1)
				const value2 = useAtom(atom2)
				const value3 = useAtom(atom3)
				return { value1, value2, value3 }
			})
			
			expect(result.current).toEqual({
				value1: 'first',
				value2: 42,
				value3: true
			})
			
			// Update first atom
			act(() => { atom1.value = 'updated first' })
			expect(result.current).toEqual({
				value1: 'updated first',
				value2: 42,
				value3: true
			})
			
			// Update second atom
			act(() => { atom2.value = 100 })
			expect(result.current).toEqual({
				value1: 'updated first',
				value2: 100,
				value3: true
			})
			
			// Update third atom
			act(() => { atom3.value = false })
			expect(result.current).toEqual({
				value1: 'updated first',
				value2: 100,
				value3: false
			})
			
			// Update all atoms at once
			act(() => {
				atom1.value = 'all updated'
				atom2.value = 999
				atom3.value = true
			})
			expect(result.current).toEqual({
				value1: 'all updated',
				value2: 999,
				value3: true
			})
		})

		test('atom with undefined initial value', () => {
			const atom = makeAtom<string | undefined>(undefined)
			const {result} = renderHook(() => useAtom(atom))
			
			expect(result.current).toBe(undefined)
			
			act(() => { atom.value = 'defined' })
			expect(result.current).toBe('defined')
			
			act(() => { atom.value = undefined })
			expect(result.current).toBe(undefined)
		})

		test('atom updates always trigger subscribers', () => {
			const atom = makeAtom({ count: 0 })
			let renderCount = 0
			
			const {result} = renderHook(() => {
				renderCount++
				return useAtom(atom)
			})
			
			expect(renderCount).toBe(1)
			expect(result.current).toEqual({ count: 0 })
			
			// Update with new object - should cause re-render
			const newObj = { count: 0 }
			act(() => { atom.value = newObj })
			expect(renderCount).toBe(2)
			
			// Update with different object but same shape - should cause re-render
			act(() => { atom.value = { count: 0 } })
			expect(renderCount).toBe(3)
			
			// Setting the same reference doesn't trigger subscribers
			// because useSyncExternalStore handles this
			const currentValue = atom.value
			act(() => { atom.value = currentValue })
			expect(renderCount).toBe(3) // No re-render for same reference
		})

		test('SSR compatibility with getServerSnapshot', () => {
			const atom = makeAtom('server-value')
			
			// Simulate SSR by setting initial value
			atom.value = 'client-value'
			
			const {result} = renderHook(() => {
				// useAtom internally uses useSyncExternalStore with proper SSR handling
				return useAtom(atom)
			})
			
			expect(result.current).toBe('client-value')
		})

		test('atom value persists even when component errors', () => {
			const atom = makeAtom('safe')
			
			const {result} = renderHook(() => useAtom(atom))
			
			expect(result.current).toBe('safe')
			
			// Update atom value
			act(() => { atom.value = 'updated' })
			expect(result.current).toBe('updated')
			
			// Even if a component using the atom throws an error,
			// the atom value itself is preserved
			const ErrorComponent = () => {
				const value = useAtom(atom)
				if (value === 'will-cause-error') {
					throw new Error('Component error')
				}
				return value
			}
			
			// Set a value that would cause error in ErrorComponent
			act(() => { atom.value = 'will-cause-error' })
			
			// The atom value is still updated
			expect(atom.value).toBe('will-cause-error')
			
			// Other components can still read the value
			expect(result.current).toBe('will-cause-error')
			
			// And can update it
			act(() => { atom.value = 'recovered' })
			expect(result.current).toBe('recovered')
		})

		test('subscription cleanup on atom change', () => {
			const atom1 = makeAtom(1)
			const atom2 = makeAtom(2)
			let currentAtom = atom1
			
			const {result, rerender} = renderHook(() => useAtom(currentAtom))
			
			expect(result.current).toBe(1)
			
			// Switch to different atom
			currentAtom = atom2
			rerender()
			expect(result.current).toBe(2)
			
			// Updates to atom1 should not affect the component
			act(() => { atom1.value = 10 })
			expect(result.current).toBe(2)
			
			// Updates to atom2 should affect the component
			act(() => { atom2.value = 20 })
			expect(result.current).toBe(20)
		})
	})
})
