import {
	Dispatch,
	RefObject,
	SetStateAction,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore
} from 'react'
import deepEqual from 'deep-equal'

type OptionalArraySub<T extends readonly unknown[],
	R extends readonly unknown[]> = number extends R['length']
	? never
	: number extends T['length']
		? never
		: T['length'] extends R['length']
			? R
			: OptionalArraySub<T, [...R, undefined | T[R['length']]]>
export type OptionalArray<T extends readonly unknown[]> = number extends T['length']
	? (T[number] | undefined)[]
	: OptionalArraySub<T, []>

// https://github.com/facebook/react/blob/ddd1faa1972b614dfbfae205f2aa4a6c0b39a759/packages/react-dom/src/server/ReactPartialRendererHooks.js#L251
export function nextStateFromAction<T>(action: SetStateAction<T>, state: T): T {
	return typeof action === 'function'
		? (action as (cur: T) => T)(state)
		: action
}


// return [state, toggle]
export function useToggle(
	init = false
): [boolean, (state?: boolean) => void] {
	return useReducer((state: boolean, action?: boolean) => action ?? !state, init)
}

export function useTurnOff(): [boolean, () => void] {
	return useReducer(() => false, true)
}

export function useTurnOn(): [boolean, () => void] {
	return useReducer(() => true, false)
}

export function useUnmountedRef() {
	const unmountedRef = useRef(false)
	useEffect(() => {
		unmountedRef.current = false // react18? requires this?
		// from react18, the effect is destroyed and called again sometimes without unmounting
		return () => void (unmountedRef.current = true)
	}, [])
	return unmountedRef
}

export function useMountedRef() {
	const mountedRef = useRef(false)
	// note: do not set to false on unmount
	useEffect(() => void (mountedRef.current = true), [])
	return mountedRef
}

export function useMounted() {
	const [mounted, enable] = useTurnOn()
	useEffect(enable, [enable])
	return mounted
}

// export const useAtomicCallback = (
// 	func: (...args: any[]) => any,
// 	ref: RefObject<boolean>
// ) => async (...args: any[]) => {
// 	try {
// 		if (ref.current) return
// 		ref.current = true
// 		await func(...args)
// 	} finally {
// 		ref.current = false
// 	}
// }

export function useTimedOut(timeout: number) {
	const [timedOut, enable] = useTurnOn()
	useEffect(() => {
		let cancelled = false
		const timer = setTimeout(() => {
			if (!cancelled) enable()
		}, timeout)
		return () => {
			cancelled = true
			clearTimeout(timer)
		}
	}, [enable, timeout])
	return timedOut
}

export function useDebounce<T>(value: T, timeout: number) {
	const [debouncedValue, setDebouncedValue] = useState(value)
	useEffect(() => {
		let cancelled = false
		const timeoutId = setTimeout(() => {
			if (!cancelled) setDebouncedValue(value)
		}, timeout)
		return () => {
			cancelled = true
			clearTimeout(timeoutId)
		}
	}, [value, timeout])
	return debouncedValue
}

export function useDeepMemo<T>(val: T, isEqual: (cur: T, next: T) => boolean = deepEqual) {
	const ref = useRef(val)
	if (ref.current !== val && !isEqual(ref.current, val)) ref.current = val
	return ref.current
}

export function useForceUpdate() {
	const countRef = useRef(0)
	const mountedRef = useMountedRef()
	const [, forceUpdate] = useReducer(() => countRef.current, countRef.current)
	return useCallback(() => {
		countRef.current++
		if (mountedRef.current) forceUpdate()
	}, [mountedRef])
}

export function usePrevRef<T>(value: T) {
	const currentRef = useRef<T>(undefined)
	const prevRef = useRef<T>(undefined)
	prevRef.current = currentRef.current
	currentRef.current = value
	return prevRef
}


// todo: need to check if deps really changed
export function useDefaultState<T>(defaultState: T) {
	const [state, setState] = useState(defaultState)
	useEffect(() => {
		setState(() => defaultState)
	}, [defaultState])
	return [state, setState] as const
}

