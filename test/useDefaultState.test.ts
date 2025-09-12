import {describe, it, expect} from './helpers.ts'
import {renderHook, act} from './helpers.ts'
import {useDefaultState} from '../index.js'

describe('useDefaultState', () => {
	it('should initialize with default state', () => {
		const {result} = renderHook(() => useDefaultState('initial'))
		expect(result.current[0]).toBe('initial')
	})

	it('should update state when setState is called', () => {
		const {result} = renderHook(() => useDefaultState('initial'))
		
		act(() => {
			result.current[1]('updated')
		})
		
		expect(result.current[0]).toBe('updated')
	})

	it('should reset to new default when default changes', () => {
		const {result, rerender} = renderHook(
			({defaultValue}) => useDefaultState(defaultValue),
			{initialProps: {defaultValue: 'first'}}
		)
		
		expect(result.current[0]).toBe('first')
		
		act(() => {
			result.current[1]('modified')
		})
		expect(result.current[0]).toBe('modified')
		
		rerender({defaultValue: 'second'})
		expect(result.current[0]).toBe('second')
	})

	it('should handle function updates', () => {
		const {result} = renderHook(() => useDefaultState(0))
		
		act(() => {
			result.current[1](prev => prev + 1)
		})
		expect(result.current[0]).toBe(1)
		
		act(() => {
			result.current[1](prev => prev * 2)
		})
		expect(result.current[0]).toBe(2)
	})

	it('should work with objects', () => {
		const {result, rerender} = renderHook(
			({defaultValue}) => useDefaultState(defaultValue),
			{initialProps: {defaultValue: {count: 0}}}
		)
		
		expect(result.current[0]).toEqual({count: 0})
		
		act(() => {
			result.current[1]({count: 5})
		})
		expect(result.current[0]).toEqual({count: 5})
		
		rerender({defaultValue: {count: 10}})
		expect(result.current[0]).toEqual({count: 10})
	})

	it('should work with arrays', () => {
		const {result, rerender} = renderHook(
			({defaultValue}) => useDefaultState(defaultValue),
			{initialProps: {defaultValue: [1, 2, 3]}}
		)
		
		expect(result.current[0]).toEqual([1, 2, 3])
		
		act(() => {
			result.current[1]([4, 5, 6])
		})
		expect(result.current[0]).toEqual([4, 5, 6])
		
		rerender({defaultValue: [7, 8, 9]})
		expect(result.current[0]).toEqual([7, 8, 9])
	})

	it('should handle null and undefined', () => {
		const {result, rerender} = renderHook(
			({defaultValue}) => useDefaultState(defaultValue),
			{initialProps: {defaultValue: null as any}}
		)
		
		expect(result.current[0]).toBe(null)
		
		act(() => {
			result.current[1](undefined)
		})
		expect(result.current[0]).toBe(undefined)
		
		rerender({defaultValue: 'value'})
		expect(result.current[0]).toBe('value')
	})

	it('should maintain stable setState function', () => {
		const {result, rerender} = renderHook(
			({defaultValue}) => useDefaultState(defaultValue),
			{initialProps: {defaultValue: 'value'}}
		)
		
		const firstSetState = result.current[1]
		
		rerender({defaultValue: 'new value'})
		expect(result.current[1]).toBe(firstSetState)
		
		act(() => {
			result.current[1]('updated')
		})
		expect(result.current[1]).toBe(firstSetState)
	})

	it('should handle rapid default changes', () => {
		const {result, rerender} = renderHook(
			({defaultValue}) => useDefaultState(defaultValue),
			{initialProps: {defaultValue: 1}}
		)
		
		expect(result.current[0]).toBe(1)
		
		rerender({defaultValue: 2})
		expect(result.current[0]).toBe(2)
		
		rerender({defaultValue: 3})
		expect(result.current[0]).toBe(3)
		
		act(() => {
			result.current[1](10)
		})
		expect(result.current[0]).toBe(10)
		
		rerender({defaultValue: 4})
		expect(result.current[0]).toBe(4)
	})

	it('should work with complex default value changes', () => {
		const {result, rerender} = renderHook(
			({defaultValue}) => useDefaultState(defaultValue),
			{initialProps: {defaultValue: {a: 1, b: {c: 2}}}}
		)
		
		expect(result.current[0]).toEqual({a: 1, b: {c: 2}})
		
		act(() => {
			result.current[1]({a: 10, b: {c: 20}})
		})
		expect(result.current[0]).toEqual({a: 10, b: {c: 20}})
		
		rerender({defaultValue: {a: 100, b: {c: 200}}})
		expect(result.current[0]).toEqual({a: 100, b: {c: 200}})
	})
})
