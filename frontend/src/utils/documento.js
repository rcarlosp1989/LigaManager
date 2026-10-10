// Documento de identidad de jugadores y árbitros. Las mismas reglas que el servidor
// (backend/.../Common/Identificacion.cs), para avisar antes de enviar.

export const TIPOS_DOCUMENTO = [
  { valor: 'Cedula',     texto: 'Cédula ecuatoriana', corto: 'Cédula',     ayuda: '10 números',                          ejemplo: '0912345675' },
  { valor: 'Extranjero', texto: 'Documento extranjero', corto: 'Doc. extranjero', ayuda: 'Solo números, de 5 a 15',     ejemplo: '1023456789' },
  { valor: 'Pasaporte',  texto: 'Pasaporte',          corto: 'Pasaporte',  ayuda: 'Letras y números, de 5 a 20',         ejemplo: 'AB1234567' },
]

export const tipoDocumento = (valor) => TIPOS_DOCUMENTO.find(t => t.valor === valor) ?? TIPOS_DOCUMENTO[0]

// Lo que se deja escribir en el campo: números para cédula y extranjero; letras y números
// (en mayúsculas) para pasaporte.
export function limpiarDocumento(tipo, texto) {
  const t = (texto ?? '').toUpperCase()
  if (tipo === 'Pasaporte') return t.replace(/[^A-Z0-9]/g, '').slice(0, 20)
  return t.replace(/\D/g, '').slice(0, tipo === 'Cedula' ? 10 : 15)
}

export function cedulaEcuatorianaValida(c) {
  if (!/^\d{10}$/.test(c)) return false
  const provincia = Number(c.slice(0, 2))
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false
  if (Number(c[2]) >= 6) return false
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let v = Number(c[i]) * (i % 2 === 0 ? 2 : 1)
    if (v > 9) v -= 9
    suma += v
  }
  return (10 - (suma % 10)) % 10 === Number(c[9])
}

// Mensaje de error, o null si el número es válido.
export function errorDocumento(tipo, numero) {
  const n = (numero ?? '').trim()
  if (!n) return 'Escribe el número de documento.'
  if (tipo === 'Cedula') {
    if (!/^\d{10}$/.test(n)) return 'La cédula debe tener exactamente 10 números.'
    if (!cedulaEcuatorianaValida(n)) return 'La cédula no es válida: revisa los números.'
    return null
  }
  if (tipo === 'Extranjero') return /^\d{5,15}$/.test(n) ? null : 'El documento extranjero debe tener solo números, entre 5 y 15.'
  return /^[A-Z0-9]{5,20}$/i.test(n) ? null : 'El pasaporte debe tener entre 5 y 20 letras o números.'
}

// «0912345675» o «Pasaporte AB1234567», para tablas y reportes.
export const textoDocumento = (tipo, numero) => (!tipo || tipo === 'Cedula' ? numero : `${tipoDocumento(tipo).corto} ${numero}`)

// Para bloquear el guardado si el documento no es válido.
export const documentoValido = (tipo, numero, opcional = false) => (opcional && !numero) || !errorDocumento(tipo, numero)
