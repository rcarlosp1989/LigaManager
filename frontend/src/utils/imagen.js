// Achica una imagen en el navegador antes de subirla: así una foto de 5 MB tomada con el
// celular llega al servidor como un archivo de pocos KB.
//  - lado: medida máxima del lado mayor, en píxeles (logo 256, foto 512).
//  - Se guarda como WEBP (o JPEG si el navegador no sabe crear WEBP). El logo conserva la
//    transparencia en WEBP.
// Si el navegador no puede leer la imagen, se devuelve el archivo original y el servidor
// decide si la acepta.

export const LADO_LOGO = 256
export const LADO_FOTO = 512

function cargar(archivo) {  // archivo: File o Blob
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolver(img) }
    img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('No se pudo leer la imagen.')) }
    img.src = url
  })
}

function aBlob(canvas, tipo, calidad) {
  return new Promise(resolver => canvas.toBlob(resolver, tipo, calidad))
}

export async function achicarImagen(archivo, lado) {
  if (!archivo || !archivo.type?.startsWith('image/')) return archivo
  let img
  try { img = await cargar(archivo) } catch { return archivo }

  const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight))
  const ancho = Math.max(1, Math.round(img.naturalWidth * escala))
  const alto = Math.max(1, Math.round(img.naturalHeight * escala))
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) return archivo
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, ancho, alto)

  let blob = await aBlob(canvas, 'image/webp', 0.85)
  let ext = 'webp'
  if (!blob || blob.type !== 'image/webp') {
    // Sin WEBP (Safari antiguo): JPEG sobre fondo blanco, porque JPEG no tiene transparencia.
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ancho, alto)
    blob = await aBlob(canvas, 'image/jpeg', 0.85)
    ext = 'jpg'
  }
  if (!blob) return archivo
  // Si la original ya era más liviana (p. ej. un PNG pequeño), se sube la original.
  if (escala === 1 && blob.size >= archivo.size) return archivo
  const nombre = (archivo.name || 'imagen').replace(/\.[^.]*$/, '') + '.' + ext
  return new File([blob], nombre, { type: blob.type })
}

// Descarga una imagen del servidor y la convierte a PNG/JPEG (data URL) para meterla en un PDF:
// jsPDF no lee WEBP en todos los navegadores. Devuelve { dataUrl, ancho, alto, formato } o null.
//  - lado: medida máxima en píxeles (para que el PDF no pese de más).
//  - cuadrado: recorta al centro en un cuadrado (fotos de jugadores).
export async function imagenParaPdf(url, { lado = 256, cuadrado = false } = {}) {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const img = await cargar(await r.blob())
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
    if (!sw || !sh) return null
    if (cuadrado) {
      const m = Math.min(sw, sh)
      sx = (sw - m) / 2; sy = (sh - m) / 2; sw = m; sh = m
    }
    const escala = Math.min(1, lado / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sw * escala))
    canvas.height = Math.max(1, Math.round(sh * escala))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    if (cuadrado) {   // la foto va en JPEG (más liviano); sin transparencia, fondo blanco
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const formato = cuadrado ? 'JPEG' : 'PNG'
    return { dataUrl: canvas.toDataURL(cuadrado ? 'image/jpeg' : 'image/png', 0.85), ancho: canvas.width, alto: canvas.height, formato }
  } catch {
    return null
  }
}
