/**
 * @vitest-environment jsdom
 */

import { describe, expect, test } from 'vitest'
import {act, renderHook} from '@testing-library/react'
import {AtomState, makeAtom, useAtom, useRefState} from './index'
import {useEffect, useState, useSyncExternalStore} from 'react'

describe('useAtom', () => {
	test('exported function', async () => {
		const atom = makeAtom(0)

		// Change atom value before rendering the hook
		atom.value = 1

		const { result, rerender} = renderHook(() => useAtom(atom))
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

			const { result, rerender} = renderHook(() => useTestAtom(atom))
			expect(result.current).toBe(1)

			// external change
			atom.value = 2
			expect(result.current).toBe(1)
			rerender()
			expect(result.current).toBe(2)

			// internal change
			act(() => atom.value = 3)
			expect(result.current).toBe(3)

			function useTestAtom<T>(atom: AtomState<T>) {
				const [state, setState] = useState(atom.value)
				useEffect(() => atom.sub(setState), [atom])
				return state
			}

		})

		test('atom no check', async () => {
			let inited = false
			const atom = makeAtom(0)
			const { result, rerender} = renderHook(() => useTestAtom(atom))
			expect(result.current).toBe(0)


			function useTestAtom<T>(atom: AtomState<T>) {
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
			const { result, rerender} = renderHook(() => useTestAtom(atom))
			expect(result.current).toBe(1)

			function useTestAtom<T>(atom: AtomState<T>) {
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
			const { result, rerender} = renderHook(() => useTestAtom(atom))
			expect(result.current).toBe(1)

			function useTestAtom<T>(atom: AtomState<T>) {
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
			const { result, rerender} = renderHook(() => useTestAtom(atom))
			expect(result.current).toBe(1)

			function useTestAtom<T>(atom: AtomState<T>) {
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

			const { rerender} = renderHook(() => useTestAtom(atom))
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

			function useTestAtom<T>(atom: AtomState<T>) {
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

			const { result, rerender} = renderHook(() => useTestAtom(atom))
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
			exp++
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

			function useTestAtom<T>(atom: AtomState<T>) {
				cnt++
				return useSyncExternalStore(atom.sub, () => atom.value, () => atom.value)
			}
		})
	})
})
