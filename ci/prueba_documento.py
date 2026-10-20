"""Prueba temporal: tipo de documento (cédula ecuatoriana, extranjero, pasaporte)."""
import json, sys, urllib.request, urllib.error, uuid

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def cedula_valida(n):
    b = f"09{n:07d}"; s = 0
    for i, ch in enumerate(b):
        v = int(ch) * (2 if i % 2 == 0 else 1); s += v - 9 if v > 9 else v
    return b + str((10 - s % 10) % 10)

def llamar(metodo, ruta, token=None, cuerpo=None, campos=None):
    h = {}
    if campos is not None:
        borde = uuid.uuid4().hex
        datos = ("".join(f"--{borde}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n" for k, v in campos.items()) + f"--{borde}--\r\n").encode()
        h["Content-Type"] = f"multipart/form-data; boundary={borde}"
    else:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None; h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers=h)
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

tok = json.loads(llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})[1])["token"]
pais = json.loads(llamar("GET", "/catalogos/paises", tok)[1])[0]["idPais"]
eq = json.loads(llamar("GET", "/equipos", tok)[1])[0]["idEquipo"]
dorsal = [80]
def jug(tipo, numero):
    dorsal[0] += 1
    c = {"Nombre": "Doc", "Apellido": f"Prueba{dorsal[0]}", "Cedula": numero, "FechaNac": "1995-01-01", "IdPais": pais, "IdEquipo": eq, "FechaDesde": D["hoy"], "Dorsal": dorsal[0] % 99 + 1}
    if tipo is not None: c["TipoIdentificacion"] = tipo
    return llamar("POST", "/jugadores", tok, campos=c)

casos = [
 ("cédula con letras", "Cedula", "09A2345675", 400, "10 números"),
 ("cédula de 9 números", "Cedula", "091234567", 400, "10 números"),
 ("cédula con dígito verificador mal", "Cedula", "0912345678", 400, "no es válida"),
 ("cédula con provincia inexistente", "Cedula", "9912345675", 400, "no es válida"),
 ("cédula válida", "Cedula", cedula_valida(4242), 201, None),
 ("sin tipo = cédula (servidor anterior)", None, cedula_valida(4243), 201, None),
 ("documento extranjero con letras", "Extranjero", "12AB5678", 400, "solo números"),
 ("documento extranjero de 4 números", "Extranjero", "1234", 400, "entre 5 y 15"),
 ("documento extranjero válido", "Extranjero", "1023456789", 201, None),
 ("pasaporte con símbolos", "Pasaporte", "AB#12345", 400, "letras o números"),
 ("pasaporte con espacios y minúsculas se normaliza", "Pasaporte", "ab 123-4567", 201, None),
 ("tipo desconocido", "Licencia", "1234567", 400, "Tipo de documento"),
]
for nombre, tipo, num, esperado, texto in casos:
    s, t = jug(tipo, num)
    ok = s == esperado and (texto is None or texto in t)
    esperar(f"{nombre} → {esperado}", ok, f"{s} {t[:150]}")
    if nombre.startswith("pasaporte con espacios") and s == 201:
        d = json.loads(t)
        esperar("el pasaporte se guarda en mayúsculas y sin espacios", d["cedula"] == "AB1234567" and d["tipoIdentificacion"] == "Pasaporte", str(d)[:200])

s, t = jug("Extranjero", "1023456789")
esperar("el mismo documento extranjero no se repite en la liga", s == 400 and "Ya tienes un jugador" in t, f"{s} {t[:150]}")
s, t = jug("Pasaporte", "1023456789")
esperar("el mismo número con otro tipo es otro documento", s == 201, f"{s} {t[:150]}")

lista = json.loads(llamar("GET", "/jugadores", tok)[1])
esperar("el listado trae el tipo de documento", any(x.get("tipoIdentificacion") == "Pasaporte" for x in lista) and all("tipoIdentificacion" in x for x in lista))
nom = json.loads(llamar("GET", f"/equipos/{eq}", tok)[1])
esperar("la nómina del equipo trae el tipo de documento", all("tipoIdentificacion" in j for j in nom["jugadores"]))

# Editar: un jugador antiguo con documento inválido debe corregirlo
viejo = nom["jugadores"][0]
s, t = llamar("PUT", f"/jugadores/{viejo['idJugador']}", tok, campos={"Nombre": viejo["nombre"], "Apellido": viejo["apellido"], "Cedula": "LEGACY-1", "FechaNac": "1990-01-01", "IdPais": pais})
esperar("al editar no se acepta un documento inválido", s == 400 and "10 números" in t, f"{s} {t[:150]}")
s, t = llamar("PUT", f"/jugadores/{viejo['idJugador']}", tok, campos={"Nombre": viejo["nombre"], "Apellido": viejo["apellido"], "Cedula": "X1234567", "TipoIdentificacion": "Pasaporte", "FechaNac": "1990-01-01", "IdPais": pais})
esperar("al editar se puede cambiar a pasaporte", s == 200 and json.loads(t)["tipoIdentificacion"] == "Pasaporte", f"{s} {t[:150]}")

# Árbitros
arb = lambda tipo, num: llamar("POST", "/arbitros", tok, cuerpo={"nombre": "Of", "apellido": "Doc", "cedula": num, "tipoIdentificacion": tipo, "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None})
s, t = arb("Cedula", "0912345678")
esperar("árbitro con cédula inválida → 400", s == 400 and "no es válida" in t, f"{s} {t[:150]}")
s, t = arb("Pasaporte", "PX998877")
esperar("árbitro con pasaporte → se guarda", s in (200, 201) and json.loads(t)["tipoIdentificacion"] == "Pasaporte", f"{s} {t[:150]}")
s, t = arb(None, "")
esperar("árbitro sin documento (opcional) → se guarda", s in (200, 201), f"{s} {t[:150]}")
la = json.loads(llamar("GET", "/arbitros", tok)[1])
esperar("el listado de árbitros trae documento y tipo", any(a.get("cedula") == "PX998877" and a.get("tipoIdentificacion") == "Pasaporte" for a in la), str(la)[:200])

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
