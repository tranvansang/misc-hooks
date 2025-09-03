import {describe, it, expect} from 'vitest'
import {nextStateFromAction} from '../index.js'

describe('nextStateFromAction', () => {
	it('should return the action directly when action is not a function', () => {
		expect(nextStateFromAction(42, 10)).toBe(42)
		expect(nextStateFromAction('new', 'old')).toBe('new')
		expect(nextStateFromAction({value: 1}, {value: 0})).toEqual({value: 1})
		expect(nextStateFromAction(null, 'something')).toBe(null)
		expect(nextStateFromAction(undefined, 'something')).toBe(undefined)
	})

	it('should call the action function with current state when action is a function', () => {
		const action = (state: number) => state + 1
		expect(nextStateFromAction(action, 10)).toBe(11)
	})

	it('should work with complex state types', () => {
		interface State {
			count: number
			name: string
		}

		const state: State = {count: 0, name: 'test'}
		const action = (s: State) => ({...s, count: s.count + 1})

		expect(nextStateFromAction(action, state)).toEqual({count: 1, name: 'test'})
		expect(nextStateFromAction({count: 5, name: 'new'}, state)).toEqual({count: 5, name: 'new'})
	})

	it('should preserve reference when returning same state from function', () => {
		const state = {value: 1}
		const action = (s: typeof state) => s
		const result = nextStateFromAction(action, state)
		expect(result).toBe(state)
	})

	it('should handle array states', () => {
		const state = [1, 2, 3]
		const action = (s: number[]) => [...s, 4]
		expect(nextStateFromAction(action, state)).toEqual([1, 2, 3, 4])
		expect(nextStateFromAction([5, 6], state)).toEqual([5, 6])
	})
})