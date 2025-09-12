import {describe, it, expect} from './helpers.ts'
import {renderHook, act} from './helpers.ts'
import {useUpdate} from '../index.js'

describe('useUpdate', () => {
	it('should initialize with getValue result', () => {
		const {result} = renderHook(() => 
			useUpdate(() => 'initial')
		)
		
		expect(result.current[0]).toBe('initial')
	})

	it('should update state when dispatch is called', () => {
		const {result} = renderHook(() => 
			useUpdate((current) => (current ?? 0) + 1)
		)
		
		expect(result.current[0]).toBe(1)
		
		act(() => {
			result.current[1]()
		})
		
		expect(result.current[0]).toBe(2)
		
		act(() => {
			result.current[1]()
		})
		
		expect(result.current[0]).toBe(3)
	})

	it('should pass current value to getValue', () => {
		const values: any[] = []
		const getValue = (current?: number) => {
			values.push(current)
			return (current ?? 0) + 10
		}
		
		const {result} = renderHook(() => useUpdate(getValue))
		
		expect(values).toEqual([undefined])
		expect(result.current[0]).toBe(10)
		
		act(() => {
			result.current[1]()
		})
		
		expect(values).toEqual([undefined, 10])
		expect(result.current[0]).toBe(20)
		
		act(() => {
			result.current[1]()
		})
		
		expect(values).toEqual([undefined, 10, 20])
		expect(result.current[0]).toBe(30)
	})

	it('should work with complex state transformations', () => {
		const {result} = renderHook(() => 
			useUpdate((current?: {count: number, items: string[]}) => ({
				count: (current?.count ?? 0) + 1,
				items: [...(current?.items ?? []), `item${(current?.count ?? 0) + 1}`]
			}))
		)
		
		expect(result.current[0]).toEqual({count: 1, items: ['item1']})
		
		act(() => {
			result.current[1]()
		})
		
		expect(result.current[0]).toEqual({count: 2, items: ['item1', 'item2']})
		
		act(() => {
			result.current[1]()
		})
		
		expect(result.current[0]).toEqual({count: 3, items: ['item1', 'item2', 'item3']})
	})

	it('should maintain stable dispatch function', () => {
		const {result, rerender} = renderHook(() => 
			useUpdate(() => Date.now())
		)
		
		const firstDispatch = result.current[1]
		
		act(() => {
			result.current[1]()
		})
		
		expect(result.current[1]).toBe(firstDispatch)
		
		rerender()
		expect(result.current[1]).toBe(firstDispatch)
	})

	it('should handle alternating values', () => {
		const {result} = renderHook(() => 
			useUpdate((current) => current === 'A' ? 'B' : 'A')
		)
		
		expect(result.current[0]).toBe('A')
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe('B')
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe('A')
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe('B')
	})

	it('should work with array manipulation', () => {
		const {result} = renderHook(() => 
			useUpdate((current?: number[]) => {
				const arr = current ?? []
				return [...arr, arr.length]
			})
		)
		
		expect(result.current[0]).toEqual([0])
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toEqual([0, 1])
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toEqual([0, 1, 2])
	})

	it('should handle null and undefined', () => {
		const {result} = renderHook(() => 
			useUpdate((current) => {
				if (current === undefined) return null
				if (current === null) return 0
				if (current === 0) return 'value'
				return undefined
			})
		)
		
		expect(result.current[0]).toBe(null)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(0)
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe('value')
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toBe(undefined)
	})

	it('should work with Date objects', () => {
		const baseTime = new Date('2024-01-01')
		const {result} = renderHook(() => 
			useUpdate((current?: Date) => {
				const date = current ?? baseTime
				const newDate = new Date(date)
				newDate.setDate(date.getDate() + 1)
				return newDate
			})
		)
		
		expect(result.current[0]).toEqual(new Date('2024-01-02'))
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toEqual(new Date('2024-01-03'))
		
		act(() => {
			result.current[1]()
		})
		expect(result.current[0]).toEqual(new Date('2024-01-04'))
	})

	it('should handle multiple rapid updates', () => {
		const {result} = renderHook(() => 
			useUpdate((current = 0) => current + 1)
		)
		
		expect(result.current[0]).toBe(1)
		
		act(() => {
			result.current[1]()
			result.current[1]()
			result.current[1]()
		})
		
		expect(result.current[0]).toBe(4)
	})
})
