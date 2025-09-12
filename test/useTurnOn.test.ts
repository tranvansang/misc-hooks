import {describe, it, expect} from './helpers.ts'
import {renderHook, act} from './helpers.ts'
import {useTurnOn} from '../index.js'

describe('useTurnOn', () => {
	it('should initialize with false value', () => {
		const {result} = renderHook(() => useTurnOn())
		expect(result.current[0]).toBe(false)
	})

	it('should turn on to true when called', () => {
		const {result} = renderHook(() => useTurnOn())
		
		expect(result.current[0]).toBe(false)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(true)
	})

	it('should stay true after multiple calls', () => {
		const {result} = renderHook(() => useTurnOn())
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(true)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(true)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(true)
	})

	it('should maintain stable turnOn function reference', () => {
		const {result, rerender} = renderHook(() => useTurnOn())
		const firstTurnOn = result.current[1]
		
		act(() => {
			result.current[1]()
		})
		
		rerender()
		expect(result.current[1]).toBe(firstTurnOn)
	})

	it('should work correctly in multiple hook instances', () => {
		const {result: result1} = renderHook(() => useTurnOn())
		const {result: result2} = renderHook(() => useTurnOn())
		
		expect(result1.current[0]).toBe(false)
		expect(result2.current[0]).toBe(false)
		
		act(() => {
			result1.current[1]()
		})
		
		expect(result1.current[0]).toBe(true)
		expect(result2.current[0]).toBe(false)
		
		act(() => {
			result2.current[1]()
		})
		
		expect(result1.current[0]).toBe(true)
		expect(result2.current[0]).toBe(true)
	})

	it('should always start with false after remount', () => {
		const {result, unmount} = renderHook(() => useTurnOn())
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(true)
		
		unmount()
		const {result: newResult} = renderHook(() => useTurnOn())
		expect(newResult.current[0]).toBe(false)
	})
})
