import {describe, it, expect} from './helpers.ts'
import {renderHook} from './helpers.ts'
import {useRefValue} from '../index.ts'

describe('useRefValue', () => {
	it('should return a ref with the initial value', () => {
		const {result} = renderHook(() => useRefValue('initial'))
		expect(result.current.current).toBe('initial')
	})

	it('should update ref.current on each render', () => {
		const {result, rerender} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: 'first'}}
		)
		
		expect(result.current.current).toBe('first')
		
		rerender({value: 'second'})
		expect(result.current.current).toBe('second')
		
		rerender({value: 'third'})
		expect(result.current.current).toBe('third')
	})

	it('should maintain stable ref object', () => {
		const {result, rerender} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: 1}}
		)
		
		const firstRef = result.current
		
		rerender({value: 2})
		expect(result.current).toBe(firstRef)
		expect(result.current.current).toBe(2)
		
		rerender({value: 3})
		expect(result.current).toBe(firstRef)
		expect(result.current.current).toBe(3)
	})

	it('should work with different data types', () => {
		const {result: stringResult, rerender: rerenderString} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: 'hello'}}
		)
		
		const {result: numberResult, rerender: rerenderNumber} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: 42}}
		)
		
		const {result: objectResult, rerender: rerenderObject} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: {key: 'value'}}}
		)
		
		const {result: arrayResult, rerender: rerenderArray} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: [1, 2, 3]}}
		)
		
		expect(stringResult.current.current).toBe('hello')
		expect(numberResult.current.current).toBe(42)
		expect(objectResult.current.current).toEqual({key: 'value'})
		expect(arrayResult.current.current).toEqual([1, 2, 3])
		
		rerenderString({value: 'world'})
		rerenderNumber({value: 100})
		rerenderObject({value: {key: 'newValue'}})
		rerenderArray({value: [4, 5, 6]})
		
		expect(stringResult.current.current).toBe('world')
		expect(numberResult.current.current).toBe(100)
		expect(objectResult.current.current).toEqual({key: 'newValue'})
		expect(arrayResult.current.current).toEqual([4, 5, 6])
	})

	it('should handle null and undefined', () => {
		const {result, rerender} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: null as any}}
		)
		
		expect(result.current.current).toBe(null)
		
		rerender({value: undefined})
		expect(result.current.current).toBe(undefined)
		
		rerender({value: 'value'})
		expect(result.current.current).toBe('value')
		
		rerender({value: null})
		expect(result.current.current).toBe(null)
	})

	it('should handle function values', () => {
		const fn1 = () => 'first'
		const fn2 = () => 'second'
		const fn3 = () => 'third'
		
		const {result, rerender} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: fn1}}
		)
		
		expect(result.current.current).toBe(fn1)
		
		rerender({value: fn2})
		expect(result.current.current).toBe(fn2)
		
		rerender({value: fn3})
		expect(result.current.current).toBe(fn3)
	})

	it('should always have the latest value', () => {
		const {result, rerender} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: 0}}
		)
		
		for (let i = 1; i <= 10; i++) {
			rerender({value: i})
			expect(result.current.current).toBe(i)
		}
	})

	it('should work with complex nested objects', () => {
		const complex = {
			a: {
				b: {
					c: [1, 2, 3],
					d: {e: 'nested'}
				}
			},
			f: new Date(),
			g: Symbol('test')
		}
		
		const {result, rerender} = renderHook(
			({value}) => useRefValue(value),
			{initialProps: {value: complex}}
		)
		
		expect(result.current.current).toBe(complex)
		
		const newComplex = {
			...complex,
			a: {
				...complex.a,
				b: {
					...complex.a.b,
					c: [4, 5, 6]
				}
			}
		}
		
		rerender({value: newComplex})
		expect(result.current.current).toBe(newComplex)
	})

	it('should be useful for accessing current props in callbacks', () => {
		const {result, rerender} = renderHook(
			({count}) => {
				const countRef = useRefValue(count)
				
				const getCount = () => countRef.current
				
				return {getCount, countRef}
			},
			{initialProps: {count: 0}}
		)
		
		expect(result.current.getCount()).toBe(0)
		expect(result.current.countRef.current).toBe(0)
		
		rerender({count: 5})
		expect(result.current.getCount()).toBe(5)
		expect(result.current.countRef.current).toBe(5)
		
		rerender({count: 10})
		expect(result.current.getCount()).toBe(10)
		expect(result.current.countRef.current).toBe(10)
	})
})
