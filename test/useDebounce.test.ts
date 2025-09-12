import {describe, it, expect, vi} from './helpers.ts'
import {renderHook, act, waitFor} from './helpers.ts'
import {useDebounce} from '../index.js'

describe('useDebounce', () => {
	it('should return initial value immediately', () => {
		const {result} = renderHook(() => useDebounce('initial', 100))
		expect(result.current).toBe('initial')
	})

	it('should debounce value changes', async () => {
		const {result, rerender} = renderHook(
			({value, timeout}) => useDebounce(value, timeout),
			{initialProps: {value: 'first', timeout: 50}}
		)
		
		expect(result.current).toBe('first')
		
		rerender({value: 'second', timeout: 50})
		expect(result.current).toBe('first')
		
		await waitFor(() => {
			expect(result.current).toBe('second')
		}, {timeout: 150})
	})

	it('should cancel pending debounce on new value', async () => {
		const {result, rerender} = renderHook(
			({value}) => useDebounce(value, 100),
			{initialProps: {value: 'first'}}
		)
		
		expect(result.current).toBe('first')
		
		rerender({value: 'second'})
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(result.current).toBe('first')
		
		rerender({value: 'third'})
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(result.current).toBe('first')
		
		await waitFor(() => {
			expect(result.current).toBe('third')
		}, {timeout: 150})
	})

	it('should update immediately with 0 timeout', async () => {
		const {result, rerender} = renderHook(
			({value}) => useDebounce(value, 0),
			{initialProps: {value: 'first'}}
		)
		
		expect(result.current).toBe('first')
		
		rerender({value: 'second'})
		
		await waitFor(() => {
			expect(result.current).toBe('second')
		}, {timeout: 100})
	})

	it('should handle timeout changes', async () => {
		const {result, rerender} = renderHook(
			({value, timeout}) => useDebounce(value, timeout),
			{initialProps: {value: 'first', timeout: 100}}
		)
		
		rerender({value: 'second', timeout: 50})
		expect(result.current).toBe('first')
		
		await waitFor(() => {
			expect(result.current).toBe('second')
		}, {timeout: 150})
	})

	it('should work with different data types', async () => {
		const {result: numberResult, rerender: rerenderNumber} = renderHook(
			({value}) => useDebounce(value, 50),
			{initialProps: {value: 1}}
		)
		
		const {result: objectResult, rerender: rerenderObject} = renderHook(
			({value}) => useDebounce(value, 50),
			{initialProps: {value: {count: 1}}}
		)
		
		expect(numberResult.current).toBe(1)
		expect(objectResult.current).toEqual({count: 1})
		
		rerenderNumber({value: 2})
		rerenderObject({value: {count: 2}})
		
		await waitFor(() => {
			expect(numberResult.current).toBe(2)
			expect(objectResult.current).toEqual({count: 2})
		}, {timeout: 150})
	})

	it('should cancel debounce on unmount', () => {
		vi.useFakeTimers()
		const {result, rerender, unmount} = renderHook(
			({value}) => useDebounce(value, 1000),
			{initialProps: {value: 'first'}}
		)
		
		rerender({value: 'second'})
		expect(result.current).toBe('first')
		
		unmount()
		
		vi.advanceTimersByTime(1100)
		expect(result.current).toBe('first')
		
		vi.useRealTimers()
	})

	it('should handle rapid value changes', async () => {
		const {result, rerender} = renderHook(
			({value}) => useDebounce(value, 50),
			{initialProps: {value: 0}}
		)
		
		for (let i = 1; i <= 10; i++) {
			rerender({value: i})
			await new Promise(resolve => setTimeout(resolve, 10))
			expect(result.current).toBe(0)
		}
		
		await waitFor(() => {
			expect(result.current).toBe(10)
		}, {timeout: 100})
	})
})
