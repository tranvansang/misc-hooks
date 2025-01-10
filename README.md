# misc-hooks - Precious React Hooks Library

## 1. `makeAtom(), useAtom(atom)` A Simple State Management Hook

### Sample Usage

```typescript
  // create atom
  const atom = makeAtom<T>()
  const atom = makeAtom<T>(initialValue) // with initial value

  // use atom in React component
  const value = useAtom(atom)

  // getter and setter
  atom.value = newValue // set value synchronously
  value = atom.value // get value synchronously

// subscribe for changes
  unsub = atom.sub(val => console.log(val))
  unsub = atom.sub(() => console.log(atom.value))
  unsub() // unsubscribe
```

### API

- `makeAtom(initialValue?: T)`: create an atom with an initial value.
- `useAtom(atom: Atom<T>): T`: use an atom in a React component.
- `atom.value`: get or set the value synchronously.

## 2. `useAsyncEffect()` Async Effect Hook And `makeDisposer()` Utility

### Sample Usage

```typescript
useAsyncEffect(async ({signal, addDispose}) => {
  const loader = makeLoader()
  
  signal.addEventListener('abort', () => loader.abort())
  const value = await loader.loadData(params)
  
  window.addEventListener('resize', value.update)
  
  return () => {
    window.removeEventListener('resize', value.update)
    value.dispose()
  }
}, [params])
```

### API

`useAsyncEffect(effectFn)` is a hook that is similar to `useEffect()`, but it can return a cleanup function asynchronously.

The effect function `effectFn` is called with an object `{signal, addDispose}`.
- `signal`: an `AbortSignal` object that is aborted when the component is unmounted or the effect is re-run.
- `addDispose(dispose?: () => void)`: add a function to be called when the component is unmounted or the effect is re-run.
  If the component is unmounted or the effect is reloaded before, `dispose` is immediately and synchronously called.
`addDispose()` returns a function to remove the added function.

`makeDisposer()`: is a utility function that returns an object with the following properties:
- `addDispose(fn: () => void)`: add a function to be called when the `dispose()` method is called.
If `dispose()` method is called before, `fn` is immediately and synchronously called.
`addDispose()` returns a function to remove the added function.

- `signal`: an `AbortSignal` object that is aborted when the `dispose()` method is called.
- `dispose()`: abort the signal and call all functions added by `addDispose()`.

## 3. `useAsync()` Async Data Loading Hook

### Sample Usage

```typescript
const {data, error, reload, loading} = useAsync(async () => await fetchData(params))
useEffect(() => {reload().catch(() => {})}, [params, reload]) // load data in first render and when params changes
if (error) throw error // propagate error to ErrorBoundary
```

### API

Signature: `const {error, data, reload, loading} = useAsync<T>(asyncFn, getInitial)`.

- (required)`asyncFn: (disposer) => Promise<T> | T` is a function that returns the data or a promise resolving the data.

- (optional) `getInitial?: () => T | undefined`: a function that optionally returns initial data.

`getInitial` if provided, is called in the server render, and in the first client render.
If it throws an error, the error is caught and set to `error`.

- `disposer`: an object with the following properties:
  - `addDispose(dispose: () => void)`: add a function to be called when the component is unmounted or the data is reloaded.
If the component is unmounted or the data is reloaded before, `dispose` is immediately and synchronously called.
`addDispose()` returns a function to remove the added function.

  - `signal`: an `AbortSignal` object that is aborted when the component is unmounted or the data is reloaded.

- `loading`: a boolean that is `true` when the data is loading.
- `reload`: a function that takes no argument, reloads the data and returns the result of the `asyncFn`.
  **`reload` value never changes**, it can be safely used in the second argument of `useEffect`.
  In subsequent renders, `reload` uses the latest function `asyncFn` passed to the hook.

### Practical Usage

