/**
 * @vitest-environment jsdom
 */

import { describe, expect, test, vi } from 'vitest'
import {act, renderHook} from '@testing-library/react'
import {Atom, makeAtom, useAtom, useRefState, makeDisposer} from './index'
import {useEffect, useState, useSyncExternalStore} from 'react'

describe('all', () => {
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
	})
})
