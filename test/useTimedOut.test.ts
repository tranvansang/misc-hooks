import {describe, it, expect, vi} from 'vitest'
import {renderHook} from '@testing-library/react'
import {useTimedOut} from '../index.js'

describe('useTimedOut', () => {
	it('should initialize with false value', () => {
		const {result} = renderHook(() => useTimedOut(1000))
		expect(result.current).toBe(false)
	})

	it('should become true after timeout', async () => {
		const {result} = renderHook(() => useTimedOut(50))
		
		expect(result.current).toBe(false)
		
		await new Promise(resolve => setTimeout(resolve, 100))
		expect(result.current).toBe(true)
	})

	it('should handle immediate timeout', async () => {
		const {result} = renderHook(() => useTimedOut(0))
		
		await new Promise(resolve => setTimeout(resolve, 10))
		expect(result.current).toBe(true)
	})

	it('should remain false before timeout', async () => {
		const {result} = renderHook(() => useTimedOut(100))
		
		expect(result.current).toBe(false)
		
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(result.current).toBe(false)
		
		await new Promise(resolve => setTimeout(resolve, 100))
		expect(result.current).toBe(true)
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
		const {result: result1} = renderHook(() => useTimedOut(50))
		const {result: result2} = renderHook(() => useTimedOut(100))
		
		expect(result1.current).toBe(false)
		expect(result2.current).toBe(false)
		
		await new Promise(resolve => setTimeout(resolve, 60))
		expect(result1.current).toBe(true)
		expect(result2.current).toBe(false)
		
		await new Promise(resolve => setTimeout(resolve, 50))
		expect(result2.current).toBe(true)
	})

	it('should handle negative timeout as 0', async () => {
		const {result} = renderHook(() => useTimedOut(-100))
		
		await new Promise(resolve => setTimeout(resolve, 10))
		expect(result.current).toBe(true)
	})
})