// export const useAtomicExecute = () => {
// 	const isRunningRef = useRef(false)
// 	const [isRunning, setIsRunning] = useState(false)
// 	return [isRunning, useCallback(async <T>(func: () => Promisable<T>) => {
// 		if (isRunningRef.current) return
// 		isRunningRef.current = true
// 		setIsRunning(true)
// 		try {
// 			return await func()
// 		} finally {
// 			isRunningRef.current = false
// 			setIsRunning(false)
// 		}
// 	}, [])] as const
// }

export function useEffectWithPrevDeps<T extends readonly unknown[]>(
	effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)),
	deps: T
) {
	const depsRef = useRef<T>(undefined)
	useEffect(
		() => {
			const {current} = depsRef
			depsRef.current = deps
			return effect((current || []) as unknown as OptionalArray<T>)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	)
}

export function useLayoutEffectWithPrevDeps<T extends readonly unknown[]>(
	effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)),
	deps: T
) {
	const depsRef = useRef<T>(undefined)
	useLayoutEffect(
		() => {
			const {current} = depsRef
			depsRef.current = deps
			if (!deepEqual(current, deps)) return effect((current || []) as unknown as OptionalArray<T>)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	)
}

export function useEffectOnce<T extends readonly unknown[]>(
	effect: () => (void | (() => void | undefined)),
	deps: T
) {
	const firedRef = useRef(false)
	useEffect(
		() => {
			if (!firedRef.current) {
				firedRef.current = true
				return effect()
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	)
}

export function useEnhancedState<S>(initialState?: S | (() => S)): [S, Dispatch<SetStateAction<S>>, RefObject<S>]
export function useEnhancedState<S = undefined>(): [
		S | undefined,
	Dispatch<SetStateAction<S | undefined>>,
	RefObject<S | undefined>
]

export function useEnhancedState<S>(initialState?: S | (() => S)) {
	const [state, setState] = useState(initialState)
	const stateRef = useRef(state)
	stateRef.current = state
	return [state, setState, stateRef]
}

export function useRefState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>, RefObject<T>]
export function useRefState<T = undefined>(): [
		T | undefined,
	Dispatch<SetStateAction<T | undefined>>,
	RefObject<T | undefined>
]

// a similar implementation is replicated in popup/hooks.tsx's PromptBody
export function useRefState<T>(initialValue?: T) {
	const [state, _setState] = useState(initialValue)
	const lastStateRef = useRef(initialValue)

	const setState = useCallback((setStateAction: SetStateAction<T | undefined>) => {
		const nextState = nextStateFromAction<T | undefined>(setStateAction, lastStateRef.current)
		if (nextState !== lastStateRef.current) {
			lastStateRef.current = nextState
			_setState(nextState)
		}
	}, [])

	return [state, setState, lastStateRef]
}

// never create a hook like useAtomic, atomic(promise).

// the purpose of atomic maker is to prevent racing, but the atomic(promise) wil always trigger the promise.
export function useAtomicMaker(): [
	boolean,
	<T, V>(cb: (...params: T[]) => V) => ((...params: T[]) => Promise<V | undefined>)
] {
	const [loading, setLoading, lastLoadingRef] = useRefState(false)
	return [loading, useCallback(<T, V>(func: (...params: T[]) => V) => async (...params: T[]) => {
		if (lastLoadingRef.current) return
		setLoading(true)
		try {
			return await func(...params)
		} finally {
			setLoading(false)
		}
	}, [setLoading, lastLoadingRef])]
}

export function useAtomicCallback<T, V extends Promise<any>>(
	cb: (...params: T[]) => V
): [boolean, (...params: T[]) => Promise<V | undefined>] {
	const [loading, makeAtomic] = useAtomicMaker()
	return [loading, useCallback((...params) => makeAtomic(cb)(...params), [makeAtomic, cb])]
}

// similar to useEffectEvent
// https://react.dev/learn/separating-events-from-effects
export function useRefValue<T>(value: T) {
	const ref = useRef(value)
	ref.current = value
	return ref
}

// falsy to disable
// 	- `useConfirmDiscard(msg)`: show confirm dialog when user tries to reload the page. `msg` is the message to show. If `msg` is falsy, the confirm dialog is disabled.
// export const useConfirmDiscard = (msg?: string) => {
// 	useEffect(() => {
// 		if (msg) return addEvtListener(
// 			window,
// 			'beforeunload',
// 			e => {
// 				e.preventDefault()
// 				// @ts-ignore
// 				e.returnValue = msg
// 			},
// 			{capture: true}
// 		)
// 	}, [msg])
// }
//
// 	- `[width, height] = useWindowSize()`: get window size, listen to `resize` event of `window`. In SSR, `width` and `height` are `undefined`. Note: be careful when handling hydration mismatch.
// export const useWindowSize = () => {
// 	const [size, setSize] = useState({
// 		width: typeof window === 'object' ? window.innerWidth : undefined,
// 		height: typeof window === 'object' ? window.innerHeight : undefined
// 	})
// 	useEffect(() => addEvtListener(
// 		window,
// 		'resize',
// 		() => requestAnimationFrame(() => setSize({
// 			width: window.innerWidth,
// 			height: window.innerHeight,
// 		}))), [])
// 	return size
// }

export function usePropState<S>(initialState: S | (() => S)): {
	value: S
	setValue: Dispatch<SetStateAction<S>>
}
export function usePropState<S = undefined>(): {
	value: S | undefined
	setValue: Dispatch<SetStateAction<S | undefined>>
}
export function usePropState<S>(initialState?: S) {
	const [value, setValue] = useState(initialState)
	return {value, setValue}
}

// export const useId1 = () => {
// 	const idContext = useContext(IdContext)
// 	return useMemo(() => {
// 		// in development, StrictMode causes the component rendered twice in browser, but once in server.
// 		if (process.env.NODE_ENV === NodeEnv.development && !isBrowser && !disableStrictModeInDev) idContext.current++
// 		return `id-${idContext.current++}`
// 	}, [idContext])
// }

// native useId is not that simple to be used in SSR.
// it requires the consistent virtual DOM tree.
// https://github.com/facebook/react/pull/22644

// https://github.com/vercel/next.js/pull/31102/files
export function useScopeId(prefix?: string) {
	const id = useId()
	return useCallback((name?: string) => `${prefix ?? ''}${id}${name ?? ''}`, [id, prefix])
}


// https://github.com/facebook/react/issues/16295
export function useUpdate<T>(getValue: (current?: T) => T) {
	return useReducer(getValue, undefined, getValue)
}


// only update when value is not undefined
export function useKeep<T>(value: T): T {
	const ref = useRef(value)
	if (value !== undefined) ref.current = value
	return value ?? ref.current
}

export function useListData<T>(
	{
		load,
		initial = {
			list: [],
			hasNext: true,
			hasPrev: true,
		},
	}: {
		initial?: {
			list: T[]
			hasNext: boolean
			hasPrev: boolean
		}
		load(params: {
			before?: T
			after?: T
		}): Promise<{
			records: T[]
			hasMore: boolean
		}>
	}
) {
	const [state, setState] = useState(initial)
	const loadNextRef = useRef(false)
	const loadPrevRef = useRef(false)
	return {
		...state,
		setState,
		async loadNext() {
			if (loadNextRef.current) return
			try {
				loadNextRef.current = true
				const res = await load({after: state.list.at(-1)})
				setState(({list, ...st}) => ({
					...st,
					list: [...list, ...res.records],
					hasNext: res.hasMore,
				}))
				return res
			} finally {
				loadNextRef.current = false
			}
		},
		async loadPrev() {
			if (loadPrevRef.current) return
			try {
				loadPrevRef.current = true
				const res = await load({before: state.list[0]})
				setState(({list, ...st}) => ({
					...st,
					list: [...res.records, ...list],
					hasPrev: res.hasMore,
				}))
				return res
			} finally {
				loadPrevRef.current = false
			}
		},
	}
}

export interface Atom<T> {
	get value(): T
	set value(newValue: T)
	sub(
		subscriber: (newValue: T, oldValue: T) => void | (() => void),
		options?: {now?: boolean, skip?(newValue: T, oldValue: T): boolean}
	): () => void
}
export function makeAtom<T>(): Atom<T | undefined>
export function makeAtom<T>(initial: T): Atom<T>
export function makeAtom<T>(initial?: T | undefined) {
	let value = initial as T
	let count = 0
	const subscribers: Record<number, {
		subscriber: (newValue: T, oldValue: T) => void | (() => void)
		cleanup: void | (() => void)
		skip?(newValue: T, oldValue: T): boolean
	}> = Object.create(null)
	return {
		get value() {
			return value
		},
		set value(newValue: T) {
			const oldValue = value
			value = newValue
			for (const pair of Object.values(subscribers))
				if (!pair.skip?.(newValue, oldValue)) {
					pair.cleanup?.()
					pair.cleanup = undefined
					pair.cleanup = pair.subscriber(newValue, oldValue)
				}
		},
		sub(
			subscriber: (newValue: T, oldValue: T) => void | (() => void),
			{now = false, skip}: {now?: boolean, skip?(newValue: T, oldValue: T): boolean} = {}
		) {
			const id = count++
			subscribers[id] = {
				subscriber,
				cleanup: now && !skip?.(value, undefined as T) ? subscriber(value, undefined as T) : undefined,
				skip,
			}
			return () => {
				subscribers[id]?.[1]?.()
				delete subscribers[id]
			}
		}
	}
}
export function combineAtoms<T extends readonly any[]>(atoms: {[K in keyof T]: Atom<T[K]>}): Atom<T> {
	const atom = makeAtom<T>(atoms.map(a => a.value) as unknown as T)
	for (const a of atoms)
		a.sub(() => void (atom.value = atoms.map(a => a.value) as unknown as T))
	return atom
}

export function useAtom<T>(atom: Atom<T>) {
	// useSyncExternalStore requires getServerSnapshot to return the same value
	const [value] = useState(atom.value)
	return useSyncExternalStore(atom.sub, () => atom.value, () => value)
}

export type Disposer = ReturnType<typeof makeDisposer>
export function makeDisposer() {
	const disposeFns: ((() => void) | undefined)[] = []
	const abortController = new AbortController()
	return {
		addDispose(this: void, dispose?: () => void) {
			if (abortController.signal.aborted) {
				dispose?.()
				return () => {}
			}
			disposeFns.push(dispose)
			return () => {
				const idx = disposeFns.indexOf(dispose)
				if (idx !== -1) disposeFns.splice(idx, 1)
			}
		},
		dispose(this: void) {
			abortController.abort()
			for (const dispose of disposeFns.slice().reverse()) dispose?.()
		},
		signal: abortController.signal,
	}
}

type AsyncState<T> = {
	data: T
	error?: undefined
	loading: false
} | {
	data?: undefined
	error: unknown
	loading: false
} | {
	data?: undefined
	error?: undefined
	loading: boolean
}

export function useAsync<T, Params extends any[]>(
	asyncFn: (disposer: {
		signal: Disposer['signal']
		addDispose: Disposer['addDispose']
		params: Params
	}) => Promise<T> | T,
	getInitial?: () => T | undefined // may throw an error
): AsyncState<T> & { reload(this: void, ...params: Params): Promise<T> } {
	const [state, setState] = useState<AsyncState<T>>(() => {
		if (!getInitial) return {loading: false} as const
		try {
			return {data: getInitial() as T, loading: false} as const
		} catch (error) {
			return {error, loading: false} as const
		}
	})

	const disposerRef = useRef<Disposer>(undefined)
	useEffect(() => () => {
			disposerRef.current?.dispose()
			disposerRef.current = undefined
		}, [])

	const loadRef = useRefValue(load)
	const reload = useCallback((...params: Params) => loadRef.current(...params), [loadRef])

	return {...state, reload}

	async function load(...params: Params){
		disposerRef.current?.dispose()
		const disposer = makeDisposer()
		disposerRef.current = disposer

		setState({loading: true})
		const promise = (async () => asyncFn({
			signal: disposer.signal,
			addDispose: disposer.addDispose,
			params,
		}))() // Promise.try proposal
		try {
			const data = await promise
			if (!disposer.signal.aborted) setState({data, loading: false}) // https://github.com/reactwg/react-18/discussions/82
		} catch (error) {
			if (!disposer.signal.aborted) setState({error, loading: false})
		}
		return promise
	}
}

export function useAsyncEffect(
	asyncFn: (disposer: Omit<Disposer, 'dispose'>) => any,
	deps: readonly any[]
) {
	useEffect(() => {
		const disposer = makeDisposer()
		;(async () => {
			disposer.addDispose(await asyncFn({
				signal: disposer.signal,
				addDispose: disposer.addDispose,
			}))
		})()
		return disposer.dispose
	}, deps)
}
