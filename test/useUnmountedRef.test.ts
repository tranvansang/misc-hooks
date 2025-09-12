import {describe, it, expect} from './helpers.ts'
import {renderHook} from './helpers.ts'
import {useUnmountedRef} from '../index.ts'

describe('useUnmountedRef', () => {
	it('should initialize with false value', () => {
		const {result} = renderHook(() => useUnmountedRef())
		expect(result.current.current).toBe(false)
	})

	it('should remain false while component is mounted', () => {
		const {result, rerender} = renderHook(() => useUnmountedRef())
		
		expect(result.current.current).toBe(false)
		
		rerender()
		expect(result.current.current).toBe(false)
		
		rerender()
		expect(result.current.current).toBe(false)
	})

	it('should set to true when component unmounts', () => {
		const {result, unmount} = renderHook(() => useUnmountedRef())
		const ref = result.current
		
		expect(ref.current).toBe(false)
		
		unmount()
		expect(ref.current).toBe(true)
	})

	it('should maintain stable ref object across renders', () => {
		const {result, rerender} = renderHook(() => useUnmountedRef())
		const firstRef = result.current
		
		rerender()
		expect(result.current).toBe(firstRef)
		
		rerender()
		expect(result.current).toBe(firstRef)
	})

	it('should reset to false when remounted', () => {
		const {result: result1, unmount} = renderHook(() => useUnmountedRef())
		const ref1 = result1.current
		
		unmount()
		expect(ref1.current).toBe(true)
		
		const {result: result2} = renderHook(() => useUnmountedRef())
		expect(result2.current.current).toBe(false)
	})

	it('should work correctly with multiple instances', () => {
		const {result: result1, unmount: unmount1} = renderHook(() => useUnmountedRef())
		const {result: result2, unmount: unmount2} = renderHook(() => useUnmountedRef())
		
		const ref1 = result1.current
		const ref2 = result2.current
		
		expect(ref1.current).toBe(false)
		expect(ref2.current).toBe(false)
		
		unmount1()
		expect(ref1.current).toBe(true)
		expect(ref2.current).toBe(false)
		
		unmount2()
		expect(ref1.current).toBe(true)
		expect(ref2.current).toBe(true)
	})
})
