# misc-hooks

[![npm version](https://badge.fury.io/js/misc-hooks.svg)](https://www.npmjs.com/package/misc-hooks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A collection of essential React hooks for state management, async operations, and common UI patterns.

## Features

- 🎯 **Simple & Powerful**: Atomic state management without providers
- 🔄 **Async Made Easy**: Advanced data loading with automatic cleanup
- 🧹 **Resource Management**: Built-in disposal and cleanup patterns
- ⚡ **Zero Config**: No providers or wrappers needed
- 🌐 **SSR Ready**: Server-side rendering support

## Installation

```bash
npm i misc-hooks
```

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

- `makeAtom<T>(initialValue?: T)`: Creates an atom with optional initial value
- `useAtom(atom: Atom<T>): T`: React hook to subscribe to atom changes
- `atom.value`: Get or set the value synchronously
- `atom.sub(subscriber, options?)`: Subscribe to value changes
  - Returns unsubscribe function
  - Subscriber receives `(newValue, oldValue)` and can return cleanup function
  - Options:
    - `now: boolean` - Call subscriber immediately with current value
    - `skip: (newVal, oldVal) => boolean` - Skip subscriber if returns true

## 2. Resource Management: `makeDisposer()`

Manage cleanup of resources with AbortSignal integration.

### Sample Usage

```typescript
const disposer = makeDisposer()

// Use with fetch API
fetch('/api/data', { signal: disposer.signal })

// Add cleanup functions
disposer.addDispose(() => console.log('Cleanup 1'))
disposer.addDispose(() => console.log('Cleanup 2'))

// Clean up everything (aborts signal and calls cleanup functions)
disposer.dispose() // Subsequent calls are no-op
```

### API

`makeDisposer()`: Creates a new Disposer instance
`Disposer` object has the following properties:
- `dispose()`: Abort signal and call all cleanup functions (no-op if already disposed)
- `signal`: AbortSignal that's aborted when disposed
- `addDispose(fn?)`: Add cleanup function
  - Ignores falsy values
  - Calls immediately if already disposed
  - Functions called in reverse order on dispose

`makeReset()`: Creates a resettable disposer pattern
- Returns a reset function that when called:
  - Disposes the current disposer
  - Creates and returns a new disposer instance
- Useful for managing resources that need periodic cleanup and recreation

## 3. Async Function Handling and Loading: `useLoad()`

Powerful async data loading with error handling, loading states, and SSR support.

### Sample Usage

```typescript
// Basic usage
const {data, error, loading, load} = useLoad()
useEffect(() => void load(async () => await fetchData())(), [load])

// With parameters
const {data, error, loading, load} = useLoad()
useEffect(() => void load(async () => await fetchData(params))(), [load, params])

if (error) throw error // propagate error to ErrorBoundary

// Abortable
const {data, error, loading, loadAbortable} = useLoad()
useEffect(() => void loadAbortable(async ({signal}) => await fetchData(signal))(), [loadAbortable])
```

### API

`useLoad<T, Params>(getInitial?: () => T): LoadState<T>`

- (optional) `getInitial?: () => T | undefined`: a function that optionally and synchronously returns initial data.

	`getInitial` if provided, is called in the server render, and in the first client render.
	If it throws an error, the error is caught, without propagating to the ErrorBoundary, and set to `error` in `LoadState`.

The returned `LoadState` object has the following properties:
- `data`: The latest data, or `undefined` if loading or error
- `error`: The error, or `undefined` if loading or no error
- `loading`: Boolean that is `true` when data is loading
- `loadingRef`: Ref containing the promise of ongoing async `loadAbortable()` call (undefined for sync calls)
- `loadAbortable(fn: (disposer, ...params) => T): (...params) => T`
- `load(fn: (...params) => T): (...params) => T`: it calls `loadAbortable()` internally, but keep signature of the input callback for convenience.
  
#### `loadAbortable()` function

`loadAbortable` takes a function `fn` and returns a wrapper function.
`loadAbortable` never changes and can be safely placed in the second argument of `useEffect`.
The returned wrapper function, when be called, will call `fn` and handle the `LoadState` object.
`loadAbortable` supports both synchronous and asynchronous functions.

`fn` receives a `PartialDisposer` object and returns a value or a promise resolving the value, which will be placed in `data` key of the `LoadState` object, or, `error` key if an error occurs.
While the execution of `fn` is in progress, `loading` is `true`, and both `data` and `error` are `undefined`.
When `fn` is finished, `loading` is `false`.

Besides the `PartialDisposer` object, `fn` also receives the parameters passed to the function returned by `loadAbortable()`.`

`PartialDisposer` object has the following properties:
- `signal`: an `AbortSignal` object that is aborted when the component is unmounted or another `loadAbortable()()` is called.
- `addDispose(fn?: void | (() => void))`: add a function to be called when the component is unmounted or the next `loadAbortable()()` is called.
Similar to `makeDisposer()` API, if the component is unmounted or the next `loadAbortable()()` is called before, `fn` is immediately and synchronously called.

#### `loadingRef` value

`loadingRef` is a ref whose value is the promise of the latest ongoing `loadAbortable(fn)()` call.
This is for advanced usage.
Typically, you will not need it.

`loadingRef` is a ref, its value never changes and can be safely placed in the second argument of `useEffect`.

`loadingRef`'s value is set before the first `await` in `fn` and reset to `undefined` after the promise returned by `fn` is resolved.

As a result 1, if `fn` is synchronous, `loadingRef` will be `undefined` all the time.

As a result 2, if in `fn` body, you use `loadingRef.current` after any `await`, the value will be the promise of the current `fn()` call.
If you `await` that promise, the promise will never resolve.

### Practical Usage

#### Practical case 1:
When `loadAbortable(fn)()` is called, `error` and `data` are set to `undefined` before `fn` is called.
If the last data needs to be kept while reloading, for example, when changing a page number, you want to show the current data until the next page is loaded,
use `useKeep` hook.

#### Practical case 2:
If you want to delay showing the loading indicator, use `useTimedOut` hook.

#### Practical case 3:
If params is an object, and you want to reload the data when the object changes, use `useDeepMemo` hook.

Sample usage for practical case 1, 2, 3:

```tsx
const memoParams = useDeepMemo(params)
const {data, error, loading, loadAbortable} = useLoad()
useEffect(() => void loadAbortable(({signal}) => fetchData(memoParams, {signal}))(), [memoParams, loadAbortable]) // load data when params deeply changes
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
const {loadAbortable} = useLoad()
useEffect(() => {
	void loadAbortable(
		async ({signal, addDispose}) => {
			const loader = makeLoader()

			signal.addEventListener('abort', () => loader.abort())
			const value = await loader.loadData(params)
			addDispose(() => loader.dispose())

			if (signal.aborted) return

			window.addEventListener('resize', value.update)
			addDispose(() => window.removeEventListener('resize', value.update))
		})()
}, [loadAbortable, params])
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
const {data, loadAbortable} = useLoad(() => getSSRData(deepParams))
const dataRef = useRef(data)
useEffect(() => void (!dataRef.current && loadAbortable(({signal}) => fetchData({signal}))()) , [loadAbortable]) // load never changes and is safe to place in the second argument
// if initial data is not available, load data
```

Re-load when params changes, client-rendering version without SSR support:
```javascript
const deepParams = useDeepMemo(params)
const {data, loadAbortable} = useLoad(() => getSSRData(deepParams))
useEffect(() => void(loadAbortable(({signal}) => fetchData(deepParams, {signal}))), [deepParams, loadAbortable])
// load data when params deeply changes AND in the first render
```

Combine the two above samples to support SSR, only load if data is empty and re-load when params changes: use `useEffectWithPrevDeps()`:
```javascript
const deepParams = useDeepMemo(params)
const {data, loadAbortable} = useLoad(() => getSSRData(deepParams))
const dataRef = useRef(data)
useEffectWithPrevDeps(
  ([prevReload, prevParams]) => void ((prevReload || !dataRef.current) && loadAbortable(({signal}) => fetchData(deepParams, {signal}))),
	// prevReload is only falsy in the first render.
	// in the first render, if initial data is empty, load.
	// from the second render, if this effect is called, i.e., if params deeply changed, load.
  [loadAbortable, deepParams]
)
```

## 4. Dialog Management: `showDialog()` and `DialogProvider`

Promise-based dialog management with React portals and AbortSignal support.

### Setup

Render `DialogProvider` once at your app root:

```tsx
import {DialogProvider} from 'misc-hooks'

function App() {
  return (
    <>
      <DialogProvider />
      <YourApp />
    </>
  )
}
```

### Sample Usage

```tsx
import {showDialog} from 'misc-hooks'

// Basic dialog with DaisyUI
const result = await showDialog(() => <form className="modal-box" method="dialog">
	<h3 className="text-lg font-bold">Confirm</h3>
	<p className="py-4">Are you sure?</p>
	<div className="modal-action">
		<div className="space-x-1">
			<button className="btn">Cancel</button>
			<button className="btn btn-neutral" value="yes">OK</button>
		</div>
	</div>
</form>, {className: 'modal'})
```

### API

`showDialog<T, Props>(Dialog, options?): Promise<T | ''>`

Shows a dialog and returns a promise that resolves when the dialog closes.

**Parameters:**
- `Dialog`: React component that receives:
  - All props from `options.props`
  - `onClose(result: T | '')`: Function to close dialog and resolve with result (must provide a value, use `''` for no result)
- `options?`: Optional configuration object:
  - `props?: Props` - Props to pass to the Dialog component
  - `nonModal?: boolean` - Show as non-modal dialog (default: false)
  - `className?: string` - CSS class name for the dialog element
  - `signal?: AbortSignal` - Abort signal to cancel the dialog
  - `disableEsc?: boolean` - Disable ESC key from closing the dialog (default: false)

**Returns:**
- Promise that resolves with:
  - The result passed to `onClose(result)`
  - Empty string `''` if dialog closed without a result (ESC key, backdrop click, or signal aborted)

**Notes:**
- Uses native `<dialog/>` HTML element, so standard dialog closing methods work:
  - ESC key (unless `disableEsc: true`)
  - `<form method="dialog">` with submit buttons (use `value` attribute to set the return value)
  - Backdrop click for modal dialogs
  - Calling `.close()` or `.close(returnValue)` directly on the dialog element
- Dialog elements are created in `document.body` and rendered via React portals
- Multiple dialogs can be shown simultaneously
- Dialogs are automatically cleaned up 1000ms after closing
- If `DialogProvider` is not mounted, `showDialog` will wait indefinitely

`DialogProvider`

Component that must be rendered once at the app root to enable dialog functionality.

## 5. Utility Hooks

### Frequently Used
- `useEffectWithPrevDeps((prevDeps) => {}, [...deps])` - Similar to `useEffect`, but provides previous deps to the effect function
- `memoValue = useDeepMemo(value)` - Get a memoized value. `value` is compared by `deep-equal` package
- `lastDefinedValue = useKeep(value)` - Keep the last defined value. When `value` is `undefined`, the last non-`undefined` value is returned
- `ref = useRefValue(value)` - Similar to [`useEffectEvent`](https://react.dev/learn/separating-events-from-effects), get a ref whose value is always the latest `value`
- `timedOut = useTimedOut(timeout)` - Get a boolean whose value is `true` after `timeout` ms
- `state = useDebounce(value, timeout)` - Get a debounced value. `state` is updated after at least `timeout` ms
- `[state, setState, stateRef] = useRefState(initialState)` - Similar to `useState`. `stateRef`'s value is set immediately and synchronously after `setState` is called. Note: `initialState` cannot be a function
- `update = useForceUpdate()` - Get a function to force re-render component

### Additional Utilities
- `[state, setState] = useDefaultState(defaultState)` - When `defaultState` changes, set `state` to `defaultState`
- `[state, update] = useUpdate(getValue)` - Get a function to force re-render component. `getValue` is a function to get the latest value to compare with the previous value. The latest `getValue` is always used (`useReducer` specs)
- `nextState = nextStateFromAction(action, state)` - Get next state from `setState` action
- `[state, toggle] = useToggle(init = false)` - `toggle()` to toggle boolean `state`, or `toggle(true/false)` to set state
- `[state, enable] = useTurnOn()` - `enable()` to set state to `true`
- `[state, disable] = useTurnOff()` - `disable()` to set state to `false`
- `unmountedRef = useUnmountedRef()` - Get a ref whose value is `true` when component is unmounted. Note: from React 18, the effect is sometimes unmounted and mounted again
- `mountedRef = useMountedRef()` - Get a ref whose value is `true` when component is mounted. Note: ref's value is not set to `false` when component is unmounted
- `mounted = useMounted()` - Get a boolean whose value is `true` when component is mounted. Note: the value is not set to `false` when component is unmounted
- `prevRef = usePrevRef(value)` - Get a ref whose value is the previous `value`
- `useLayoutEffectWithPrevDeps((prevDeps) => {}, [...deps])` - `useLayoutEffect` version of `useEffectWithPrevDeps`
- Type `OptionalArray` - Array with optional elements
- Type `Disposer` - Utility type for cleanup management

## Requirements

- React 18.0 or higher (for `useSyncExternalStore` API usage)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Sang Tran](https://github.com/tranvansang)


