/**
 * Chat media utilities
 * - compressImage : lossless-friendly image resize + JPEG re-encode via Canvas
 * - validateVideo : enforce ≤ 30 s duration before upload
 */

const MAX_IMAGE_DIM  = 1920   // px — longer side cap
const IMAGE_QUALITY  = 0.82   // JPEG quality (visually lossless at this level)
const VIDEO_MAX_SECS = 30     // hard limit

/** Compress an image File using Canvas.
 *  - If both dims ≤ MAX_IMAGE_DIM and the file is already JPEG, skips re-encode (returns original).
 *  - Otherwise scales proportionally then encodes as image/jpeg.
 *  Returns a File with the same name (ext normalised to .jpg for re-encoded outputs). */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img

      // Skip if small enough and already JPEG
      if (w <= MAX_IMAGE_DIM && h <= MAX_IMAGE_DIM && file.type === 'image/jpeg') {
        return resolve(file)
      }

      // Scale down proportionally
      const scale  = Math.min(1, MAX_IMAGE_DIM / Math.max(w, h))
      const tw     = Math.round(w * scale)
      const th     = Math.round(h * scale)

      const canvas      = document.createElement('canvas')
      canvas.width      = tw
      canvas.height     = th
      const ctx         = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, tw, th)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'))
          const baseName = file.name.replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        IMAGE_QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/** Validate a video File.
 *  Resolves with { ok: true } if duration ≤ VIDEO_MAX_SECS.
 *  Resolves with { ok: false, reason: string } otherwise. */
export function validateVideo(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.src = ''
    }

    video.onloadedmetadata = () => {
      const dur = video.duration
      cleanup()
      if (!isFinite(dur)) {
        // Cannot determine duration — allow upload (server will validate if needed)
        return resolve({ ok: true })
      }
      if (dur > VIDEO_MAX_SECS) {
        return resolve({
          ok: false,
          reason: `Video is ${Math.round(dur)}s long. Maximum allowed is ${VIDEO_MAX_SECS}s.`,
        })
      }
      resolve({ ok: true })
    }

    video.onerror = () => {
      cleanup()
      // Cannot parse — let it through; server will reject if truly invalid
      resolve({ ok: true })
    }

    video.src = url
  })
}
