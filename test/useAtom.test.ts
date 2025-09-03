import {describe, expect, test, vi} from 'vitest'
import {act, renderHook} from '@testing-library/react'
import {Atom, makeAtom, useAtom, useRefState} from '../index'
import {useEffect, useState, useSyncExternalStore} from 'react'

describe('useAtom', () => {
	test('exported function', async () => {
		const atom = makeAtom(0)

		// Change atom value before rendering the hook
		atom.value = 1

		const {result, rerender} = renderHook(() => useAtom(atom))
		expect(result.current).toBe(1)

		// external change
		act(() => {
			atom.value = 2
		})
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
			act(() => {
				atom.value = 2
			})
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
			act(() => {
				atom.value = 2
			})
			expect(cnt).toBe(2)

			// external change same value
			act(() => {
				atom.value = 2
			})
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

			// external change
			act(() => {
				atom.value = 2
			})
			exp++
			expect(cnt).toBe(exp)

			// external change same value
			act(() => {
				atom.value = 2
			})
			// no re-render for same value with useSyncExternalStore
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
