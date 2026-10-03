import type { MouseEvent } from 'react'

// Elements inside a table row that handle their own clicks. A click on (or inside) one of these must not also open the row.
// The three-dots menu is rendered in a portal, but React still bubbles its clicks up to the row, so its items are listed too.
const OWN_CLICK = 'button, a, input, select, textarea, label, [role="menu"], [role="menuitem"]'

// Makes a whole table row open something when clicked, without stealing clicks from buttons, links or the actions menu.
// Also ignores the end of a text selection (the user dragged to copy a name), so selecting text does not open the dialog.
export function rowClick(open: () => void) {
  return (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null
    if (target?.closest(OWN_CLICK)) return
    if (window.getSelection()?.toString()) return
    open()
  }
}
