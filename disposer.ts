export type Disposer = ReturnType<typeof makeDisposer>
export function makeDisposer() {
	const disposeFns: (() => void)[] = []
	const abortController = new AbortController()
	return {
		addDispose(this: void, dispose?: () => void) {
			if (!dispose) return
			if (abortController.signal.aborted) dispose()
			else disposeFns.push(dispose)
		},
		dispose(this: void) {
			if (abortController.signal.aborted) return
			abortController.abort()
			for (let i = disposeFns.length - 1; i >= 0; i--) disposeFns[i]()
		},
		signal: abortController.signal,
	}
}

