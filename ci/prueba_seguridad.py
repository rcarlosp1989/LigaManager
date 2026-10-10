"""Prueba temporal: encabezados, fotos falsas y mensajes de error."""
import json, sys, urllib.request, urllib.error, uuid, base64

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def cedula_valida(n):
    b = f"09{n:07d}"; s = 0
    for i, ch in enumerate(b):
        v = int(ch) * (2 if i % 2 == 0 else 1); s += v - 9 if v > 9 else v
    return b + str((10 - s % 10) % 10)

def llamar(metodo, ruta, token=None, cuerpo=None, campos=None, archivo=None):
    h = {}
    if campos is not None:
        borde = uuid.uuid4().hex
        partes = b""
        for k, v in campos.items():
            partes += f"--{borde}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
        if archivo:
            nombre, contenido = archivo
            partes += f"--{borde}\r\nContent-Disposition: form-data; name=\"Foto\"; filename=\"{nombre}\"\r\nContent-Type: image/jpeg\r\n\r\n".encode() + contenido + b"\r\n"
        datos = partes + f"--{borde}--\r\n".encode(); h["Content-Type"] = f"multipart/form-data; boundary={borde}"
    else:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None; h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers=h)
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, r.read().decode(), dict(r.headers)
    except urllib.error.HTTPError as e: return e.code, e.read().decode(), dict(e.headers)

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

s, txt, h = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})
tok = json.loads(txt)["token"]
esperar("encabezado nosniff", h.get("X-Content-Type-Options") == "nosniff", str(h))
esperar("encabezado X-Frame-Options", h.get("X-Frame-Options") == "DENY")
esperar("encabezado Referrer-Policy", h.get("Referrer-Policy") == "no-referrer")

pais = json.loads(llamar("GET", "/catalogos/paises", tok)[1])[0]["idPais"]
eq = json.loads(llamar("GET", "/equipos", tok)[1])[0]["idEquipo"]
ced = [7000]
def jugador(archivo):
    ced[0] += 1
    return llamar("POST", "/jugadores", tok, campos={"Nombre": "Foto", "Apellido": "Prueba", "Cedula": cedula_valida(ced[0]), "FechaNac": "1990-01-01",
                  "IdPais": pais, "IdEquipo": eq, "FechaDesde": D["hoy"], "Dorsal": ced[0] % 90 + 10}, archivo=archivo)

s, txt, _ = jugador(("foto.jpg", b"<html><script>alert(1)</script></html>"))
esperar("una «foto» que es HTML se rechaza con 400", s == 400 and "no es una imagen" in txt, f"{s} {txt[:150]}")
s, txt, _ = jugador(("virus.exe", b"MZ\x90\x00"))
esperar("un .exe se rechaza con 400 y su mensaje (antes 500)", s == 400 and "JPG, PNG o WEBP" in txt, f"{s} {txt[:150]}")
png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
s, txt, _ = jugador(("foto.jpg", png))
esperar("un PNG real se acepta aunque se llame .jpg", s in (200, 201), f"{s} {txt[:150]}")
url = None
if s in (200, 201):
    try: url = json.loads(txt).get("fotoUrl")
    except Exception: pass
    if not url:
        j = [x for x in json.loads(llamar("GET", "/jugadores", tok)[1]) if x.get("apellido") == "Prueba" or "Prueba" in json.dumps(x)]
        url = next((x.get("fotoUrl") for x in j if x.get("fotoUrl")), None)
esperar("se guarda con la extensión real (.png)", bool(url) and url.endswith(".png"), str(url))

# Error interno: el mensaje no debe traer detalles técnicos
s, txt, _ = llamar("POST", "/jugadores", tok, campos={"Nombre": "X", "Apellido": "Y", "Cedula": cedula_valida(8888), "FechaNac": "1990-01-01", "IdPais": 999999, "IdEquipo": eq, "FechaDesde": D["hoy"]})
print(f"INFO país inexistente: {s} {txt[:200]}")
if s >= 500:
    esperar("un error 500 no muestra detalles técnicos", "inesperado" in txt and "MySql" not in txt and "Exception" not in txt and "constraint" not in txt.lower(), txt[:200])
    esperar("el error 500 es JSON válido", txt.startswith("{") and json.loads(txt).get("error"), txt[:100])

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
