/** 附件预览 URL 缓存 */
import { ref } from 'vue'

const urlCache = new Map<number, string>()

export function attachmentUrl(blob: Blob, key: number): string {
  const hit = urlCache.get(key)
  if (hit) return hit
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export function releaseAttachmentUrl(key: number) {
  const u = urlCache.get(key)
  if (u) {
    URL.revokeObjectURL(u)
    urlCache.delete(key)
  }
}

export const thumbLoading = ref<Record<number, string>>({})

export async function loadThumb(
  getAttachment: (id: number) => Promise<{ blob: Blob; kind: string } | undefined>,
  blobId: number,
): Promise<string | null> {
  if (thumbLoading.value[blobId]) return thumbLoading.value[blobId]
  try {
    const row = await getAttachment(blobId)
    if (!row?.blob) return null
    if (row.kind === 'pdf' || row.blob.type === 'application/pdf') return null
    const url = attachmentUrl(row.blob, blobId)
    thumbLoading.value = { ...thumbLoading.value, [blobId]: url }
    return url
  } catch {
    return null
  }
}
