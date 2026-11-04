"""Prueba temporal: fotos de jugadores en los reportes."""
import json, sys, urllib.request, urllib.error, uuid, base64
BASE = "http://localhost:5080/api"; RAIZ = "http://localhost:5080"
D = json.load(open(sys.argv[1]))
fallas = []
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
def cedula_valida(n):
    b = f"09{n:07d}"; s = 0
    for i, ch in enumerate(b):
        v = int(ch) * (2 if i % 2 == 0 else 1); s += v - 9 if v > 9 else v
    return b + str((10 - s % 10) % 10)
def llamar(m, ruta, tok=None, cuerpo=None, archivo=None, campos=None):
    h = {}
    if archivo or campos is not None:
        borde = uuid.uuid4().hex; datos = b""
        for k, v in (campos or {}).items():
            datos += f"--{borde}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
        if archivo:
            campo, nombre, contenido = archivo
            datos += f"--{borde}\r\nContent-Disposition: form-data; name=\"{campo}\"; filename=\"{nombre}\"\r\nContent-Type: image/png\r\n\r\n".encode() + contenido + b"\r\n"
        datos += f"--{borde}--\r\n".encode(); h["Content-Type"] = f"multipart/form-data; boundary={borde}"
    else:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None; h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + ruta, data=datos, method=m, headers=h)
    if tok: req.add_header("Authorization", "Bearer " + tok)
    try:
        with urllib.request.urlopen(req) as r: t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t
def imagen(url):
    try:
        with urllib.request.urlopen(RAIZ + url) as r: return r.status, r.headers.get("Content-Type"), r.headers.get("Cache-Control"), r.read()
    except urllib.error.HTTPError as e: return e.code, None, None, b""
def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)
login = lambda e: llamar("POST", "/auth/login", cuerpo={"email": e, "password": "clave123"})[1]["token"]
o1 = login("org1@prueba.ec")
camp = D["campA"]
gol = llamar("GET", f"/campeonatos/{camp}/estadisticas/goleadores", o1)
tar = llamar("GET", f"/campeonatos/{camp}/estadisticas/tarjetas", o1)
sus = llamar("GET", f"/campeonatos/{camp}/estadisticas/suspensiones", o1)
esperar("los tres reportes responden", gol[0] == 200 and tar[0] == 200 and sus[0] == 200, f"{gol[0]} {tar[0]} {sus[0]}")
filas = gol[1] + tar[1]["porJugador"] + sus[1]["sanciones"] + sus[1]["enRiesgo"]
print("filas:", len(gol[1]), len(tar[1]["porJugador"]), len(sus[1]["sanciones"]), len(sus[1]["enRiesgo"]))
# El servidor omite los campos vacíos: una fila sin foto no trae «fotoUrl».
esperar("hay filas para revisar", len(filas) > 0)
idj = (gol[1] or tar[1]["porJugador"] or sus[1]["sanciones"])[0]["idJugador"]
det = llamar("GET", f"/jugadores/{idj}", o1)[1]
s, j2 = llamar("PUT", f"/jugadores/{idj}", o1, campos={"Nombre": det["nombre"], "Apellido": det["apellido"], "Cedula": det["cedula"],
               "TipoIdentificacion": det.get("tipoIdentificacion", "Cedula"), "FechaNac": det["fechaNac"], "IdPais": det["idPais"],
               **({"IdCanton": det["idCanton"]} if det.get("idCanton") else {})},
               archivo=("Foto", "foto.png", PNG))
foto = j2.get("fotoUrl") if isinstance(j2, dict) else None
esperar("se le pone foto al jugador", s == 200 and (foto or "").startswith("/api/imagenes/"), f"{s} {str(j2)[:200]}")
g2 = llamar("GET", f"/campeonatos/{camp}/estadisticas/goleadores", o1)[1]
t2 = llamar("GET", f"/campeonatos/{camp}/estadisticas/tarjetas", o1)[1]["porJugador"]
s2 = llamar("GET", f"/campeonatos/{camp}/estadisticas/suspensiones", o1)[1]
todas = [("goleadores", x) for x in g2] + [("tarjetas", x) for x in t2] + [("sanciones", x) for x in s2["sanciones"]] + [("riesgo", x) for x in s2["enRiesgo"]]
suyas = [(n, x.get("fotoUrl")) for n, x in todas if x["idJugador"] == idj]
esperar("sus filas en los reportes traen la foto nueva", suyas and all(f == foto for _, f in suyas), str(suyas))
print("reportes con su foto:", sorted({n for n, _ in suyas}))
print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
