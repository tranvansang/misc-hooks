export interface Atom<T> {
	get value(): T
	set value(val: T)
	sub(
		subscriber: (val: T, old?: T) => void | (() => void),
		options?: {now?: boolean, skip?(val: T, old?: T): boolean}
	): () => void
}
export function makeAtom<T>(): Atom<T | undefined>
export function makeAtom<T>(initial: T): Atom<T>
export function makeAtom<T>(initial?: T | undefined) {
	let value = initial as T
	let count = 0
	const subscribers: Record<number, {
		subscriber: (val: T, old?: T) => void | (() => void)
		cleanup: void | (() => void)
		skip?(val: T, old?: T): boolean
	}> = Object.create(null)
	return {
		get value() {
			return value
		},
		set value(val: T) {
			const old = value
			value = val
			for (const pair of Object.values(subscribers))
				if (!pair.skip?.(val, old)) {
					pair.cleanup?.()
					pair.cleanup = undefined
					pair.cleanup = pair.subscriber(val, old)
				}
		},
		sub(
			subscriber: (val: T, old?: T) => void | (() => void),
			{now = false, skip}: {now?: boolean, skip?(val: T, old?: T): boolean} = {}
		) {
			const id = count++
			subscribers[id] = {
				subscriber,
				cleanup: now && !skip?.(value, undefined) ? subscriber(value, undefined) : undefined,
				skip,
			}
			return () => {
				subscribers[id]?.cleanup?.()
				delete subscribers[id]
			}
		}
	}
}
