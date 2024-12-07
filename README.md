# misc-hooks - Precious React hooks

## Atom - A simple state management hook

`makeAtom(), useAtom()`: atom value. Usage:

```
	atom = makeAtom() // make atom
	atom = makeAtom(initialValue) // make atom with initial value
	useAtom(atom) // use atom in component
	atom.value = newValue // set value
	value = atom.value // get value
	unsub = atom.sub(val => console.log(val)) // subscribe
	unsub() // unsubscribe
```

### `useAsync()` - Async data loading hook

- Signature: `useAsync<T>(asyncFn, getInitial)`.
	- `asyncFn: (staledRef: MutableRefObject<boolean>) => Promise<T> | T`: a function that returns the data or a promise which resolves to the data.
  - `staledRef.current` is `true` if the data is staled, i.e., there is a newer request to load the data.
	- `getInitial?: () => T | undefined`: an optional function that returns the initial data.
		If not provided, the initial data is `undefined`.
		`getInitial()` can return `undefined`, `getInitial` can be absent, or it can throw an error.
	- Returns `{data, error, reload}` where:
		- If `data` and `error` are both `undefined`, it means the data is loading or not yet loaded (initial render).
			They are never both not `undefined`.
		- `reload`: a function that takes no argument, reloads the data and returns what the function passed to the hook returns.
			The `reload` function reference never changes, you can safely pass it to the independent array of `useEffect` without causing additional renders.
			In subsequent renders, `reload` uses the latest function passed to the hook.

- `useAsync`: only loads data in the first return, only if initial data is not provided.
	If you want to reload the data, you need to call `reload()`.
- 
```typescript
const {data, error, reload} = useAsync((staledRef) => loadData(params))
// when params changes, you need to manually call reload()
useEffect(() => void reload(), [params, reload]) // `reload` value never changes
```

#### Note
- `useAsync<T>()` has a generic type `T` which is the type of the data returned by the function passed to the hook.
- When calling `reload()`, `error` and `data` are immediately/synchronously set to `undefined` (via `setState`) and the data is reloaded.
- If you want to keep the last data while reloading, for example, to keep the last page of a paginated list until the new page is loaded, use `useKeep` hook described at thee end of this document.
- If you want to delay showing the loading indicator, use `useTimedOut` hook described at the end of this document.
- For now, both `data` and `Error`'s types are defined. We will improve the type definition in the future.

Sample usage:
```tsx
const {data, error, reload} = useAsync((staledRef) => loadData(params))
const timedOut = useTimedOut(500)
const dataKeep = useKeep(data)
return error // has error
	? <ErrorPage/>
	: dataKeep // has data
		? <Data data={dataKeep}/>
		: timedOut // loading
			? <Loading/>
			: null
```

## Other Exported Hooks

- `timedout = useTimedOut(timeout)`: get a boolean whose value is `true` after `timeout` ms.
- `lastDefinedValue = useKeep(value)`: keep the last defined value. If `value` is `undefined`, the last defined value is returned.
- `[loading, makeAtomic] = useAtomicMaker()`: get a function to make a function atomic by calling `await makeAtomic(cb)(...params)`. `loading` is `true` when the atomic function is running. If another atomic function is called when the previous one is running, the new one returns `undefined`.
- `[loading, atomicCb] = useAtomicCallback(cb)`: similar to `useAtomicMaker` with `atomicCb = makeAtomic(cb)`.
- `nextState = nextStateFromAction(action, state)`: get next state from `setState` action.
- `[state, toggle] = useToggle(init = false)`: `toggle()` to toggle boolean `state` state, or, `toggle(true/false)` to set state.
- `[state, enable] = useTurnOn()`: `enable()` to set state to `true`.
- `[state, disable] = useTurnOff()`: `disable()` to set state to `false`.
- `unmountedRef = useUnmountedRef()`: get a ref whose value is `true` when component is unmounted. Note, from react 18, the effect is sometimes unmounted and mounted again.
- `mountedRef = useMountedRef()`: get a ref whose value is `true` when component is mounted. Note: ref's value is not set to `false` when component is unmounted.
- `mounted = useMounted()`: get a boolean whose value is `true` when component is mounted. Note: the value is not set to `false` when component is unmounted.
- `state = useDebounce(value, timeout)`: get a debounced value. `state` is updated after at least `timeout` ms.
- `memoValue = useDeepMemo(value)`: get a memoized value. `value` is compared by `deep-equal` package.
- `update = useForceUpdate()`: get a function to force re-render component.
- `prefRef = usePrevRef(value)`: get a ref whose value is the previous `value`.
- `[state, setState] = useDefaultState(defaultState)`: when `defaultState` changes, set `state` to `defaultState`. Note: we currently rely on deps array to trigger the effect. Need to check if react never fires the effect when the deps array is the same.
- `useEffectWithPrevDeps((prevDeps) => {}, [...deps])`: similar to `useEffect`, but also provides previous deps to the effect function.
- `useEffectOnce(() => {}, [...deps])`: similar to `useEffect`, but fires only once.
- `useLayoutEffectWithPrevDeps((prevDeps) => {}, [...deps])`: `useLayoutEffect` version of `useEffectWithPrevDeps`.
- `[state, setState, stateRef] = useEnhancedState(initialState)`: similar to `useState`, but also returns a ref whose value is always the latest `state`.
- `[state, setState, stateRef] = useRefState(initialState)`: similar to `useState`. `stateRef`'s value is set immediately and synchronously after `setState` is called. Note: `initialState` can not be a function.
- `ref = useRefValue(value)`: similar to [`useEffectEvent`](https://react.dev/learn/separating-events-from-effects), get a ref whose value is always the latest `value`.
- `{value, setValue} = usePropState(initialState)`: similar to `useState`, but the returned value is an object, not an array.
- `scopeId = useScopeId(prefix?: string)`: get a function to generate scoped id. `prefix` is the prefix of the id. The id is generated by `scopeId(name?: string) = prefix + id + name`. `id` is a SSR-statically random number generated by `useId()`.
- `update = useUpdate(getValue)`: get a function to force re-render component. `getValue` is a function to get the latest value to compare with the previous value. The latest passed `getValue` is always used (`useReducer` specs).
- Type `OptionalArray` (type).

- `useListData()`: utility to load list data. Usage:
```typescript
	const {list, hasPrev, hasNext, loadPrev, loadNext} = useListData({
	initial: {
		list, // default list
		hasNext, // default hasNext
		hasPrev, // default hasPrev
	},
	async load({before, after}) { // function to load data
		return {
			records, // new records
			hasMore, // whether there are more records
		}
	}
})
```

