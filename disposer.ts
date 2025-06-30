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