Practice 1:
When `reload()` is called, `error` and `data` are set to `undefined` (via `setState`) before `asyncFn` is called.
There is a case that the last data needs to be kept while reloading, for example, when changing a page number, you want to show the current data until the next page is loaded,
Use `useKeep` hook.

Practice 2: If you want to delay showing the loading indicator, use `useTimedOut` hook.

Practice 3: If params is an object, and you want to reload the data when the object changes, use `useDeepMemo` hook.

Sample usage:
```tsx
const memoParams = useDeepMemo(params)
const {data, error, reload, loading} = useAsync((disposer) => loadData(memoParams))
useEffect(() => {reload().catch(() => {})}, [memoParams, reload]) // load data when params deeply changes
const timedOut = useTimedOut(500)
const dataKeep = useKeep(data)
if (error) throw error
return dataKeep // has data
  ? <Data data={dataKeep}/>
  : timedOut // loading
    ? <Loading/>
    : null // show empty when loading is too fast
```

### SSR Guide:

`useAsync()` can be used in SSR by providing `getInitial` function.

`getInitial` is called in only in the server render, and in the first client render.

- In server side, in `getInitial`: check data availability via a store defined within the request scope.
  - If data is available, return the data synchronously.
  - If data is not available:
    - Return `undefined` synchronously
    - Trigger data loading, retain the promise for later use.
    - Mark the render not ready to return to the client.
    - Wait for all data loaded.
    - Re-render the component with the loaded data.

- In client side:
  - Store SSR data in the global scope.
  - Start hydration with the SSR data.
  - Clear the SSR data after the first render: `useEffect(() => clearSSRData(), [])`.
  - In `getInitial`: check data availability via the SSR data stored globally.
    - If data is available, return the data synchronously.
    - If data is not available: return `undefined` synchronously.

- To load data only when the data is not available in SSR:

Load only once: use `useRef()` to check if the data is already loaded.
```javascript
const {data, reload} = useAsync(fetchData, () => getSSRData(deepParams))
const dataRef = useRef(data) // use useRef() to avoid re-render
dataRef.current = data
useEffect(() => void (!dataRef.current && reload().catch(() => {})) , [reload]) // reload never changes and is safe to place in the second argument
```

Re-load when params changes, client-rendering version without SSR support:
```javascript
const deepParams = useDeepMemo(params)
const {data, reload} = useAsync(async () => await fetchData(deepParams), () => getSSRData(params))
useEffect(() => void(reload()), [deepBody, reload])
```

Combine the two to support SSR, only load if data is empty and re-load when params changes: use `useEffectWithPrevDeps()`:
```javascript
const deepParams = useDeepMemo(params)
const {data, reload} = useAsync(async () => await fetchData(deepParams), () => getSSRData(params))
const dataRef = useRef(data) // or useRefValue(data) or useEffectEvent(data)
dataRef.current = data
useEffectWithPrevDeps(
  ([prevBody, prevReload]) => void ((prevReload || !dataRef.current) && reload().catch(() => {})),
  [deepBody, reload]
)
```

## 4. Atomic Action Hooks

### Sample Usage

Sample `useAtomicCallback`:
```tsx
const [loading, onSave] = useAtomicCallback(async () => await saveData(data))
return <button onClick={onSave} disabled={loading}>Save</button>
```

Sample `useAtomicMaker`:
```tsx
const [loading, makeAtomic] = useAtomicMaker()
return <>
  <button onClick={makeAtomic(onSave)} disabled={loading}>Save</button>
  <button onClick={makeAtomic(onDelete)} disabled={loading}>Delete</button>
</>
```

Sample `useAtomicMaker`:
```tsx
const [loading, makeAtomic] = useAtomicMaker()
return <>
  <button onClick={onSave} disabled={loading}>Save</button>
  <button onClick={onDelete} disabled={loading}>Delete</button>
</>
async function onSave() {
  await makeAtomic(async () => await saveData(data))
}
async function onDelete() {
  await makeAtomic(async () => await deleteData(data))
}
```

