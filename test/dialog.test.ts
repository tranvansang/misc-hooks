import {describe, expect, test, vi, beforeEach, afterEach} from 'vitest'
import {render, act, waitFor} from '@testing-library/react'
import {createElement} from 'react'
import {DialogProvider, showDialog} from '../dialog'

// Mock HTMLDialogElement methods since JSDOM doesn't support them
function setupDialogMock(dialog: HTMLDialogElement) {
	let isOpen = false
	let returnVal = ''

	Object.defineProperty(dialog, 'open', {
		get: () => isOpen,
		configurable: true
	})

	Object.defineProperty(dialog, 'returnValue', {
		get: () => returnVal,
		set: (val: string) => { returnVal = val },
		configurable: true
	})

	dialog.showModal = function() {
		isOpen = true
	}

	dialog.show = function() {
		isOpen = true
	}

	dialog.close = function(value?: string) {
		if (value !== undefined) returnVal = value
		isOpen = false
		const closeEvent = new Event('close')
		this.dispatchEvent(closeEvent)
	}
}

// Intercept dialog creation
const originalCreateElement = document.createElement.bind(document)
document.createElement = function(tagName: string, options?: any) {
	const element = originalCreateElement(tagName, options)
	if (tagName.toLowerCase() === 'dialog') {
		setupDialogMock(element as HTMLDialogElement)
	}
	return element
}

