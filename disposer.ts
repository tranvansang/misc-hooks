export type Disposer = ReturnType<typeof makeDisposer>
export function makeDisposer() {
	const disposeFns: (() => void)[] = []
	const abortController = new AbortController()
	return {
		addDispose(this: void, dispose?: void | (() => void)) {
			if (!dispose) return
			if (abortController.signal.aborted) dispose()
			else disposeFns.push(dispose)
		},
		dispose(this: void) {
			if (abortController.signal.aborted) return
			abortController.abort()
			for (const dispose of disposeFns.slice().reverse()) dispose()
		},
		signal: abortController.signal,
	}
}

export function makeReset() {
	let disposer = makeDisposer()
	return () => {
		disposer.dispose()
		return (disposer = makeDisposer())
	}
}
