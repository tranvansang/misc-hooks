# misc-hooks

[![npm version](https://badge.fury.io/js/misc-hooks.svg)](https://www.npmjs.com/package/misc-hooks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A collection of essential React hooks for state management, async operations, and common UI patterns.

## Installation

```bash
npm i misc-hooks
```

## Features

- **State Management**: Simple atomic state with `makeAtom()` and `useAtom()`
- **Resource Management**: Resource management with `makeDisposer()`.
- **Async Data Loading**: Enhanced async handling with `useLoad()`. Server-side rendering compatibility with `getInitial` pattern.
- **Utility Hooks**: Common patterns like `useDebounce()`, `useDeepMemo()`, `useKeep()`, and more
- **TypeScript**: Full TypeScript support with exported types
- **Zero Config**: No providers or wrappers needed

## 1. State Management: `makeAtom()` and `useAtom()`

Simple reactive state management without providers.

### Sample Usage

```typescript
// create atom
const atom = makeAtom<T>()
const atomWithInitial = makeAtom<T>(initialValue) // with initial value

// use atom in React component
const value = useAtom(atom)

// getter and setter
atom.value = newValue // set value synchronously
const currentValue = atom.value // get value synchronously

// subscribe for changes
const unsub = atom.sub((newVal, oldVal) => console.log(newVal, oldVal))
const unsub2 = atom.sub(() => console.log(atom.value))

// subscribe with cleanup
const unsub3 = atom.sub((newVal) => {
  const handler = () => console.log('cleanup')
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
})

// subscribe and run immediately
const unsub4 = atom.sub((newVal, oldVal) => console.log(newVal, oldVal), {now: true})

// subscribe with conditional updates
const unsub5 = atom.sub(
  (newVal, oldVal) => console.log(newVal),
  {skip(newVal, oldVal) {return newVal === oldVal}} // skip if values are the same
)

unsub() // unsubscribe
```

### API

- `makeAtom(initialValue?: T)`: create an atom with an initial value.
- `useAtom(atom: Atom<T>): T`: use an atom in a React component.
- `atom.value`: get or set the value synchronously.
- `atom.sub(subscriber, options?)`: subscribe to value changes. The subscriber receives `(newValue, oldValue)` and can return a cleanup function.
  - `options.now`: if `true`, the subscriber is called immediately with the current value as newValue and `undefined` as oldValue
  - `options.skip`: a function that receives `(newValue, oldValue)` and returns `true` to skip the subscriber call

## 2. Resource Management: `makeDisposer()`

### API

`makeDisposer(): Disposer`: returns an `Disposer` object.

`Disposer` object has the following properties:
- `dispose()`: dispose the resources by: aborting the signal, calling all disposer functions added by `addDispose()`.
- `signal`: an `AbortSignal` object that is aborted when `Disposer.dispose()` method is called.
- `addDispose(fn?: () => void)`:
  - if `fn` is falsy, do nothing.
  - Otherwise, if `Disposer.dispose()` is called before, synchronously call `fn`.
  - Otherwise, add `fn` to the list of functions to be called when `Disposer.dispose()` is called.

## 3. Async Function Handling and Loading: `useLoad()`

Powerful async data loading with error handling, loading states, and SSR support.

### Sample Usage

```typescript
// Basic usage
const {data, error, loading, load} = useLoad()
useEffect(() => void load(async ({signal}) => await fetchData(signal))(), [load])

// With parameters
const {data, error, loading, load} = useLoad()
useEffect(() => void load(async ({signal}) => await fetchData(params, {signal}))(), [load, params])

if (error) throw error // propagate error to ErrorBoundary
```

### API

`useLoad<T>(getInitial?: () => T): LoadState`: returns a `LoadState` object.

- (optional) `getInitial?: () => T | undefined`: a function that optionally and synchronously returns initial data.

	`getInitial` if provided, is called in the server render, and in the first client render.
	If it throws an error, the error is caught, without propagating to the ErrorBoundary, and set to `error` in `LoadState`.

The returned `LoadState` object has the following properties:
- `data`: the latest data, or `undefined` if data is loading or error.
- `error`: the error, or `undefined` if data is loading or no error.
- `loading`: a boolean that is `true` when the data is loading.
- `loadingRef`: (advanced usage) a ref whose value is the promise of the latest ongoing `load(fn)()`.
- `load`: the `load()` function has 2 interfaces to support both async and synchronous functions.
	- `load(fn: (disposer: PartialDisposer, ...params: Params) => T): (...params: Params) => T`
	- `load(fn: (disposer: PartialDisposer, ...params: Params) => Promise<T>): (...params: Params) => Promise<T>`
  
#### `load()` function

`load` takes a function `fn` and returns a wrapper function.
`load` never changes and can be safely placed in the second argument of `useEffect`.
The returned wrapper function, when be called, will call `fn` and handle the `LoadState` object.

`fn` receives a `PartialDisposer` object and returns a value or a promise resolving the value, which will be placed in `data` key of the `LoadState` object, or, `error` key if an error occurs.
While the execution of `fn` is in progress, `loading` is `true`, and both `data` and `error` are `undefined`.
When `fn` is finished, `loading` is `false`.

Besides the `PartialDisposer` object, `fn` also receives the parameters passed to the function returned by `load()`.`

`PartialDisposer` object has the following properties:
- `signal`: an `AbortSignal` object that is aborted when the component is unmounted or another `load()()` is called.
- `addDispose(fn?: () => void)`: add a function to be called when the component is unmounted or the next `load()()` is called.
Similar to `makeDisposer()` API, if the component is unmounted or the next `load()()` is called before, `fn` is immediately and synchronously called.

#### `loadingRef` value

`loadingRef` is a ref whose value is the promise of the latest ongoing `load(fn)()` call.
This is for advanced usage.
Typically, you will not need it.

`loadingRef` is a ref, its value never changes and can be safely placed in the second argument of `useEffect`.

`loadingRef`'s value is set before the first `await` in `fn` and reset to `undefined` after the promise returned by `fn` is resolved.

As a result 1, if `fn` is synchronous, `loadingRef` will be `undefined` all the time.

As a result 2, if in `fn` body, you use `loadingRef.current` after any `await`, the value will be the promise of the current `fn()` call.
If you `await` that promise, the promise will never resolve.

### Practical Usage

#### Practical case 1:
When `load(fn)()` is called, `error` and `data` are set to `undefined` before `fn` is called.
If the last data needs to be kept while reloading, for example, when changing a page number, you want to show the current data until the next page is loaded,
use `useKeep` hook.

#### Practical case 2:
If you want to delay showing the loading indicator, use `useTimedOut` hook.

#### Practical case 3:
If params is an object, and you want to reload the data when the object changes, use `useDeepMemo` hook.

Sample usage for practical case 1, 2, 3:

```tsx
const memoParams = useDeepMemo(params)
const {data, error, loading, load} = useLoad()
useEffect(() => void load(({signal}) => fetchData(memoParams, {signal}))(), [memoParams, load]) // load data when params deeply changes
const timedOut = useTimedOut(500)
const dataKeep = useKeep(data)
if (error) throw error // propagate error to ErrorBoundary
return dataKeep // has data
  ? <Data data={dataKeep}/>
  : timedOut // loading
    ? <Loading/>
    : null // show empty when loading is too fast
```

#### Practical case 4:
Handle async operations in effects with proper cleanup.

Sample usage:

```typescript
const {load} = useLoad()
useEffect(() => {
	void load(
		async ({signal, addDispose}) => {
			const loader = makeLoader()

			signal.addEventListener('abort', () => loader.abort())
			const value = await loader.loadData(params)
			addDispose(() => loader.dispose())

			if (signal.aborted) return

			window.addEventListener('resize', value.update)
			addDispose(() => window.removeEventListener('resize', value.update))
		})()
}, [load, params])
```

#### Practical case 5: Atomic actions.

Prevent concurrent executions of async operations and show a loading indicator.

Sample usage:

```tsx
const {loading, load} = useLoad()
return <>
  <button onClick={load(onSave)} disabled={loading}>Save</button>
  <button onClick={load(onDelete)} disabled={loading}>Delete</button>
</>
```

#### Practical case 6: Use the last call if it is still in progress.

We want to achieve the following behavior:
- First `loadData()` is called, and in progress.
- Second `loadData()` is called, detect that the last call is still in progress, and use the last call.
- Third `loadData()` is called, detect that the last call is still in progress, and use the last call.
- First `loadData()` call finishes, assign the result to `data`.

Sample usage:

```tsx
const {data, error, loading, load, loadingRef} = useLoad()
useEffect(() => void load(() => {
	// must use loadingRef.current before any await
	if (loadingRef.current) return loadingRef.current
	// do not use {signal} here, because it will be aborted when the next load()() is called
	return fetchData()
})(), [load, loadingRef]) // load and loadingRef never change
```

Or shorter version:
```tsx
const {data, error, loading, load, loadingRef} = useLoad()
useEffect(() => void load(() => loadingRef.current ?? fetchData())(), [load, loadingRef])
```

### SSR Guide:

`useLoad()` can be used in SSR by providing `getInitial` function.

`getInitial` is called in only in the server render, and in the first client render.

- In server side, in `getInitial`: check data availability via a store defined within the request scope.
  - If data is available, return the data synchronously.
  - If data is not available:
    - Return `undefined` synchronously
    - Trigger data loading, store loaded data in the store. Retain the promise of this action for later use.
    - Mark the render not ready and prevent it from starting the response.
    - Wait for all data loaded by awaiting the retained promises.
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
const {data, load} = useLoad(() => getSSRData(deepParams))
const dataRef = useRef(data)
useEffect(() => void (!dataRef.current && load(({signal}) => fetchData({signal}))()) , [load]) // load never changes and is safe to place in the second argument
// if initial data is not available, load data
```

Re-load when params changes, client-rendering version without SSR support:
```javascript
const deepParams = useDeepMemo(params)
const {data, load} = useLoad(() => getSSRData(deepParams))
useEffect(() => void(load(({signal}) => fetchData(deepParams, {signal}))), [deepParams, load])
// load data when params deeply changes AND in the first render
```

Combine the two above samples to support SSR, only load if data is empty and re-load when params changes: use `useEffectWithPrevDeps()`:
```javascript
const deepParams = useDeepMemo(params)
const {data, load} = useLoad(() => getSSRData(deepParams))
const dataRef = useRef(data)
useEffectWithPrevDeps(
  ([prevReload, prevParams]) => void ((prevReload || !dataRef.current) && load(({signal}) => fetchData(deepParams, {signal}))),
	// prevReload is only falsy in the first render.
	// in the first render, if initial data is empty, load.
	// from the second render, if this effect is called, i.e., if params deeply changed, load.
  [load, deepParams]
)
```

## 5. Utility Hooks

### Frequently Used
- `useEffectWithPrevDeps((prevDeps) => {}, [...deps])`: similar to `useEffect`, but provides previous deps to the effect function.
- `memoValue = useDeepMemo(value)`: get a memoized value. `value` is compared by `deep-equal` package.
- `lastDefinedValue = useKeep(value)`: keep the last defined value. When `value` is `undefined`, the last non-`undefined` value is returned.
- `ref = useRefValue(value)`: similar to [`useEffectEvent`](https://react.dev/learn/separating-events-from-effects), get a ref whose value is always the latest `value`.
- `timedOut = useTimedOut(timeout)`: get a boolean whose value is `true` after `timeout` ms.
- `state = useDebounce(value, timeout)`: get a debounced value. `state` is updated after at least `timeout` ms.
- `[state, setState, stateRef] = useRefState(initialState)`: similar to `useState`. `stateRef`'s value is set immediately and synchronously after `setState` is called. Note: `initialState` can not be a function.
- `update = useForceUpdate()`: get a function to force re-render component.

### Additional Utilities
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
- `useLayoutEffectWithPrevDeps((prevDeps) => {}, [...deps])`: `useLayoutEffect` version of `useEffectWithPrevDeps`.
- Type `OptionalArray` (type).
- Type `Disposer` (type) - utility type for cleanup management.

## Requirements

- React 18.0 or higher (for `useSyncExternalStore` API usages)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Sang Tran](https://github.com/tranvansang)

