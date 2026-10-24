import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

const bundledUploadImages = new Set([
  '1792854025951-whatsapp-image-2026-10-24-at-17-50-41--1--jpeg.jpg',
  '1792854037925-whatsapp-image-2026-10-24-at-17-50-41--1--jpeg.jpg',
  '1792855506141-whatsapp-image-2026-10-24-at-17-50-41--1--jpeg.jpg',
  '1792864191869-whatsapp-image-2026-10-24-at-17-50-41-jpeg.jpg',
])

export function getImageUrl(image) {
  const imagePath = image.split(/[?#]/, 1)[0]
  const filename = imagePath.slice(imagePath.lastIndexOf('/') + 1)

  if (imagePath.includes('/api/uploads/') && bundledUploadImages.has(filename)) {
    return `/images/${filename}`
  }

  if (image.startsWith('/api/uploads/') && API_BASE_URL) {
    return new URL(image, `${API_BASE_URL}/`).toString()
  }

  return image
}

export default api
