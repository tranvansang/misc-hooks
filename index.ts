import type {Dispatch, MutableRefObject, RefObject, SetStateAction} from 'react'
import {useCallback, useEffect, useId, useLayoutEffect, useReducer, useRef, useState} from 'react'
import deepEqual from 'deep-equal'
import addEvtListener from 'add-evt-listener'
import {isBrowser} from 'jmisc'

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
export const nextStateFromAction = <T>(action: SetStateAction<T>, state: T): T => typeof action === 'function'
	? (action as (cur: T) => T)(state)
	: action

type NoPromise<T> = T extends Promise<any> ? never : T
const destroyChainSync = <T>(chain: (void | (() => NoPromise<T>))[]) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	for (const destroy of chain.slice().reverse()) destroy?.()
}

// return [state, toggle]
export const useToggle = (
	init = false
): [boolean, (state?: boolean) => void] => useReducer((state: boolean, action?: boolean) => action ?? !state, init)

export const useTurnOff = (): [boolean, () => void] => useReducer(() => false, true)
export const useTurnOn = (): [boolean, () => void] => useReducer(() => true, false)

export const useUnmountedRef = () => {
	const unmountedRef = useRef(false)
	useEffect(() => {
		unmountedRef.current = false // react18? requires this?
		// from react18, the effect is destroyed and called again sometimes without unmounting
		return () => void (unmountedRef.current = true)
	}, [])
	return unmountedRef
}

export const useMountedRef = () => {
	const mountedRef = useRef(false)
	// note: do not set to false on unmount
	useEffect(() => void (mountedRef.current = true), [])
	return mountedRef
}

export const useMounted = () => {
	const [mounted, enable] = useTurnOn()
	useEffect(enable, [enable])
	return mounted
}

// export const useAtomicCallback = (
// 	func: (...args: any[]) => any,
// 	ref: MutableRefObject<boolean>
// ) => async (...args: any[]) => {
// 	try {
// 		if (ref.current) return
// 		ref.current = true
// 		await func(...args)
// 	} finally {
// 		ref.current = false
// 	}
// }

