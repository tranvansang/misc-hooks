import {describe, it, expect} from 'vitest'
import {renderHook, act} from '@testing-library/react'
import {useToggle} from '../index.js'

describe('useToggle', () => {
	it('should initialize with default false value', () => {
		const {result} = renderHook(() => useToggle())
		expect(result.current[0]).toBe(false)
	})

	it('should initialize with provided initial value', () => {
		const {result} = renderHook(() => useToggle(true))
		expect(result.current[0]).toBe(true)
	})

	it('should toggle value when called without arguments', () => {
		const {result} = renderHook(() => useToggle())
		
		expect(result.current[0]).toBe(false)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(true)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(false)
	})

	it('should set to specific value when provided', () => {
		const {result} = renderHook(() => useToggle())
		
		act(() => {
			result.current[1](true)
		})
		expect(result.current[0]).toBe(true)
		
		act(() => {
			result.current[1](false)
		})
		expect(result.current[0]).toBe(false)
		
		act(() => {
			result.current[1](true)
		})
		expect(result.current[0]).toBe(true)
	})

	it('should handle multiple toggles in sequence', () => {
		const {result} = renderHook(() => useToggle(true))
		
		expect(result.current[0]).toBe(true)
		
		act(() => {
			result.current[1]()
			result.current[1]()
			result.current[1]()
		})
		expect(result.current[0]).toBe(false)
	})

	it('should maintain stable toggle function reference', () => {
		const {result, rerender} = renderHook(() => useToggle())
		const firstToggle = result.current[1]
		
		act(() => {
			result.current[1]()
		})
		
		rerender()
		expect(result.current[1]).toBe(firstToggle)
	})

	it('should work with undefined as explicit value', () => {
		const {result} = renderHook(() => useToggle(false))
		
		act(() => {
			result.current[1](undefined)
		})
		expect(result.current[0]).toBe(true)
		
		act(() => {
			result.current[1](undefined)
		})
		expect(result.current[0]).toBe(false)
	})
})