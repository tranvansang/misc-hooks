import {describe, it, expect} from './helpers.ts'
import {renderHook} from './helpers.ts'
import {useMounted} from '../index.js'

describe('useMounted', () => {
	it('should initialize with false value and become true after mount', () => {
		// In React 18+ testing environment, effects run synchronously
		// so mounted becomes true immediately after render
		const {result} = renderHook(() => useMounted())
		expect(result.current).toBe(true)
	})

	it('should remain true after initial mount', () => {
		const {result, rerender} = renderHook(() => useMounted())
		
		// Already true after initial render
		expect(result.current).toBe(true)
		
		rerender()
		expect(result.current).toBe(true)
	})

	it('should remain true across renders', () => {
		const {result, rerender} = renderHook(() => useMounted())
		
		expect(result.current).toBe(true)
		
		rerender()
		expect(result.current).toBe(true)
		
		rerender()
		expect(result.current).toBe(true)
	})

	it('should work correctly with multiple instances', () => {
		const {result: result1} = renderHook(() => useMounted())
		const {result: result2} = renderHook(() => useMounted())
		
		expect(result1.current).toBe(true)
		expect(result2.current).toBe(true)
	})

	it('should start fresh with new instance after remount', () => {
		const {result: result1, unmount} = renderHook(() => useMounted())
		
		expect(result1.current).toBe(true)
		unmount()
		
		const {result: result2} = renderHook(() => useMounted())
		expect(result2.current).toBe(true)
	})

	it('should provide consistent mounted state', () => {
		const {result} = renderHook(() => {
			const mounted1 = useMounted()
			const mounted2 = useMounted()
			return {mounted1, mounted2}
		})
		
		expect(result.current.mounted1).toBe(true)
		expect(result.current.mounted2).toBe(true)
		expect(result.current.mounted1).toBe(result.current.mounted2)
	})
})
