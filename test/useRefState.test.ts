import {describe, it, expect} from 'vitest'
import {renderHook, act} from '@testing-library/react'
import {useRefState} from '../index.js'

describe('useRefState', () => {
	it('should initialize with provided value', () => {
		const {result} = renderHook(() => useRefState('initial'))
		
		expect(result.current[0]).toBe('initial')
		expect(result.current[2].current).toBe('initial')
	})

	it('should initialize with undefined when no value provided', () => {
		const {result} = renderHook(() => useRefState())
		
		expect(result.current[0]).toBe(undefined)
		expect(result.current[2].current).toBe(undefined)
	})

	it('should update state and ref when setState is called', () => {
		const {result} = renderHook(() => useRefState('initial'))
		
		act(() => {
			result.current[1]('updated')
		})
		
		expect(result.current[0]).toBe('updated')
		expect(result.current[2].current).toBe('updated')
	})

	it('should handle function updates', () => {
		const {result} = renderHook(() => useRefState(0))
		
		act(() => {
			result.current[1](prev => prev + 1)
		})
		
		expect(result.current[0]).toBe(1)
		expect(result.current[2].current).toBe(1)
		
		act(() => {
			result.current[1](prev => prev * 2)
		})
		
		expect(result.current[0]).toBe(2)
		expect(result.current[2].current).toBe(2)
	})

	it('should not trigger re-render when setting same value', () => {
		let renderCount = 0
		const {result} = renderHook(() => {
			renderCount++
			return useRefState('value')
		})
		
		expect(renderCount).toBe(1)
		
		act(() => {
			result.current[1]('value')
		})
		
		expect(renderCount).toBe(1)
		expect(result.current[0]).toBe('value')
		expect(result.current[2].current).toBe('value')
	})

	it('should maintain stable setState and ref references', () => {
		const {result, rerender} = renderHook(() => useRefState('value'))
		
		const firstSetState = result.current[1]
		const firstRef = result.current[2]
		
		act(() => {
			result.current[1]('new value')
		})
		
		expect(result.current[1]).toBe(firstSetState)
		expect(result.current[2]).toBe(firstRef)
		
		rerender()
		
		expect(result.current[1]).toBe(firstSetState)
		expect(result.current[2]).toBe(firstRef)
	})

	it('should work with objects', () => {
		const {result} = renderHook(() => useRefState({count: 0}))
		
		expect(result.current[0]).toEqual({count: 0})
		expect(result.current[2].current).toEqual({count: 0})
		
		const newObj = {count: 5}
		act(() => {
			result.current[1](newObj)
		})
		
		expect(result.current[0]).toBe(newObj)
		expect(result.current[2].current).toBe(newObj)
	})

	it('should work with arrays', () => {
		const {result} = renderHook(() => useRefState([1, 2, 3]))
		
		expect(result.current[0]).toEqual([1, 2, 3])
		expect(result.current[2].current).toEqual([1, 2, 3])
		
		act(() => {
			result.current[1]([4, 5, 6])
		})
		
		expect(result.current[0]).toEqual([4, 5, 6])
		expect(result.current[2].current).toEqual([4, 5, 6])
	})

	it('should handle null and undefined', () => {
		const {result} = renderHook(() => useRefState<string | null | undefined>(null))
		
		expect(result.current[0]).toBe(null)
		expect(result.current[2].current).toBe(null)
		
		act(() => {
			result.current[1](undefined)
		})
		
		expect(result.current[0]).toBe(undefined)
		expect(result.current[2].current).toBe(undefined)
		
		act(() => {
			result.current[1]('value')
		})
		
		expect(result.current[0]).toBe('value')
		expect(result.current[2].current).toBe('value')
	})

	it('should have ref immediately updated on setState', () => {
		const {result} = renderHook(() => useRefState(1))
		
		act(() => {
			result.current[1](2)
			expect(result.current[2].current).toBe(2)
		})
		
		expect(result.current[0]).toBe(2)
	})

	it('should not trigger update for same object reference', () => {
		const obj = {a: 1}
		let renderCount = 0
		
		const {result} = renderHook(() => {
			renderCount++
			return useRefState(obj)
		})
		
		expect(renderCount).toBe(1)
		
		act(() => {
			result.current[1](obj)
		})
		
		expect(renderCount).toBe(1)
		expect(result.current[0]).toBe(obj)
		expect(result.current[2].current).toBe(obj)
	})

	it('should trigger update for different object with same values', () => {
		let renderCount = 0
		
		const {result} = renderHook(() => {
			renderCount++
			return useRefState({a: 1})
		})
		
		expect(renderCount).toBe(1)
		
		act(() => {
			result.current[1]({a: 1})
		})
		
		expect(renderCount).toBe(2)
		expect(result.current[0]).toEqual({a: 1})
	})

	it('should handle complex state updates with function', () => {
		const {result} = renderHook(() => 
			useRefState<{count: number, items: string[]}>({
				count: 0,
				items: []
			})
		)
		
		act(() => {
			result.current[1](prev => ({
				count: prev.count + 1,
				items: [...prev.items, 'item']
			}))
		})
		
		expect(result.current[0]).toEqual({count: 1, items: ['item']})
		expect(result.current[2].current).toEqual({count: 1, items: ['item']})
	})
})