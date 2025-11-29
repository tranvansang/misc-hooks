import {
	Dispatch,
	RefObject,
	SetStateAction,
	useCallback,
	useEffect,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore
} from 'react'
import deepEqual from 'deep-equal'
import {type Atom, makeAtom} from './atom.js'
export {type Atom, makeAtom}

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
): [boolean, Dispatch<boolean | undefined>] {
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

export function useTimedOut(timeout: number) {
	const [timedOut, enable] = useTurnOn()
	useEffect(() => {
		const timer = setTimeout(enable, timeout)
		return () => clearTimeout(timer)
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
	useEffect(() => void setState(() => defaultState), [defaultState])
	return [state, setState] as const
}

export function useEffectWithPrevDeps<T extends readonly unknown[]>(
	effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)),
	deps: T
) {
	const depsRef = useRef<T>(undefined)
	useEffect(
		() => {
			const {current} = depsRef
			depsRef.current = deps
			return effect((current ?? []) as unknown as OptionalArray<T>)
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
			return effect((current ?? []) as unknown as OptionalArray<T>)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	)
}

export function useRefState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>, RefObject<T>]
export function useRefState<T = undefined>(): [
		T | undefined,
	Dispatch<SetStateAction<T | undefined>>,
	RefObject<T | undefined>
]

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

// similar to useEffectEvent
// https://react.dev/learn/separating-events-from-effects
export function useRefValue<T>(value: T) {
	const ref = useRef(value)
	ref.current = value
	return ref
}

// https://github.com/facebook/react/issues/16295
export function useUpdate<T>(getValue: (current?: T) => T) {
	return useReducer(getValue, undefined, getValue)
}


// only update when value is not undefined
export function useKeep<T>(value: T): T {
	const ref = useRef(value)
	if (value !== undefined) ref.current = value
	return ref.current
}

export function useAtom<T>(atom: Atom<T>) {
	// useSyncExternalStore requires getServerSnapshot to return the same value
	const [value] = useState(atom.value)
	return useSyncExternalStore(atom.sub, () => atom.value, () => value)
}

type LoadState<T> = {
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

export function useLoad<T, Params extends any[] = []>(
	getInitial?: () => T | undefined // may throw an error
): LoadState<T> & {
	loadingRef: RefObject<Promise<T> | undefined>
	loadAbortable<T2, Params2 extends any[]>(cb: (disposer: {
		signal: Disposer['signal']
		addDispose: Disposer['addDispose']
	}, ...params: Params2) => T2): (...params: Params2) => T2
	load<Callback extends (...params: any[]) => any>(cb: Callback): Callback
} {
	const loadingRef = useRef<Promise<T>>(undefined)
	const [state, setState] = useState<LoadState<T>>(() => {
		if (!getInitial) return {loading: false} as const
		try {
			return {data: getInitial() as T, loading: false} as const
		} catch (error) {
			return {error, loading: false} as const
		}
	})

	const disposerRef = useRef(makeDisposer())
	useEffect(() => () => {
		disposerRef.current.dispose()
		disposerRef.current = makeDisposer()
	}, [])

	const loadAbortable: any = useCallback((fn: (disposer: {
		signal: Disposer['signal']
		addDispose: Disposer['addDispose']
	}, ...params: Params) => T | Promise<T>) => (...params: Params) => {
		if (disposerRef.current.signal.aborted) return fn({signal: disposerRef.current.signal, addDispose: disposerRef.current.addDispose}, ...params)

		disposerRef.current.dispose()
		const disposer = disposerRef.current = makeDisposer()
		setState({loading: true})
		try {
			const result = fn({signal: disposer.signal, addDispose: disposer.addDispose}, ...params)
			if (typeof (result as any)?.then === 'function') return loadingRef.current = (async () => {
				try {
					const data = await result
					if (!disposer.signal.aborted) setState({data, loading: false})
					return data
				} catch (error) {
					if (!disposer.signal.aborted) setState({error, loading: false})
					throw error
				} finally {
					if (!disposer.signal.aborted) loadingRef.current = undefined
				}
			})()
			if (!disposer.signal.aborted) {
				loadingRef.current = undefined
				setState({data: result as T, loading: false})
			}
			return result
		} catch (error) {
			if (!disposer.signal.aborted) setState({error, loading: false})
			throw error
		}
	}, [])

	const load: any = useCallback((fn: (...params: Params) => T | Promise<T>) => (...params: Params) => loadAbortable(() => fn(...params))(), [loadAbortable])

	return {...state, loadingRef, loadAbortable, load}
}
