import {describe, expect, test, vi} from 'vitest'
import {makeAtom} from '../index'

describe('makeAtom', () => {
	test('creates atom with initial value', () => {
		const atom = makeAtom(42)
		expect(atom.value).toBe(42)

		const stringAtom = makeAtom('hello')
		expect(stringAtom.value).toBe('hello')

		const objAtom = makeAtom({ foo: 'bar' })
		expect(objAtom.value).toEqual({ foo: 'bar' })
	})

	test('creates atom without initial value', () => {
		const atom = makeAtom()
		expect(atom.value).toBeUndefined()
	})

	test('get and set value', () => {
		const atom = makeAtom(10)
		expect(atom.value).toBe(10)

		atom.value = 20
		expect(atom.value).toBe(20)

		atom.value = 30
		expect(atom.value).toBe(30)
	})

	test('subscribers are notified on value change', () => {
		const atom = makeAtom('initial')
		const subscriber = vi.fn()

		atom.sub(subscriber)

		atom.value = 'updated'
		expect(subscriber).toHaveBeenCalledTimes(1)
		expect(subscriber).toHaveBeenCalledWith('updated', 'initial')

		atom.value = 'another'
		expect(subscriber).toHaveBeenCalledTimes(2)
		expect(subscriber).toHaveBeenCalledWith('another', 'updated')
	})

	test('multiple subscribers are all notified', () => {
		const atom = makeAtom(0)
		const sub1 = vi.fn()
		const sub2 = vi.fn()
		const sub3 = vi.fn()

		atom.sub(sub1)
		atom.sub(sub2)
		atom.sub(sub3)

		atom.value = 1

		expect(sub1).toHaveBeenCalledWith(1, 0)
		expect(sub2).toHaveBeenCalledWith(1, 0)
		expect(sub3).toHaveBeenCalledWith(1, 0)
	})

	test('unsubscribe function works', () => {
		const atom = makeAtom('test')
		const subscriber = vi.fn()

		const unsub = atom.sub(subscriber)

		atom.value = 'first'
		expect(subscriber).toHaveBeenCalledTimes(1)

		unsub()

		atom.value = 'second'
		expect(subscriber).toHaveBeenCalledTimes(1) // Not called again
	})

	test('subscriber with now option', () => {
		const atom = makeAtom(100)
		const subscriber = vi.fn()

		atom.sub(subscriber, { now: true })

		// Should be called immediately with current value
		expect(subscriber).toHaveBeenCalledTimes(1)
		expect(subscriber).toHaveBeenCalledWith(100, undefined)

		atom.value = 200
		expect(subscriber).toHaveBeenCalledTimes(2)
		expect(subscriber).toHaveBeenCalledWith(200, 100)
	})

	test('subscriber with skip option', () => {
		const atom = makeAtom(0)
		const subscriber = vi.fn()

		// Skip even numbers
		atom.sub(subscriber, { skip: (newVal) => newVal % 2 === 0 })

		atom.value = 2
		expect(subscriber).not.toHaveBeenCalled() // Skipped

		atom.value = 3
		expect(subscriber).toHaveBeenCalledTimes(1)
		expect(subscriber).toHaveBeenCalledWith(3, 2)

		atom.value = 4
		expect(subscriber).toHaveBeenCalledTimes(1) // Skipped

		atom.value = 5
		expect(subscriber).toHaveBeenCalledTimes(2)
		expect(subscriber).toHaveBeenCalledWith(5, 4)
	})

	test('subscriber with both now and skip options', () => {
		const atom = makeAtom(10)
		const subscriber = vi.fn()

		// Skip values less than 15
		atom.sub(subscriber, {
			now: true,
			skip: (newVal) => newVal < 15
		})

		// Initial call is skipped because 10 < 15
		expect(subscriber).not.toHaveBeenCalled()

		atom.value = 12
		expect(subscriber).not.toHaveBeenCalled() // Skipped

		atom.value = 15
		expect(subscriber).toHaveBeenCalledTimes(1)
		expect(subscriber).toHaveBeenCalledWith(15, 12)

		atom.value = 20
		expect(subscriber).toHaveBeenCalledTimes(2)
		expect(subscriber).toHaveBeenCalledWith(20, 15)
	})

	test('subscriber returning cleanup function', () => {
		const atom = makeAtom('initial')
		const cleanup = vi.fn()
		const subscriber = vi.fn(() => cleanup)

		atom.sub(subscriber)

		atom.value = 'first'
		expect(subscriber).toHaveBeenCalledTimes(1)
		expect(cleanup).not.toHaveBeenCalled()

		atom.value = 'second'
		expect(subscriber).toHaveBeenCalledTimes(2)
		expect(cleanup).toHaveBeenCalledTimes(1) // Cleanup from first call

		atom.value = 'third'
		expect(subscriber).toHaveBeenCalledTimes(3)
		expect(cleanup).toHaveBeenCalledTimes(2) // Cleanup from second call
	})

	test('cleanup function called on unsubscribe', () => {
		const atom = makeAtom(0)
		const cleanup = vi.fn()
		const subscriber = vi.fn(() => cleanup)

		const unsub = atom.sub(subscriber)

		atom.value = 1
		expect(cleanup).not.toHaveBeenCalled()

		unsub()
		expect(cleanup).toHaveBeenCalledTimes(1)

		// No more cleanups after unsubscribe
		atom.value = 2
		expect(cleanup).toHaveBeenCalledTimes(1)
	})

	test('setting same reference multiple times', () => {
		const atom = makeAtom({ count: 0 })
		const subscriber = vi.fn()

		atom.sub(subscriber)

		const obj = { count: 1 }
		atom.value = obj
		expect(subscriber).toHaveBeenCalledTimes(1)

		// Setting same reference again still notifies
		atom.value = obj
		expect(subscriber).toHaveBeenCalledTimes(2)
		expect(subscriber).toHaveBeenCalledWith(obj, obj)
	})

	test('handles null and undefined values', () => {
		const atom = makeAtom<string | null | undefined>('initial')
		const subscriber = vi.fn()

		atom.sub(subscriber)

		atom.value = null
		expect(subscriber).toHaveBeenCalledWith(null, 'initial')
		expect(atom.value).toBe(null)

		atom.value = undefined
		expect(subscriber).toHaveBeenCalledWith(undefined, null)
		expect(atom.value).toBe(undefined)

		atom.value = 'defined'
		expect(subscriber).toHaveBeenCalledWith('defined', undefined)
		expect(atom.value).toBe('defined')
	})

	test('subscribers are called in order of subscription', () => {
		const atom = makeAtom(0)
		const callOrder: number[] = []

		atom.sub(() => callOrder.push(1))
		atom.sub(() => callOrder.push(2))
		atom.sub(() => callOrder.push(3))

		atom.value = 1

		expect(callOrder).toEqual([1, 2, 3])
	})

	test('subscriber can safely modify atom value', () => {
		const atom = makeAtom(0)
		let callCount = 0
		const subscriber1 = vi.fn((newVal, oldVal) => {
			callCount++
			// Only trigger cascade on first call to avoid infinite loop
			if (newVal === 1 && callCount === 1) {
				atom.value = 2
			}
		})
		const subscriber2 = vi.fn()

		atom.sub(subscriber1)
		atom.sub(subscriber2)

		atom.value = 1

		// Actual behavior based on testing:
		// 1. subscriber1 is called with (1, 0) and sets value to 2
		// 2. This triggers a nested iteration:
		//    - subscriber1 is called with (2, 1)
		//    - subscriber2 is called with (2, 1)
		// 3. Original iteration continues:
		//    - subscriber2 is called with (1, 0)

		expect(subscriber1).toHaveBeenCalledTimes(2)
		expect(subscriber1).toHaveBeenNthCalledWith(1, 1, 0)
		expect(subscriber1).toHaveBeenNthCalledWith(2, 2, 1)

		expect(subscriber2).toHaveBeenCalledTimes(2)
		expect(subscriber2).toHaveBeenNthCalledWith(1, 2, 1) // From nested iteration
		expect(subscriber2).toHaveBeenNthCalledWith(2, 1, 0) // From original iteration

		expect(atom.value).toBe(2)
	})

	test('subscriber can unsubscribe itself', () => {
		const atom = makeAtom(0)
		let unsub: (() => void) | null = null

		const subscriber = vi.fn(() => {
			if (atom.value === 2 && unsub) {
				unsub()
			}
		})

		unsub = atom.sub(subscriber)

		atom.value = 1
		expect(subscriber).toHaveBeenCalledTimes(1)

		atom.value = 2
		expect(subscriber).toHaveBeenCalledTimes(2)

		// Should have unsubscribed itself
		atom.value = 3
		expect(subscriber).toHaveBeenCalledTimes(2) // Not called again
	})

	test('subscriber errors propagate and stop further subscribers', () => {
		const atom = makeAtom('test')
		const sub1 = vi.fn()
		const sub2 = vi.fn(() => {
			throw new Error('Subscriber error')
		})
		const sub3 = vi.fn()

		atom.sub(sub1)
		atom.sub(sub2)
		atom.sub(sub3)

		// The error will propagate and stop iteration
		expect(() => atom.value = 'updated').toThrow('Subscriber error')

		// sub1 is called before the error
		expect(sub1).toHaveBeenCalledWith('updated', 'test')
		// sub2 throws the error
		expect(sub2).toHaveBeenCalledWith('updated', 'test')
		// sub3 is not called because sub2 threw
		expect(sub3).not.toHaveBeenCalled()

		// The value is still updated though
		expect(atom.value).toBe('updated')
	})

	test('skip function receives both old and new values', () => {
		const atom = makeAtom(10)
		const subscriber = vi.fn()
		const skipFn = vi.fn((newVal, oldVal) => {
			// Skip if increase is less than 5
			return newVal - oldVal < 5
		})

		atom.sub(subscriber, { skip: skipFn })

		atom.value = 12
		expect(skipFn).toHaveBeenCalledWith(12, 10)
		expect(subscriber).not.toHaveBeenCalled() // Skipped (increase of 2)

		atom.value = 17
		expect(skipFn).toHaveBeenCalledWith(17, 12)
		expect(subscriber).toHaveBeenCalledTimes(1) // Not skipped (increase of 5)
		expect(subscriber).toHaveBeenCalledWith(17, 12)

		atom.value = 18
		expect(skipFn).toHaveBeenCalledWith(18, 17)
		expect(subscriber).toHaveBeenCalledTimes(1) // Skipped (increase of 1)
	})

	test('different atoms are independent', () => {
		const atom1 = makeAtom('a')
		const atom2 = makeAtom('b')

		const sub1 = vi.fn()
		const sub2 = vi.fn()

		atom1.sub(sub1)
		atom2.sub(sub2)

		atom1.value = 'a-updated'
		expect(sub1).toHaveBeenCalledWith('a-updated', 'a')
		expect(sub2).not.toHaveBeenCalled()

		atom2.value = 'b-updated'
		expect(sub1).toHaveBeenCalledTimes(1)
		expect(sub2).toHaveBeenCalledWith('b-updated', 'b')
	})

	test('atom value can be complex objects', () => {
		const atom = makeAtom({
			users: [{ id: 1, name: 'Alice' }],
			settings: { theme: 'dark' }
		})

		const subscriber = vi.fn()
		atom.sub(subscriber)

		const newValue = {
			users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
			settings: { theme: 'light' }
		}

		atom.value = newValue

		expect(subscriber).toHaveBeenCalledWith(newValue, {
			users: [{ id: 1, name: 'Alice' }],
			settings: { theme: 'dark' }
		})
		expect(atom.value).toBe(newValue)
	})
})
