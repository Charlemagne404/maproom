import { useLayoutEffect, useRef, type RefCallback } from 'react'

type Direction = -1 | 1

export function useReorderFocus(order: readonly string[]) {
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const refCallbacks = useRef(new Map<string, RefCallback<HTMLButtonElement>>())
  const pendingMove = useRef<{ id: string; direction: Direction } | null>(null)

  function buttonRef(id: string, direction: Direction): RefCallback<HTMLButtonElement> {
    const key = `${id}:${direction}`
    const existing = refCallbacks.current.get(key)
    if (existing) return existing

    const callback: RefCallback<HTMLButtonElement> = (element) => {
      if (element) buttonRefs.current.set(key, element)
      else buttonRefs.current.delete(key)
    }
    refCallbacks.current.set(key, callback)
    return callback
  }

  function rememberMove(id: string, direction: Direction) {
    pendingMove.current = { id, direction }
  }

  useLayoutEffect(() => {
    const move = pendingMove.current
    if (!move) return
    pendingMove.current = null

    const index = order.indexOf(move.id)
    if (index < 0) return
    const sameDirectionAvailable = move.direction === -1 ? index > 0 : index < order.length - 1
    const direction = sameDirectionAvailable ? move.direction : move.direction === -1 ? 1 : -1
    buttonRefs.current.get(`${move.id}:${direction}`)?.focus()
  }, [order])

  return { buttonRef, rememberMove }
}