describe('dialog', () => {
	beforeEach(() => {
		// Clean up any existing dialogs in the DOM
		document.querySelectorAll('dialog').forEach(d => d.remove())
	})

	afterEach(() => {
		// Clean up after each test - catch errors if dialog already removed
		document.querySelectorAll('dialog').forEach(d => {
			try {
				d.remove()
			} catch (e) {
				// Dialog might have been already removed by the 1000ms timeout
			}
		})
	})

	test('DialogProvider renders without error', () => {
		const {container} = render(createElement(DialogProvider))
		expect(container).toBeTruthy()
	})

	test('showDialog waits for DialogProvider to mount', async () => {
		// showDialog should wait for DialogProvider
		let resolved = false
		const promise = showDialog(() => createElement('div', null, 'Test Dialog')).then((result) => {
			resolved = true
			return result
		})

		// Should not resolve immediately
		await new Promise(resolve => setTimeout(resolve, 10))
		expect(resolved).toBe(false)

		// Mount DialogProvider
		render(createElement(DialogProvider))

		// Wait for dialog to be ready
		await new Promise(resolve => setTimeout(resolve, 10))

		// Dialog should now exist
		expect(document.querySelector('dialog')).toBeTruthy()

		// Close the dialog
		const dialog = document.querySelector('dialog')!
		act(() => dialog.close())

		await promise
		expect(resolved).toBe(true)
	})

	test('basic dialog showing and closing', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const onClose = vi.fn()
		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', {
				onClick: () => onClose(''),
				'data-testid': 'dialog-content'
			}, 'Click to close')

		const resultPromise = showDialog(Dialog)

		// Dialog should be rendered
		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		expect(dialog.open).toBe(true)

		// Close the dialog
		act(() => dialog.close())

		const result = await resultPromise
		expect(result).toBe('') // Dialog closes with empty string by default
	})

	test('dialog with custom props', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		interface DialogProps {
			title: string
			count: number
		}

		const Dialog = ({title, count, onClose}: DialogProps & {onClose: (result: '') => void}) =>
			createElement('div', null, `${title}: ${count}`)

		const resultPromise = showDialog<void, DialogProps>(Dialog, {
			props: {title: 'Test', count: 42}
		})

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		expect(dialog.textContent).toContain('Test: 42')

		act(() => dialog.close())
		await resultPromise
	})

	test('dialog with className', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog(Dialog, {
			className: 'custom-dialog-class'
		})

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		expect(dialog.className).toBe('custom-dialog-class')

		act(() => dialog.close())
		await resultPromise
	})

	test('closing with result value via onClose', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: string | '') => void}) =>
			createElement('button', {
				onClick: () => onClose('confirmed')
			}, 'Confirm')

		const resultPromise = showDialog<string>(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const button = document.querySelector('button')!
		act(() => button.click())

		const result = await resultPromise
		expect(result).toBe('confirmed')
	})

	test('closing with returnValue', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog<string>(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		act(() => {
			dialog.returnValue = 'return-value'
			dialog.close()
		})

		const result = await resultPromise
		expect(result).toBe('return-value')
	})

	test('modal dialog (default)', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: () => void}) =>
			createElement('div', null, 'Modal Dialog')

		const resultPromise = showDialog(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		// Modal dialogs should use showModal()
		expect(dialog.open).toBe(true)

		act(() => dialog.close())
		await resultPromise
	})

	test('non-modal dialog', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: () => void}) =>
			createElement('div', null, 'Non-Modal Dialog')

		const resultPromise = showDialog(Dialog, {nonModal: true})

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		expect(dialog.open).toBe(true)

		act(() => dialog.close())
		await resultPromise
	})

	test('AbortSignal - already aborted before show', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const controller = new AbortController()
		controller.abort()

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const result = await showDialog(Dialog, {signal: controller.signal})

		// Dialog should not be shown
		expect(document.querySelector('dialog')).toBeFalsy()
		expect(result).toBeUndefined()
	})

	test('AbortSignal - abort after show', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const controller = new AbortController()

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog(Dialog, {signal: controller.signal})

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		expect(dialog.open).toBe(true)

		// Abort the dialog
		act(() => controller.abort())

		const result = await resultPromise
		expect(result).toBe('') // Aborted dialog returns empty string
		expect(dialog.open).toBe(false)
	})

	test('ESC key closes modal dialog by default', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!

		// Simulate ESC key by dispatching cancel event and closing
		act(() => {
			const cancelEvent = new Event('cancel', {cancelable: true})
			dialog.dispatchEvent(cancelEvent)
			if (!cancelEvent.defaultPrevented) {
				dialog.close()
			}
		})

		const result = await resultPromise
		expect(result).toBe('') // ESC key closes with empty string
		expect(dialog.open).toBe(false)
	})

	test('ESC key disabled with disableEsc option', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog(Dialog, {disableEsc: true})

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!

		// Simulate ESC key
		act(() => {
			const cancelEvent = new Event('cancel', {cancelable: true})
			dialog.dispatchEvent(cancelEvent)
			// With disableEsc, preventDefault should be called
			if (!cancelEvent.defaultPrevented) {
				dialog.close()
			}
		})

		// Dialog should still be open
		expect(dialog.open).toBe(true)

		// Manually close it
		act(() => dialog.close())
		await resultPromise
	})

	test('multiple dialogs at once', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog1 = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', {'data-dialog': '1'}, 'Dialog 1')

		const Dialog2 = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', {'data-dialog': '2'}, 'Dialog 2')

		const Dialog3 = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', {'data-dialog': '3'}, 'Dialog 3')

		const promise1 = showDialog(Dialog1)
		const promise2 = showDialog(Dialog2)
		const promise3 = showDialog(Dialog3)

		await waitFor(() => {
			expect(document.querySelectorAll('dialog').length).toBe(3)
		})

		const dialogs = Array.from(document.querySelectorAll('dialog'))
		expect(dialogs).toHaveLength(3)

		// Close them in different order
		act(() => dialogs[1].close())
		await promise2

		act(() => dialogs[0].close())
		await promise1

		act(() => dialogs[2].close())
		await promise3
	})

	test('dialog cleanup after 1000ms timeout', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!

		// Use fake timers
		vi.useFakeTimers()

		act(() => dialog.close())

		await resultPromise

		// Dialog should still be in DOM initially
		expect(document.querySelector('dialog')).toBeTruthy()

		// After 1000ms, it should be removed
		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(document.querySelector('dialog')).toBeFalsy()

		vi.useRealTimers()
	})

	test('double close is handled gracefully', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!

		// Close twice - the second close should be a no-op
		act(() => {
			dialog.close()
		})

		const result = await resultPromise
		expect(result).toBe('') // First close returns empty string

		// Try closing again after already closed - this shouldn't cause issues
		dialog.close()
	})

	test('onClose can be called multiple times safely', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: string | '') => void}) =>
			createElement('button', {
				onClick: () => {
					onClose('first')
					onClose('second') // Should be ignored
				}
			}, 'Close')

		const resultPromise = showDialog<string>(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const button = document.querySelector('button')!
		act(() => button.click())

		const result = await resultPromise
		// Should only get the first close result
		expect(result).toBe('first')
	})

	test('abort signal removed after dialog closes', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const controller = new AbortController()
		const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener')

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		const resultPromise = showDialog(Dialog, {signal: controller.signal})

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const dialog = document.querySelector('dialog')!
		act(() => dialog.close())

		await resultPromise

		// removeEventListener should have been called
		expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function))
	})

	test('abort before dialog.show() is called', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const controller = new AbortController()

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		// This tests the edge case mentioned in the code comment:
		// flushSync() might trigger 'abort' event before dialog.show() is called
		const resultPromise = showDialog(Dialog, {signal: controller.signal})

		// Abort immediately (simulating abort during flushSync)
		// Need to wait a microtask for the dialog to be created first
		await Promise.resolve()

		controller.abort()

		await waitFor(() => {
			const dialog = document.querySelector('dialog')
			expect(dialog).toBeTruthy()
		})

		const result = await resultPromise
		// Result should be empty string when aborted
		expect(result).toBe('')
	})

	test('dialog with complex result type', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		interface FormResult {
			name: string
			age: number
			confirmed: boolean
		}

		const Dialog = ({onClose}: {onClose: (result: FormResult | '') => void}) =>
			createElement('button', {
				onClick: () => onClose({name: 'John', age: 30, confirmed: true})
			}, 'Submit')

		const resultPromise = showDialog<FormResult>(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const button = document.querySelector('button')!
		act(() => button.click())

		const result = await resultPromise
		expect(result).toEqual({name: 'John', age: 30, confirmed: true})
	})

	test('dialog without DialogProvider throws or hangs', async () => {
		// Don't render DialogProvider

		const Dialog = ({onClose}: {onClose: (result: '') => void}) =>
			createElement('div', null, 'Dialog')

		// This should hang waiting for DialogProvider
		const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 100))
		const showPromise = showDialog(Dialog).then(() => 'shown')

		const result = await Promise.race([timeoutPromise, showPromise])
		expect(result).toBe('timeout')
	})

	test('empty string result', async () => {
		render(createElement(DialogProvider))
		await new Promise(resolve => setTimeout(resolve, 10))

		const Dialog = ({onClose}: {onClose: (result: string | '') => void}) =>
			createElement('button', {
				onClick: () => onClose('')
			}, 'Close with empty string')

		const resultPromise = showDialog<string>(Dialog)

		await waitFor(() => {
			expect(document.querySelector('dialog')).toBeTruthy()
		})

		const button = document.querySelector('button')!
		act(() => button.click())

		const result = await resultPromise
		expect(result).toBe('')
	})
})
