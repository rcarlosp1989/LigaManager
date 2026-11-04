"""Prueba temporal: logo de la liga en el campeonato (acta de juego)."""
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
    if campos is not None and m == "POST" and ruta == "/jugadores" and "AutorizacionDatos" not in campos:
        campos = {**campos, "AutorizacionDatos": "true"}
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
o1, o2 = login("org1@prueba.ec"), login("org2@prueba.ec")
A = D["campA"]

s, c = llamar("GET", f"/campeonatos/{A}", o1)
esperar("sin logo, el detalle no trae logoUrl", s == 200 and c.get("logoUrl") is None, str(c)[-120:])
s, r = llamar("POST", f"/campeonatos/{A}/logo", o1, archivo=("logo", "liga.png", PNG))
esperar("org1 sube el logo de la liga", s == 200 and (r.get("logoUrl") or "").startswith("/api/imagenes/"), f"{s} {str(r)[:200]}")
url1 = (r or {}).get("logoUrl") or ""
st, tipo, cache, cuerpo = imagen(url1)
esperar("el logo se sirve como PNG", st == 200 and (tipo or "").startswith("image/png") and cuerpo == PNG, f"{st} {tipo}")
s, c = llamar("GET", f"/campeonatos/{A}", o1)
esperar("el detalle del campeonato trae el logo", c.get("logoUrl") == url1, str(c)[-120:])
s, _ = llamar("POST", f"/campeonatos/{A}/logo", o2, archivo=("logo", "liga.png", PNG))
esperar("org2 no puede cambiar el logo de A", s == 400, str(s))
s, _ = llamar("DELETE", f"/campeonatos/{A}/logo", o2)
esperar("org2 no puede quitar el logo de A", s == 400, str(s))
s, _ = llamar("POST", f"/campeonatos/{A}/logo", None, archivo=("logo", "liga.png", PNG))
esperar("sin sesión no se sube (401)", s == 401, str(s))
s, r = llamar("POST", f"/campeonatos/{A}/logo", o1, archivo=("logo", "liga.png", b"no es una imagen"))
esperar("un archivo que no es imagen se rechaza", s == 400 and "imagen" in json.dumps(r, ensure_ascii=False).lower(), f"{s} {r}")
s, r = llamar("POST", f"/campeonatos/{A}/logo", o1, archivo=("logo", "liga.png", PNG + b"\0" * (301 * 1024)))
esperar("más de 300 KB se rechaza", s in (400, 413), f"{s} {str(r)[:120]}")
s, r = llamar("POST", f"/campeonatos/{A}/logo", o1, archivo=("logo", "liga2.png", PNG))
url2 = (r or {}).get("logoUrl") or ""
esperar("cambiar el logo da otra dirección", s == 200 and url2 and url2 != url1, str(r)[-120:])
esperar("el logo anterior se borra (404)", imagen(url1)[0] == 404)
s, r = llamar("DELETE", f"/campeonatos/{A}/logo", o1)
esperar("org1 quita el logo", s == 200 and r.get("logoUrl") is None, f"{s} {str(r)[-120:]}")
esperar("el logo quitado ya no se sirve (404)", imagen(url2)[0] == 404)
s, c = llamar("GET", f"/campeonatos/{A}", o1)
esperar("el campeonato sigue con sus datos", s == 200 and c["idCampeonato"] == A and len(c["equipos"]) >= 2, str(c)[:150])

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
