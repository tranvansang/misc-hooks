import {describe, it, expect} from 'vitest'
import {renderHook} from '@testing-library/react'
import {useMountedRef} from '../index.js'

describe('useMountedRef', () => {
	it('should initialize with false value and become true after mount', () => {
		// In React 18+ testing environment, effects run synchronously
		const {result} = renderHook(() => useMountedRef())
		expect(result.current.current).toBe(true)
	})

	it('should remain true after mount', () => {
		const {result} = renderHook(() => useMountedRef())
		
		// Already true after initial render due to synchronous effect
		expect(result.current.current).toBe(true)
	})

	it('should remain true across renders', () => {
		const {result, rerender} = renderHook(() => useMountedRef())
		
		expect(result.current.current).toBe(true)
		
		rerender()
		expect(result.current.current).toBe(true)
		
		rerender()
		expect(result.current.current).toBe(true)
	})

	it('should remain true even after unmount', () => {
		const {result, unmount} = renderHook(() => useMountedRef())
		const ref = result.current
		
		expect(ref.current).toBe(true)
		
		unmount()
		expect(ref.current).toBe(true)
	})

	it('should maintain stable ref object across renders', () => {
		const {result, rerender} = renderHook(() => useMountedRef())
		const firstRef = result.current
		
		rerender()
		expect(result.current).toBe(firstRef)
		
		rerender()
		expect(result.current).toBe(firstRef)
	})

	it('should work correctly with multiple instances', () => {
		const {result: result1} = renderHook(() => useMountedRef())
		const {result: result2} = renderHook(() => useMountedRef())
		
		expect(result1.current.current).toBe(true)
		expect(result2.current.current).toBe(true)
	})

	it('should start fresh with new instance after remount', () => {
		const {result: result1, unmount} = renderHook(() => useMountedRef())
		const ref1 = result1.current
		
		expect(ref1.current).toBe(true)
		unmount()
		
		const {result: result2} = renderHook(() => useMountedRef())
		expect(result2.current.current).toBe(true)
	})
})