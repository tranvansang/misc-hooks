import {describe, it, expect, vi} from './helpers.ts'
import {renderHook, waitFor} from '@testing-library/react'
import {useTimedOut} from '../index.ts'

describe('useTimedOut', () => {
	it('should initialize with false value', () => {
		const {result} = renderHook(() => useTimedOut(1000))
		expect(result.current).toBe(false)
	})

	it('should become true after timeout', async () => {
		const {result} = renderHook(() => useTimedOut(50))
		
		expect(result.current).toBe(false)
		
		await waitFor(() => {
			expect(result.current).toBe(true)
		}, {timeout: 150})
	})

	it('should handle immediate timeout', async () => {
		const {result} = renderHook(() => useTimedOut(0))
		
		await waitFor(() => {
			expect(result.current).toBe(true)
		}, {timeout: 100})
	})

	it('should remain false before timeout', async () => {
		const {result} = renderHook(() => useTimedOut(100))
		
		expect(result.current).toBe(false)
		
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(result.current).toBe(false)
		
		await waitFor(() => {
			expect(result.current).toBe(true)
		}, {timeout: 150})
	})

	it('should clear timeout on unmount', () => {
		vi.useFakeTimers()
		const {result, unmount} = renderHook(() => useTimedOut(1000))
		
		expect(result.current).toBe(false)
		
		unmount()
		
		vi.advanceTimersByTime(1100)
		expect(result.current).toBe(false)
		
		vi.useRealTimers()
	})

	it('should restart timer when timeout changes', async () => {
		const {result, rerender} = renderHook(
			({timeout}) => useTimedOut(timeout),
			{initialProps: {timeout: 100}}
		)
		
		expect(result.current).toBe(false)
		
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(result.current).toBe(false)
		
		rerender({timeout: 25})
		
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(result.current).toBe(true)
	})

	it('should work with multiple instances independently', async () => {
		const {result: result1} = renderHook(() => useTimedOut(30))
		const {result: result2} = renderHook(() => useTimedOut(150))
		
		expect(result1.current).toBe(false)
		expect(result2.current).toBe(false)
		
		await waitFor(() => {
			expect(result1.current).toBe(true)
		}, {timeout: 100})
		
		// result2 should still be false since only ~30-50ms have passed
		expect(result2.current).toBe(false)
		
		await waitFor(() => {
			expect(result2.current).toBe(true)
		}, {timeout: 200})
	})

	it('should handle negative timeout as 0', async () => {
		const {result} = renderHook(() => useTimedOut(-100))
		
		await waitFor(() => {
			expect(result.current).toBe(true)
		}, {timeout: 100})
	})
})
