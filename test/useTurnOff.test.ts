import {describe, it, expect} from './helpers.ts'
import {renderHook, act} from './helpers.ts'
import {useTurnOff} from '../index.ts'

describe('useTurnOff', () => {
	it('should initialize with true value', () => {
		const {result} = renderHook(() => useTurnOff())
		expect(result.current[0]).toBe(true)
	})

	it('should turn off to false when called', () => {
		const {result} = renderHook(() => useTurnOff())
		
		expect(result.current[0]).toBe(true)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(false)
	})

	it('should stay false after multiple calls', () => {
		const {result} = renderHook(() => useTurnOff())
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(false)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(false)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(false)
	})

	it('should maintain stable turnOff function reference', () => {
		const {result, rerender} = renderHook(() => useTurnOff())
		const firstTurnOff = result.current[1]
		
		act(() => {
			result.current[1]()
		})
		
		rerender()
		expect(result.current[1]).toBe(firstTurnOff)
	})

	it('should work correctly in multiple hook instances', () => {
		const {result: result1} = renderHook(() => useTurnOff())
		const {result: result2} = renderHook(() => useTurnOff())
		
		expect(result1.current[0]).toBe(true)
		expect(result2.current[0]).toBe(true)
		
		act(() => {
			result1.current[1]()
		})
		
		expect(result1.current[0]).toBe(false)
		expect(result2.current[0]).toBe(true)
		
		act(() => {
			result2.current[1]()
		})
		
		expect(result1.current[0]).toBe(false)
		expect(result2.current[0]).toBe(false)
	})

	it('should always start with true after remount', () => {
		const {result, unmount, rerender} = renderHook(() => useTurnOff())
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(false)
		
		unmount()
		const {result: newResult} = renderHook(() => useTurnOff())
		expect(newResult.current[0]).toBe(true)
	})
})
