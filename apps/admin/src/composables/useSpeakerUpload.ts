import { ref } from 'vue'
import { supabase, SPEAKER_PHOTO_BUCKET } from '@/lib/supabase'
import { dbErrorMessage } from '@/lib/errors'

export const SPEAKER_PHOTO_SIZE = 320

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image.'))
    }
    img.src = url
  })
}

/** Centre-crops an image to a square and scales it to a 320×320 JPEG, like the prototype. */
export async function cropToSquareJpeg(file: Blob, size = SPEAKER_PHOTO_SIZE, quality = 0.85): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot resize images.')
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  // JPEG has no transparency: give transparent PNGs a white background, not black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be converted.'))), 'image/jpeg', quality)
  })
}

/** `<program id or 'new'>/<timestamp>.jpg`, unique so the public URL can be cached. */
export function speakerPhotoPath(programId: string | null | undefined, now = Date.now()): string {
  return `${programId || 'new'}/${now}.jpg`
}

/** The object path inside the bucket for one of our public URLs, or null for anything else. */
export function speakerPhotoObjectPath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${SPEAKER_PHOTO_BUCKET}/`
  const at = url.indexOf(marker)
  if (at === -1) return null
  return decodeURIComponent(url.slice(at + marker.length).split('?')[0] ?? '') || null
}

/** Crops, uploads and returns the public URL of a speaker photo. Throws a readable Error. */
export async function uploadSpeakerPhoto(file: File, programId?: string | null): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPEG, PNG or WebP).')
  const blob = await cropToSquareJpeg(file)
  const path = speakerPhotoPath(programId)
  const bucket = supabase.storage.from(SPEAKER_PHOTO_BUCKET)
  const { error } = await bucket.upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(`The photo could not be uploaded. ${dbErrorMessage(error)}`)
  return bucket.getPublicUrl(path).data.publicUrl
}

/** Best effort: an orphaned photo is harmless, so failures are only logged. */
export async function removeSpeakerPhoto(url: string | null | undefined): Promise<void> {
  const path = speakerPhotoObjectPath(url)
  if (!path) return
  try {
    const { error } = await supabase.storage.from(SPEAKER_PHOTO_BUCKET).remove([path])
    if (error) console.warn('Could not remove old speaker photo', path, error.message)
  } catch (e) {
    console.warn('Could not remove old speaker photo', path, e)
  }
}

export function useSpeakerUpload() {
  const uploading = ref(false)
  const error = ref('')

  async function upload(file: File, programId?: string | null): Promise<string | null> {
    uploading.value = true
    error.value = ''
    try {
      return await uploadSpeakerPhoto(file, programId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'The photo could not be uploaded.'
      return null
    } finally {
      uploading.value = false
    }
  }

  return { uploading, error, upload }
}
