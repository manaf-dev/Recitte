import { ref } from 'vue'

/** A one-off confirmation carried across a navigation (e.g. "Program saved"). */
const message = ref('')

export function setFlash(text: string) {
  message.value = text
}

export function takeFlash(): string {
  const text = message.value
  message.value = ''
  return text
}