export const useTimedOut = (timeout: number) => {
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

export const useDebounce = <T>(value: T, timeout: number) => {
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

export const useDeepMemo = <T>(val: T) => {
	const ref = useRef(val)
	if (ref.current !== val && !deepEqual(ref.current, val)) ref.current = val
	return ref.current
}

export const useForceUpdate = () => {
	const countRef = useRef(0)
	const mountedRef = useMountedRef()
	const [, forceUpdate] = useReducer(() => countRef.current, countRef.current)
	return useCallback(() => {
		countRef.current++
		if (mountedRef.current) forceUpdate()
	}, [mountedRef])
}
export const usePrevRef = <T>(value: T) => {
	const currentRef = useRef<T>()
	const prevRef = useRef<T>()
	prevRef.current = currentRef.current
	currentRef.current = value
	return prevRef
}

// todo: need to check if deps really changed
export const useDefaultState = <T>(defaultState: T) => {
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

export const useEffectWithPrevDeps = <T extends readonly unknown[]>(
	effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)),
	deps: T
) => {
	const depsRef = useRef<T>()
	useEffect(
		() => {
			const {current} = depsRef
			depsRef.current = deps
			if (!deepEqual(current, deps)) return effect((current || []) as unknown as OptionalArray<T>)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	)
}

export const useLayoutEffectWithPrevDeps = <T extends readonly unknown[]>(
	effect: (prevDeps: OptionalArray<T>) => (void | (() => void | undefined)),
	deps: T
) => {
	const depsRef = useRef<T>()
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

export function useEnhancedState<S>(initialState?: S | (() => S)): [S, Dispatch<SetStateAction<S>>, MutableRefObject<S>]
export function useEnhancedState<S = undefined>(): [
		S | undefined,
	Dispatch<SetStateAction<S | undefined>>,
	MutableRefObject<S | undefined>
]

export function useEnhancedState<S>(initialState?: S | (() => S)) {
	const [state, setState] = useState(initialState)
	const stateRef = useRef(state)
	stateRef.current = state
	return [state, setState, stateRef]
}

export function useRefState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>, MutableRefObject<T>]
export function useRefState<T = undefined>(): [
		T | undefined,
	Dispatch<SetStateAction<T | undefined>>,
	MutableRefObject<T | undefined>
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
export const useAtomicMaker = (): [
	boolean,
	<T, V>(cb: (...params: T[]) => V) => ((...params: T[]) => Promise<V | void>)
] => {
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

export const useAtomicCallback = <T, V extends Promise<any>>(
	cb: (...params: T[]) => V
): [boolean, (...params: T[]) => Promise<V | void>] => {
	const [loading, makeAtomic] = useAtomicMaker()
	return [loading, useCallback((...params) => makeAtomic(cb)(...params), [makeAtomic, cb])]
}

// similar to useEffectEvent
// https://react.dev/learn/separating-events-from-effects
export const useRefValue = <T>(value: T) => {
	const ref = useRef(value)
	ref.current = value
	return ref
}

// delay state change if animation/transition is running
// note: ref.current must be defined from the first effect
export function useAnimationState<T>(elmRef: RefObject<Element>, initialValue: T): [T, Dispatch<SetStateAction<T>>]
export function useAnimationState<T = undefined>(elmRef: RefObject<Element>): [
		T | undefined,
	Dispatch<SetStateAction<T | undefined>>
]

// note: if the animation fires before javascript is loaded, animationstart/transitionstart is not fired.
// this usually happens.
export function useAnimationState<T>(elmRef: RefObject<Element>, value?: T) {
	const [state, setState, lastStateRef] = useRefState(value)
	const animatingRef = useRef(false)
	const transitioningRef = useRef(false)
	const hasPendingStateRef = useRef(false)
	const pendingStateRef = useRef<T>()

	useEffect(() => {
		const {current} = elmRef

		if (current) {
			const onEnd = () => {
				if (!animatingRef.current && !transitioningRef.current && hasPendingStateRef.current) {
					setState(pendingStateRef.current)
					hasPendingStateRef.current = false
					pendingStateRef.current = undefined
				}
			}
			const remove = [
				addEvtListener(current, 'animationstart', () => {
					animatingRef.current = true
				}),
				addEvtListener(current, 'animationend', () => {
					animatingRef.current = false
					onEnd()
				}),
				addEvtListener(current, 'animationcancel', () => {
					animatingRef.current = false
					onEnd()
				}),
				addEvtListener(current, 'transitionstart', () => {
					transitioningRef.current = true
				}),
				addEvtListener(current, 'transitionend', () => {
					transitioningRef.current = false
					onEnd()
				}),
				addEvtListener(current, 'transitioncancel', () => {
					transitioningRef.current = false
					onEnd()
				}),
			]

			return () => {
				destroyChainSync(remove)
			}
		}
	}, [elmRef, setState])

	const safeSetState = useCallback((setStateAction: SetStateAction<T | undefined>) => {
		requestAnimationFrame(() => {
			if (animatingRef.current || transitioningRef.current) {
				pendingStateRef.current = nextStateFromAction(
					setStateAction,
					hasPendingStateRef.current ? pendingStateRef.current : lastStateRef.current
				)
				hasPendingStateRef.current = true
			} else setState(setStateAction)
		})
	}, [lastStateRef, setState])

	return [state, safeSetState]
}

// falsy to disable
export const useConfirmDiscard = (msg?: string) => {
	useEffect(() => {
		if (msg) return addEvtListener(
			window,
			'beforeunload',
			e => {
				e.preventDefault()
				// @ts-ignore
				e.returnValue = msg
			},
			{capture: true}
		)
	}, [msg])
}

export const useIsoLayoutEffect = isBrowser ? useLayoutEffect : useEffect

export const useWindowSize = () => {
	const [size, setSize] = useState({
		width: isBrowser ? window.innerWidth : undefined,
		height: isBrowser ? window.innerHeight : undefined
	})
	useEffect(() => addEvtListener(
		window,
		'resize',
		() => requestAnimationFrame(() => setSize({
			width: window.innerWidth,
			height: window.innerHeight,
		}))), [])
	return size
}

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
export const useScopeId = (prefix?: string) => {
	const id = useId()
	return useCallback((name?: string) => `${prefix ?? ''}${id}${name ?? ''}`, [id, prefix])
}

export const useUpdate = <T>(getValue: () => T) => useReducer(getValue, getValue())

// only update when value is not undefined
export const useKeep = <T>(value: T): T => {
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
