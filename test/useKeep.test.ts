import {describe, it, expect} from './helpers.ts'
import {renderHook} from './helpers.ts'
import {useKeep} from '../index.js'

describe('useKeep', () => {
	it('should return initial value', () => {
		const {result} = renderHook(() => useKeep('initial'))
		expect(result.current).toBe('initial')
	})

	it('should keep value when new value is undefined', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: 'initial' as string | undefined}}
		)
		
		expect(result.current).toBe('initial')
		
		rerender({value: undefined})
		expect(result.current).toBe('initial')
		
		rerender({value: 'updated'})
		expect(result.current).toBe('updated')
		
		rerender({value: undefined})
		expect(result.current).toBe('updated')
	})

	it('should update value when new value is not undefined', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: 'first' as any}}
		)
		
		expect(result.current).toBe('first')
		
		rerender({value: 'second'})
		expect(result.current).toBe('second')
		
		rerender({value: 'third'})
		expect(result.current).toBe('third')
	})

	it('should handle null values', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: null as any}}
		)
		
		expect(result.current).toBe(null)
		
		rerender({value: undefined})
		expect(result.current).toBe(null)
		
		rerender({value: 'value'})
		expect(result.current).toBe('value')
		
		rerender({value: null})
		expect(result.current).toBe(null)
	})

	it('should work with numbers including 0', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: 0 as number | undefined}}
		)
		
		expect(result.current).toBe(0)
		
		rerender({value: undefined})
		expect(result.current).toBe(0)
		
		rerender({value: 5})
		expect(result.current).toBe(5)
		
		rerender({value: 0})
		expect(result.current).toBe(0)
	})

	it('should work with boolean values', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: false as boolean | undefined}}
		)
		
		expect(result.current).toBe(false)
		
		rerender({value: undefined})
		expect(result.current).toBe(false)
		
		rerender({value: true})
		expect(result.current).toBe(true)
		
		rerender({value: undefined})
		expect(result.current).toBe(true)
		
		rerender({value: false})
		expect(result.current).toBe(false)
	})

	it('should work with objects', () => {
		const obj1 = {a: 1}
		const obj2 = {b: 2}
		
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: obj1 as any}}
		)
		
		expect(result.current).toBe(obj1)
		
		rerender({value: undefined})
		expect(result.current).toBe(obj1)
		
		rerender({value: obj2})
		expect(result.current).toBe(obj2)
		
		rerender({value: undefined})
		expect(result.current).toBe(obj2)
	})

	it('should work with arrays', () => {
		const arr1 = [1, 2, 3]
		const arr2 = [4, 5, 6]
		
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: arr1 as any}}
		)
		
		expect(result.current).toBe(arr1)
		
		rerender({value: undefined})
		expect(result.current).toBe(arr1)
		
		rerender({value: arr2})
		expect(result.current).toBe(arr2)
		
		rerender({value: undefined})
		expect(result.current).toBe(arr2)
	})

	it('should handle empty strings', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: '' as string | undefined}}
		)
		
		expect(result.current).toBe('')
		
		rerender({value: undefined})
		expect(result.current).toBe('')
		
		rerender({value: 'non-empty'})
		expect(result.current).toBe('non-empty')
		
		rerender({value: ''})
		expect(result.current).toBe('')
	})

	it('should handle rapid value changes', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: 1 as number | undefined}}
		)
		
		expect(result.current).toBe(1)
		
		rerender({value: 2})
		expect(result.current).toBe(2)
		
		rerender({value: undefined})
		expect(result.current).toBe(2)
		
		rerender({value: 3})
		expect(result.current).toBe(3)
		
		rerender({value: undefined})
		expect(result.current).toBe(3)
		
		rerender({value: undefined})
		expect(result.current).toBe(3)
		
		rerender({value: 4})
		expect(result.current).toBe(4)
	})

	it('should work with functions', () => {
		const fn1 = () => 'first'
		const fn2 = () => 'second'
		
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: fn1 as any}}
		)
		
		expect(result.current).toBe(fn1)
		
		rerender({value: undefined})
		expect(result.current).toBe(fn1)
		
		rerender({value: fn2})
		expect(result.current).toBe(fn2)
		
		rerender({value: undefined})
		expect(result.current).toBe(fn2)
	})

	it('should handle initial undefined value', () => {
		const {result, rerender} = renderHook(
			({value}) => useKeep(value),
			{initialProps: {value: undefined as string | undefined}}
		)
		
		expect(result.current).toBe(undefined)
		
		rerender({value: 'first'})
		expect(result.current).toBe('first')
		
		rerender({value: undefined})
		expect(result.current).toBe('first')
	})
})
