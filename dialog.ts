import {createElement, type ComponentType, type ReactNode, useEffect, useState} from 'react'
import {createPortal, flushSync} from 'react-dom'

export interface DialogOptions<Props> {
	nonModal?: boolean
	className?: string
	signal?: AbortSignal
	props?: Props
	disableEsc?: boolean
}

let _showDialog: <T, Props = object>(
	Dialog: ComponentType<Omit<Props, 'onClose'> & {onClose(result: T | ''): any}>,
	options?: DialogOptions<Props>,
) => Promise<T | ''>
const dialogReadyDefer = Promise.withResolvers<void>()

export async function showDialog<T, Props = object>(
	Dialog: ComponentType<Omit<Props, 'onClose'> & {onClose(result: T | ''): any}>,
	options?: DialogOptions<Props>,
) {
	if (options?.signal?.aborted) return
	await dialogReadyDefer.promise
	return await _showDialog<T, Props>(Dialog, options)
}

let cnt = 0
export function DialogProvider() {
	const [dialogs, setDialogs] = useState<
		{
			key: number
			node: ReactNode
			dom: HTMLDialogElement
		}[]
	>([])
	useEffect(() => {
		_showDialog = <T, Props = object>(
			Dialog: ComponentType<Omit<Props, 'onClose'> & {onClose(result: T | ''): any}>,
			{disableEsc, signal, className = '', nonModal, props = {} as Props}: DialogOptions<Props> = {},
		) => {
			if (signal?.aborted) return Promise.resolve('')

			const dialog = document.createElement('dialog')
			dialog.className = className
			dialog.addEventListener('close', () => handleClose(dialog.returnValue as T))
			// chrome bug cause the dialog always closes if ecs is pressed twice
			// https://issues.chromium.org/issues/41491338
			if (disableEsc) dialog.addEventListener('cancel', evt => evt.preventDefault())

			const defer = Promise.withResolvers<T | ''>()

			const dialogObj = {
				node: createElement(Dialog, {
					...props,
					onClose(result) {
						handleClose(result)
						dialog.close()
					},
				}),
				key: ++cnt,
				dom: dialog,
			}
			let closed = false

			signal?.addEventListener('abort', abort)

			document.body.appendChild(dialog)

			flushSync(() => setDialogs(dialogs => [...dialogs, dialogObj]))
			if (!closed)
				if (nonModal) dialog.show()
				else dialog.showModal()

			return defer.promise

			function handleClose(result: T | '') {
				if (closed) return
				closed = true
				signal?.removeEventListener('abort', abort)
				defer.resolve(result)
				setTimeout(() => {
					setDialogs(dialogs => dialogs.filter(m => m !== dialogObj))
					document.body.removeChild(dialog)
				}, 1000)
			}

			function abort() {
				// flushSync() might trigger 'abort' event before dialog.show() is called
				// in this case, dialog's 'close' event will NOT be triggered since it's not shown yet
				if (dialog.open) dialog.close()
				else handleClose('')
			}
		}
		dialogReadyDefer.resolve()
	}, [])

	return dialogs.map(({node, key, dom}) => createPortal(node, dom, key))
}
