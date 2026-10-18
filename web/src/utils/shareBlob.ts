import { Capacitor } from '@capacitor/core'

export type ShareBlobResult = 'shared' | 'saved' | 'downloaded' | 'cancelled' | 'failed'

export async function shareBlob(
  blob: Blob,
  fileName: string,
  _mime: string,
): Promise<ShareBlobResult> {
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_')
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const buf = await blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)

      let uri = ''
      const attempts: { dir: (typeof Directory)[keyof typeof Directory]; path: string }[] = [
        { dir: Directory.Cache, path: `exports/${safeName}` },
        { dir: Directory.Data, path: `exports/${safeName}` },
        { dir: Directory.Documents, path: `报销神器/${safeName}` },
      ]
      for (const a of attempts) {
        try {
          const wr = await Filesystem.writeFile({
            path: a.path,
            data: base64,
            directory: a.dir,
            recursive: true,
          })
          uri = wr.uri
          break
        } catch (e) {
          console.warn('shareBlob writeFile', a, e)
        }
      }
      if (!uri) return 'failed'

      try {
        await Share.share({
          title: fileName,
          text: fileName,
          url: uri,
          dialogTitle: '分享文件',
        })
        return 'shared'
      } catch {
        return 'saved'
      }
    } catch (e) {
      console.error('shareBlob native failed', e)
      return 'failed'
    }
  }
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
