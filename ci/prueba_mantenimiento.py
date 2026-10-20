"""Prueba temporal: editar oficiales y estadios; lista de países."""
import json, sys, urllib.request, urllib.error

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def cedula_valida(n):
    b = f"09{n:07d}"; s = 0
    for i, ch in enumerate(b):
        v = int(ch) * (2 if i % 2 == 0 else 1); s += v - 9 if v > 9 else v
    return b + str((10 - s % 10) % 10)

def llamar(m, ruta, tok=None, cuerpo=None):
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, method=m, headers={"Content-Type": "application/json"})
    if tok: req.add_header("Authorization", "Bearer " + tok)
    try:
        with urllib.request.urlopen(req) as r: t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

login = lambda e: llamar("POST", "/auth/login", cuerpo={"email": e, "password": "clave123"})[1]["token"]
o1, o2 = login("org1@prueba.ec"), login("org2@prueba.ec")
paises = llamar("GET", "/catalogos/paises", o1)[1]
esperar("hay al menos 195 países", len(paises) >= 195, str(len(paises)))
esperar("Ecuador aparece primero", paises[0]["nombre"] == "Ecuador", paises[0]["nombre"])
nombres = [p["nombre"] for p in paises]
esperar("no se duplicó Perú (ya existía «Peru»)", sum(1 for n in nombres if n.lower().startswith("per")) == 1, str([n for n in nombres if n.lower().startswith("per")]))
ec = paises[0]["idPais"]; col = next(p["idPais"] for p in paises if p["nombre"] == "Colombia")

base = {"nombre": "Ana", "apellido": "Juez", "fechaNac": "1985-03-03", "idPais": col, "idCanton": None}
s, a = llamar("POST", "/arbitros", o1, {**base, "cedula": cedula_valida(3131), "tipoIdentificacion": "Cedula"})
esperar("crear oficial", s in (200, 201), str(a)[:150]); ida = a["idArbitro"]
s, b2 = llamar("POST", "/arbitros", o1, {**base, "nombre": "Beto", "cedula": "PZ55555", "tipoIdentificacion": "Pasaporte"})
s, r = llamar("PUT", f"/arbitros/{ida}", o1, {**base, "nombre": "Ana María", "cedula": "77665544", "tipoIdentificacion": "Extranjero", "fechaNac": "1986-04-04"})
esperar("editar oficial: nombre, documento y fecha", s == 200 and r["nombre"] == "Ana María" and r["cedula"] == "77665544" and r["tipoIdentificacion"] == "Extranjero" and r["fechaNac"] == "1986-04-04", f"{s} {str(r)[:200]}")
s, r = llamar("PUT", f"/arbitros/{ida}", o1, {**base, "cedula": "0912345678", "tipoIdentificacion": "Cedula"})
esperar("editar con cédula inválida → 400", s == 400 and "no es válida" in str(r), f"{s} {r}")
s, r = llamar("PUT", f"/arbitros/{ida}", o1, {**base, "cedula": "PZ55555", "tipoIdentificacion": "Pasaporte"})
esperar("editar con el documento de otro oficial suyo → 400", s == 400 and "Ya tienes otro árbitro" in str(r), f"{s} {r}")
s, r = llamar("PUT", f"/arbitros/{ida}", o1, {**base, "nombre": "Ana María", "cedula": "", "tipoIdentificacion": None})
esperar("editar sin documento conserva el que tenía", s == 200 and r["cedula"] == "77665544", f"{s} {str(r)[:150]}")
# En la base de pruebas Ecuador no tiene provincias cargadas (en producción sí): solo se prueba si las hay.
if llamar("GET", f"/catalogos/provincias?paisId={ec}", o1)[1]:
    s, r = llamar("PUT", f"/arbitros/{ida}", o1, {**base, "idPais": ec, "idCanton": None, "cedula": ""})
    esperar("Ecuador exige provincia y cantón", s == 400 and "cantón" in str(r), f"{s} {r}")
else:
    print("INFO sin provincias de Ecuador en la base de prueba: se omite esa comprobación")
s, r = llamar("PUT", f"/arbitros/{ida}", o2, {**base, "nombre": "Robado", "cedula": ""})
esperar("org2 no puede editar el oficial de org1", 400 <= s < 500, f"{s} {r}")
s, r = llamar("GET", f"/arbitros/{ida}", o1)
esperar("el oficial de org1 sigue intacto", r["nombre"] == "Ana María", str(r)[:120])
s, l = llamar("GET", "/arbitros", o1)
esperar("el listado muestra el documento editado", any(x["idArbitro"] == ida and x["cedula"] == "77665544" and x["tipoIdentificacion"] == "Extranjero" for x in l))

s, e = llamar("POST", "/estadios", o1, {"nombre": "Cancha Vieja", "idPais": col, "idCanton": None})
ide = e["idEstadio"]
s, r = llamar("PUT", f"/estadios/{ide}", o1, {"nombre": "Cancha Nueva", "idPais": col, "idCanton": None})
esperar("editar estadio", s == 200, f"{s} {r}")
s, l = llamar("GET", "/estadios", o1)
esperar("el estadio quedó con el nombre nuevo", any(x["idEstadio"] == ide and x["nombre"] == "Cancha Nueva" for x in l))
s, r = llamar("PUT", f"/estadios/{ide}", o2, {"nombre": "Robado", "idPais": col, "idCanton": None})
esperar("org2 no puede editar el estadio de org1", 400 <= s < 500, f"{s} {r}")
s, r = llamar("DELETE", f"/estadios/{ide}", o1)
esperar("eliminar estadio sin partidos", s in (200, 204), f"{s} {r}")

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
