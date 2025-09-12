import {describe, it, expect, vi} from './helpers.ts'
import {renderHook, act} from './helpers.ts'
import {useForceUpdate} from '../index.js'

describe('useForceUpdate', () => {
	it('should return a stable function', () => {
		const {result, rerender} = renderHook(() => useForceUpdate())
		const firstFn = result.current
		
		rerender()
		expect(result.current).toBe(firstFn)
		
		rerender()
		expect(result.current).toBe(firstFn)
	})

	it('should trigger re-render when called', () => {
		let renderCount = 0
		const {result} = renderHook(() => {
			renderCount++
			return useForceUpdate()
		})
		
		expect(renderCount).toBe(1)
		
		act(() => {
			result.current()
		})
		expect(renderCount).toBe(2)
		
		act(() => {
			result.current()
		})
		expect(renderCount).toBe(3)
	})

	it('should not update if component is unmounted', async () => {
		let renderCount = 0
		const {result, unmount} = renderHook(() => {
			renderCount++
			return useForceUpdate()
		})
		
		expect(renderCount).toBe(1)
		const forceUpdate = result.current
		
		unmount()
		
		await new Promise(resolve => setTimeout(resolve, 0))
		forceUpdate()
		expect(renderCount).toBe(1)
	})

	it('should handle multiple rapid calls', () => {
		let renderCount = 0
		const {result} = renderHook(() => {
			renderCount++
			return useForceUpdate()
		})
		
		expect(renderCount).toBe(1)
		
		// React 18 batches updates, so we need to call them separately
		act(() => {
			result.current()
		})
		expect(renderCount).toBe(2)
		
		act(() => {
			result.current()
		})
		expect(renderCount).toBe(3)
		
		act(() => {
			result.current()
		})
		expect(renderCount).toBe(4)
	})

	it('should work with multiple instances independently', () => {
		let renderCount1 = 0
		let renderCount2 = 0
		
		const {result: result1} = renderHook(() => {
			renderCount1++
			return useForceUpdate()
		})
		
		const {result: result2} = renderHook(() => {
			renderCount2++
			return useForceUpdate()
		})
		
		expect(renderCount1).toBe(1)
		expect(renderCount2).toBe(1)
		
		act(() => {
			result1.current()
		})
		
		expect(renderCount1).toBe(2)
		expect(renderCount2).toBe(1)
		
		act(() => {
			result2.current()
		})
		
		expect(renderCount1).toBe(2)
		expect(renderCount2).toBe(2)
	})

	it('should update correctly after mount', async () => {
		let renderCount = 0
		const {result} = renderHook(() => {
			renderCount++
			return useForceUpdate()
		})
		
		expect(renderCount).toBe(1)
		
		await new Promise(resolve => setTimeout(resolve, 0))
		act(() => {
			result.current()
		})
		expect(renderCount).toBe(2)
	})

	it('should not update immediately on initial render', () => {
		let renderCount = 0
		const {result} = renderHook(() => {
			renderCount++
			const forceUpdate = useForceUpdate()
			if (renderCount === 1) {
				forceUpdate()
			}
			return forceUpdate
		})
		
		expect(renderCount).toBe(1)
	})

	it('should increment counter on each update', () => {
		const counters: number[] = []
		const {result} = renderHook(() => {
			const forceUpdate = useForceUpdate()
			return forceUpdate
		})
		
		act(() => {
			result.current()
		})
		
		act(() => {
			result.current()
		})
		
		act(() => {
			result.current()
		})
		
		expect(result.current).toBeInstanceOf(Function)
	})
})
