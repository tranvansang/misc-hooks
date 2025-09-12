import {describe, it, expect} from './helpers.ts'
import {renderHook} from './helpers.ts'
import {usePrevRef} from '../index.ts'

describe('usePrevRef', () => {
	it('should initially return undefined', () => {
		const {result} = renderHook(() => usePrevRef('current'))
		expect(result.current.current).toBe(undefined)
	})

	it('should return previous value after rerender', () => {
		const {result, rerender} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: 'first'}}
		)
		
		expect(result.current.current).toBe(undefined)
		
		rerender({value: 'second'})
		expect(result.current.current).toBe('first')
		
		rerender({value: 'third'})
		expect(result.current.current).toBe('second')
	})

	it('should maintain stable ref object', () => {
		const {result, rerender} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: 1}}
		)
		
		const firstRef = result.current
		
		rerender({value: 2})
		expect(result.current).toBe(firstRef)
		
		rerender({value: 3})
		expect(result.current).toBe(firstRef)
	})

	it('should work with different data types', () => {
		const {result: numberResult, rerender: rerenderNumber} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: 1}}
		)
		
		const {result: objectResult, rerender: rerenderObject} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: {a: 1}}}
		)
		
		const {result: arrayResult, rerender: rerenderArray} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: [1, 2]}}
		)
		
		expect(numberResult.current.current).toBe(undefined)
		expect(objectResult.current.current).toBe(undefined)
		expect(arrayResult.current.current).toBe(undefined)
		
		rerenderNumber({value: 2})
		rerenderObject({value: {a: 2}})
		rerenderArray({value: [3, 4]})
		
		expect(numberResult.current.current).toBe(1)
		expect(objectResult.current.current).toEqual({a: 1})
		expect(arrayResult.current.current).toEqual([1, 2])
	})

	it('should handle null and undefined values', () => {
		const {result, rerender} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: null as any}}
		)
		
		expect(result.current.current).toBe(undefined)
		
		rerender({value: undefined})
		expect(result.current.current).toBe(null)
		
		rerender({value: 'value'})
		expect(result.current.current).toBe(undefined)
		
		rerender({value: null})
		expect(result.current.current).toBe('value')
	})

	it('should handle same value rerenders', () => {
		const obj = {count: 1}
		const {result, rerender} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: obj}}
		)
		
		expect(result.current.current).toBe(undefined)
		
		rerender({value: obj})
		expect(result.current.current).toBe(obj)
		expect(result.current.current === obj).toBe(true)
		
		rerender({value: obj})
		expect(result.current.current).toBe(obj)
	})

	it('should work with multiple instances independently', () => {
		const {result: result1, rerender: rerender1} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: 'A'}}
		)
		
		const {result: result2, rerender: rerender2} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: 'X'}}
		)
		
		expect(result1.current.current).toBe(undefined)
		expect(result2.current.current).toBe(undefined)
		
		rerender1({value: 'B'})
		expect(result1.current.current).toBe('A')
		expect(result2.current.current).toBe(undefined)
		
		rerender2({value: 'Y'})
		expect(result1.current.current).toBe('A')
		expect(result2.current.current).toBe('X')
		
		rerender1({value: 'C'})
		rerender2({value: 'Z'})
		expect(result1.current.current).toBe('B')
		expect(result2.current.current).toBe('Y')
	})

	it('should track function values', () => {
		const fn1 = () => 'first'
		const fn2 = () => 'second'
		const fn3 = () => 'third'
		
		const {result, rerender} = renderHook(
			({value}) => usePrevRef(value),
			{initialProps: {value: fn1}}
		)
		
		expect(result.current.current).toBe(undefined)
		
		rerender({value: fn2})
		expect(result.current.current).toBe(fn1)
		
		rerender({value: fn3})
		expect(result.current.current).toBe(fn2)
	})
})
