import {describe, it, expect} from './helpers.ts'
import {renderHook} from './helpers.ts'
import {useDeepMemo} from '../index.ts'

describe('useDeepMemo', () => {
	it('should return initial value', () => {
		const {result} = renderHook(() => useDeepMemo({a: 1, b: 2}))
		expect(result.current).toEqual({a: 1, b: 2})
	})

	it('should return same reference for deeply equal objects', () => {
		const {result, rerender} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: {a: 1, b: {c: 2}}}}
		)
		
		const firstRef = result.current
		
		rerender({value: {a: 1, b: {c: 2}}})
		expect(result.current).toBe(firstRef)
		
		rerender({value: {a: 1, b: {c: 2}}})
		expect(result.current).toBe(firstRef)
	})

	it('should return new reference for different objects', () => {
		const {result, rerender} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: {a: 1}}}
		)
		
		const firstRef = result.current
		
		rerender({value: {a: 2}})
		expect(result.current).not.toBe(firstRef)
		expect(result.current).toEqual({a: 2})
	})

	it('should work with arrays', () => {
		const {result, rerender} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: [1, 2, 3]}}
		)
		
		const firstRef = result.current
		
		rerender({value: [1, 2, 3]})
		expect(result.current).toBe(firstRef)
		
		rerender({value: [1, 2, 4]})
		expect(result.current).not.toBe(firstRef)
		expect(result.current).toEqual([1, 2, 4])
	})

	it('should work with nested structures', () => {
		const {result, rerender} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: {a: [1, {b: 2}], c: {d: 3}}}}
		)
		
		const firstRef = result.current
		
		rerender({value: {a: [1, {b: 2}], c: {d: 3}}})
		expect(result.current).toBe(firstRef)
		
		rerender({value: {a: [1, {b: 2}], c: {d: 4}}})
		expect(result.current).not.toBe(firstRef)
	})

	it('should use custom equality function', () => {
		const customEqual = (a: any, b: any) => a.id === b.id
		
		const {result, rerender} = renderHook(
			({value}) => useDeepMemo(value, customEqual),
			{initialProps: {value: {id: 1, name: 'Alice'}}}
		)
		
		const firstRef = result.current
		
		rerender({value: {id: 1, name: 'Bob'}})
		expect(result.current).toBe(firstRef)
		
		rerender({value: {id: 2, name: 'Alice'}})
		expect(result.current).not.toBe(firstRef)
		expect(result.current).toEqual({id: 2, name: 'Alice'})
	})

	it('should handle primitive values', () => {
		const {result: stringResult, rerender: rerenderString} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: 'hello'}}
		)
		
		expect(stringResult.current).toBe('hello')
		rerenderString({value: 'hello'})
		expect(stringResult.current).toBe('hello')
		
		const {result: numberResult, rerender: rerenderNumber} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: 42}}
		)
		
		expect(numberResult.current).toBe(42)
		rerenderNumber({value: 42})
		expect(numberResult.current).toBe(42)
	})

	it('should handle null and undefined', () => {
		const {result, rerender} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: null as any}}
		)
		
		expect(result.current).toBe(null)
		
		// deep-equal considers null and undefined to be equal
		// so the reference should not change
		rerender({value: undefined})
		expect(result.current).toBe(null)
		
		// Going back to null should still maintain the same reference
		rerender({value: null})
		expect(result.current).toBe(null)
		
		// But a different value should update
		rerender({value: 'value'})
		expect(result.current).toBe('value')
		
		rerender({value: null})
		expect(result.current).toBe(null)
	})

	it('should preserve same reference when value matches by deep equality', () => {
		const obj1 = {a: 1, b: {c: 2}}
		const obj2 = {a: 1, b: {c: 2}}
		
		const {result, rerender} = renderHook(
			({value}) => useDeepMemo(value),
			{initialProps: {value: obj1}}
		)
		
		const firstResult = result.current
		expect(firstResult).toBe(obj1)
		
		rerender({value: obj2})
		expect(result.current).toBe(firstResult)
		expect(result.current).toBe(obj1)
		expect(result.current).not.toBe(obj2)
	})
})
