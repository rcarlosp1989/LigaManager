"""Prueba temporal: logos de equipos y fotos de jugadores en la base."""
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
o1, o2 = login("org1@prueba.ec"), login("org2@prueba.ec")
eq = llamar("GET", "/equipos", o1)[1][0]["idEquipo"]

s, r = llamar("POST", f"/equipos/{eq}/logo", o1, archivo=("logo", "logo.png", PNG))
esperar("subir logo", s == 200 and (r.get("logoUrl") or "").startswith("/api/imagenes/"), f"{s} {str(r)[:150]}")
url1 = r["logoUrl"]
st, tipo, cache, cuerpo = imagen(url1)
esperar("el logo se sirve sin sesión, como PNG y con caché larga", st == 200 and tipo.startswith("image/png") and "immutable" in (cache or "") and cuerpo == PNG, f"{st} {tipo} {cache}")
esperar("el listado de equipos trae el logo", any(x["idEquipo"] == eq and x.get("logoUrl") == url1 for x in llamar("GET", "/equipos", o1)[1]))
jd = llamar("GET", f"/jornadas/{llamar('GET', f'/campeonatos/{D['campA']}/jornadas', o1)[1][0]['idJornada']}", o1)[1]
esperar("el partido trae el logo del local o del visitante", any(p.get("logoLocal") == url1 or p.get("logoVisitante") == url1 for p in jd["partidos"]), str([(p.get("logoLocal"), p.get("logoVisitante")) for p in jd["partidos"]])[:200])
dash = llamar("GET", "/dashboard", o1)[1]
esperar("el Dashboard trae logos en próximos partidos", any("logoLocal" in p or "logoVisitante" in p for p in dash.get("proximosPartidos", [])) or not dash.get("proximosPartidos"), str(dash.get("proximosPartidos"))[:200])

s, r = llamar("POST", f"/equipos/{eq}/logo", o2, archivo=("logo", "logo.png", PNG))
esperar("org2 no puede cambiar el logo de org1", s == 400, f"{s} {r}")
s, r = llamar("POST", f"/equipos/{eq}/logo", o1, archivo=("logo", "logo.png", b"<svg onload=alert(1)>"))
esperar("un archivo que no es imagen se rechaza", s == 400 and "no es una imagen" in str(r), f"{s} {r}")
s, r = llamar("POST", f"/equipos/{eq}/logo", o1, archivo=("logo", "logo.png", PNG + b"\0" * (310 * 1024)))
esperar("un logo de más de 300 KB se rechaza", s == 400 and "300 KB" in str(r), f"{s} {r}")

s, r = llamar("POST", f"/equipos/{eq}/logo", o1, archivo=("logo", "otro.png", PNG + b"\0" * 10))
url2 = r["logoUrl"]
esperar("cambiar el logo crea otra dirección y borra el anterior", url2 != url1 and imagen(url1)[0] == 404 and imagen(url2)[0] == 200)
s, r = llamar("DELETE", f"/equipos/{eq}/logo", o1)
esperar("quitar el logo", s == 200 and not r.get("logoUrl") and imagen(url2)[0] == 404, f"{s} {str(r)[:120]}")
esperar("una imagen inexistente da 404", imagen("/api/imagenes/" + "0" * 32)[0] == 404)

pais = llamar("GET", "/catalogos/paises", o1)[1][0]["idPais"]
s, j = llamar("POST", "/jugadores", o1, campos={"Nombre": "Foto", "Apellido": "Base", "Cedula": cedula_valida(5151), "FechaNac": "1995-01-01", "IdPais": pais,
              "IdEquipo": eq, "FechaDesde": D["hoy"], "Dorsal": 77}, archivo=("Foto", "foto.png", PNG))
foto1 = (j or {}).get("fotoUrl") if isinstance(j, dict) else None
esperar("la foto del jugador se guarda en la base", s in (200, 201) and (foto1 or "").startswith("/api/imagenes/") and imagen(foto1)[0] == 200, f"{s} {str(j)[:150]}")
s, j2 = llamar("PUT", f"/jugadores/{j['idJugador']}", o1, campos={"Nombre": "Foto", "Apellido": "Base", "Cedula": cedula_valida(5151), "FechaNac": "1995-01-01", "IdPais": pais}, archivo=("Foto", "foto2.png", PNG + b"\0"))
foto2 = j2.get("fotoUrl") if isinstance(j2, dict) else None
esperar("cambiar la foto borra la anterior", s == 200 and foto2 and foto2 != foto1 and imagen(foto1)[0] == 404, f"{s} {foto1} {foto2}")
s, _ = llamar("DELETE", f"/jugadores/{j['idJugador']}", o1)
esperar("eliminar al jugador borra su foto", s in (200, 204) and imagen(foto2)[0] == 404, f"{s}")
s, r = llamar("POST", "/jugadores", o1, campos={"Nombre": "Foto", "Apellido": "Grande", "Cedula": cedula_valida(5152), "FechaNac": "1995-01-01", "IdPais": pais,
              "IdEquipo": eq, "FechaDesde": D["hoy"], "Dorsal": 78}, archivo=("Foto", "foto.png", PNG + b"\0" * (1100 * 1024)))
esperar("una foto de más de 1 MB se rechaza con mensaje", s in (400, 413) , f"{s} {str(r)[:150]}")
print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