### API

`[loading, atomicCb] = useAtomicCallback(cb)`: convert a callback function `cb` to an atomic callback function.

The atomic callback function is a function that can be called only once at a time.
If the atomic callback function is called when the previous one is running, the new one returns `undefined`.

The function returns an array `[loading, atomicCb]`:
- `loading`: a boolean that is `true` when the atomic callback function is running.
- `atomicCb`: the atomic callback function.

`[loading, makeAtomic] = useAtomicMaker()`: the hook to create an atomic maker, used to combine multiple functions into atomic functions.

`useAtomicMaker()` takes no argument and returns an array `[loading, makeAtomic]`:
- `loading`: a boolean that is `true` when the atomic function is running.
- `makeAtomic(cb)`: a function to make the argument function `cb` atomic.

## 5. Other Hooks

### Frequently used hooks
- `useEffectWithPrevDeps((prevDeps) => {}, [...deps])`: similar to `useEffect`, but provides previous deps to the effect function.
- `memoValue = useDeepMemo(value)`: get a memoized value. `value` is compared by `deep-equal` package.
- `lastDefinedValue = useKeep(value)`: keep the last defined value. When `value` is `undefined`, the last non-`undefined` value is returned.
- `ref = useRefValue(value)`: similar to [`useEffectEvent`](https://react.dev/learn/separating-events-from-effects), get a ref whose value is always the latest `value`.

- `timedout = useTimedOut(timeout)`: get a boolean whose value is `true` after `timeout` ms.
- `state = useDebounce(value, timeout)`: get a debounced value. `state` is updated after at least `timeout` ms.
- `[state, setState, stateRef] = useRefState(initialState)`: similar to `useState`. `stateRef`'s value is set immediately and synchronously after `setState` is called. Note: `initialState` can not be a function.
- `update = useForceUpdate()`: get a function to force re-render component.

### Others
- `[state, setState] = useDefaultState(defaultState)`: when `defaultState` changes, set `state` to `defaultState`.
- `[state, update] = useUpdate(getValue)`: get a function to force re-render component. `getValue` is a function to get the latest value to compare with the previous value. The latest `getValue` is always used (`useReducer` specs).
- `nextState = nextStateFromAction(action, state)`: get next state from `setState` action.
- `[state, toggle] = useToggle(init = false)`: `toggle()` to toggle boolean `state` state, or, `toggle(true/false)` to set state.
- `[state, enable] = useTurnOn()`: `enable()` to set state to `true`.
- `[state, disable] = useTurnOff()`: `disable()` to set state to `false`.
- `unmountedRef = useUnmountedRef()`: get a ref whose value is `true` when component is unmounted. Note, from react 18, the effect is sometimes unmounted and mounted again.
- `mountedRef = useMountedRef()`: get a ref whose value is `true` when component is mounted. Note: ref's value is not set to `false` when component is unmounted.
- `mounted = useMounted()`: get a boolean whose value is `true` when component is mounted. Note: the value is not set to `false` when component is unmounted.
- `prefRef = usePrevRef(value)`: get a ref whose value is the previous `value`.
- `useEffectOnce(() => {}, [...deps])`: similar to `useEffect`, but fires only once.
- `useLayoutEffectWithPrevDeps((prevDeps) => {}, [...deps])`: `useLayoutEffect` version of `useEffectWithPrevDeps`.
- `[state, setState, stateRef] = useEnhancedState(initialState)`: similar to `useState`, but also returns a ref whose value is always the latest `state`.
- `{value, setValue} = usePropState(initialState)`: similar to `useState`, but the returned value is an object, not an array.
- `scopeId = useScopeId(prefix?: string)`: get a function to generate scoped id. `prefix` is the prefix of the id. The id is generated by `scopeId(name?: string) = prefix + id + name`. `id` is a SSR-statically random number generated by `useId()`.
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

