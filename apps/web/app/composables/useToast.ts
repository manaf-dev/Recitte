let timer: ReturnType<typeof setTimeout> | undefined

/** A single short on-screen note, like the prototype's toast. */
export function useToast() {
  const message = useState<string>('toast', () => '')
  function show(text: string) {
    message.value = text
    clearTimeout(timer)
    timer = setTimeout(() => (message.value = ''), 3200)
  }
  return { message, show }
}
