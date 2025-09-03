import {describe, it, expect, vi} from 'vitest'
import {renderHook} from '@testing-library/react'
import {useLayoutEffectWithPrevDeps} from '../index.js'

describe('useLayoutEffectWithPrevDeps', () => {
	it('should call effect with empty array on mount', () => {
		const effect = vi.fn()
		
		renderHook(() => useLayoutEffectWithPrevDeps(effect, ['dep1', 'dep2'] as const))
		
		expect(effect).toHaveBeenCalledTimes(1)
		expect(effect).toHaveBeenCalledWith([])
	})

	it('should call effect with previous deps on update', () => {
		const effect = vi.fn()
		
		const {rerender} = renderHook(
			({deps}) => useLayoutEffectWithPrevDeps(effect, deps),
			{initialProps: {deps: ['a', 1] as const}}
		)
		
		expect(effect).toHaveBeenCalledTimes(1)
		expect(effect).toHaveBeenCalledWith([])
		
		effect.mockClear()
		rerender({deps: ['b', 2] as const})
		
		expect(effect).toHaveBeenCalledTimes(1)
		expect(effect).toHaveBeenCalledWith(['a', 1])
	})

	it('should handle cleanup function', () => {
		const cleanup = vi.fn()
		const effect = vi.fn(() => cleanup)
		
		const {rerender, unmount} = renderHook(
			({deps}) => useLayoutEffectWithPrevDeps(effect, deps),
			{initialProps: {deps: [1] as const}}
		)
		
		expect(cleanup).not.toHaveBeenCalled()
		
		rerender({deps: [2] as const})
		expect(cleanup).toHaveBeenCalledTimes(1)
		
		unmount()
		expect(cleanup).toHaveBeenCalledTimes(2)
	})

	it('should not run effect when deps dont change', () => {
		const effect = vi.fn()
		
		const {rerender} = renderHook(
			({deps}) => useLayoutEffectWithPrevDeps(effect, deps),
			{initialProps: {deps: ['a', 1] as const}}
		)
		
		expect(effect).toHaveBeenCalledTimes(1)
		
		effect.mockClear()
		rerender({deps: ['a', 1] as const})
		
		expect(effect).not.toHaveBeenCalled()
	})

	it('should work with empty deps array', () => {
		const effect = vi.fn()
		
		const {rerender} = renderHook(() => 
			useLayoutEffectWithPrevDeps(effect, [] as const)
		)
		
		expect(effect).toHaveBeenCalledTimes(1)
		expect(effect).toHaveBeenCalledWith([])
		
		effect.mockClear()
		rerender()
		
		expect(effect).not.toHaveBeenCalled()
	})

	it('should handle multiple dependency types', () => {
		const effect = vi.fn()
		const obj = {a: 1}
		const arr = [1, 2]
		const fn = () => {}
		
		const {rerender} = renderHook(
			({deps}) => useLayoutEffectWithPrevDeps(effect, deps),
			{initialProps: {deps: ['string', 42, true, obj, arr, fn, null, undefined] as const}}
		)
		
		expect(effect).toHaveBeenCalledWith([])
		
		const newObj = {b: 2}
		const newArr = [3, 4]
		const newFn = () => {}
		
		effect.mockClear()
		rerender({deps: ['newString', 100, false, newObj, newArr, newFn, undefined, null] as const})
		
		expect(effect).toHaveBeenCalledWith(['string', 42, true, obj, arr, fn, null, undefined])
	})

	it('should run synchronously like useLayoutEffect', () => {
		const order: string[] = []
		
		renderHook(() => {
			useLayoutEffectWithPrevDeps(() => {
				order.push('layout')
			}, [1] as const)
			
			order.push('render')
		})
		
		expect(order).toEqual(['render', 'layout'])
	})

	it('should handle cleanup function returning undefined', () => {
		const effect = vi.fn(() => undefined)
		
		const {unmount} = renderHook(() => 
			useLayoutEffectWithPrevDeps(effect, [1] as const)
		)
		
		expect(effect).toHaveBeenCalledTimes(1)
		unmount()
	})

	it('should call cleanup in correct order', () => {
		const order: string[] = []
		const cleanup1 = () => { order.push('cleanup1') }
		const cleanup2 = () => { order.push('cleanup2') }
		
		const effect = vi.fn((prevDeps) => {
			if (prevDeps[0] === undefined) {
				order.push('effect1')
				return cleanup1
			} else {
				order.push('effect2')
				return cleanup2
			}
		})
		
		const {rerender, unmount} = renderHook(
			({deps}) => useLayoutEffectWithPrevDeps(effect, deps),
			{initialProps: {deps: [1] as const}}
		)
		
		expect(order).toEqual(['effect1'])
		
		rerender({deps: [2] as const})
		expect(order).toEqual(['effect1', 'cleanup1', 'effect2'])
		
		unmount()
		expect(order).toEqual(['effect1', 'cleanup1', 'effect2', 'cleanup2'])
	})

	it('should preserve deps reference across renders', () => {
		const effects: any[] = []
		const effect = vi.fn((prevDeps) => {
			effects.push(prevDeps)
		})
		
		const {rerender} = renderHook(
			({deps}) => useLayoutEffectWithPrevDeps(effect, deps),
			{initialProps: {deps: ['a', 'b'] as const}}
		)
		
		// First call gets empty array
		expect(effects[0]).toEqual([])
		
		rerender({deps: ['c', 'd'] as const})
		
		// Second call gets the previous deps
		expect(effects[1]).toEqual(['a', 'b'])
	})
})