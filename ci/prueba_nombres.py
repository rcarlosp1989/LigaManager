"""Prueba temporal: el dirigente ve primer nombre y primer apellido; el organizador, el nombre completo."""
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
        partes = b"".join(f"--{borde}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode() for k, v in campos.items())
        datos = partes + f"--{borde}--\r\n".encode(); h["Content-Type"] = f"multipart/form-data; boundary={borde}"
    else:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None; h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers=h)
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

PART = {"de", "del", "la", "las", "los", "da", "das", "do", "dos", "di", "van", "von", "y", "san", "santa", "mc", "mac"}
def corto_apellido(a):
    out = []
    for w in a.split():
        out.append(w)
        if w.lower() not in PART: break
    return " ".join(out)
def corto(n, a): return f"{n.split()[0]} {corto_apellido(a)}".strip()

A = D["campA"]
org = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})[1]["token"]
_, camp = llamar("GET", f"/campeonatos/{A}", org)
local = sorted(camp["equipos"], key=lambda e: e["nombre"])[0]["idEquipo"]
pais = llamar("GET", "/catalogos/paises", org)[1][0]["idPais"]

# Jugador con nombres y apellidos compuestos, con partícula.
s, j = llamar("POST", "/jugadores", org, campos={"Nombre": "Carlos Andrés", "Apellido": "De la Cruz Pérez", "Cedula": cedula_valida(5151),
              "FechaNac": "1995-05-05", "IdPais": pais, "IdEquipo": local, "FechaDesde": D["hoy"], "Dorsal": 77})
esperar("se crea el jugador «Carlos Andrés De la Cruz Pérez»", s in (200, 201), str(j)[:200])
idJ = j["idJugador"]
s, r = llamar("POST", f"/campeonatos/{A}/estadisticas/suspensiones", org, cuerpo={"idJugador": idJ, "motivo": "Prueba de nombre", "partidosSancion": 1, "fechaDecision": D["hoy"]})
esperar("el organizador le pone una sanción", s == 200, str(r)[:200])

s, inv = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", org, cuerpo={"idEquipo": local})
s, ses = llamar("POST", f"/invitaciones-dirigente/{inv['codigo']}/aceptar", cuerpo={"nombre": "Dir Nombres", "email": "dir.nombres@prueba.ec", "password": "clave123"})
dirt = ses["token"]

# Nombres completos (desde la nómina del organizador) de todos los jugadores del campeonato.
completos = {}
for e in camp["equipos"]:
    for x in llamar("GET", f"/equipos/{e['idEquipo']}", org)[1]["jugadores"]:
        completos[x["idJugador"]] = (x["nombre"], x["apellido"])

# Nómina
_, nomD = llamar("GET", f"/dirigente/campeonatos/{A}/equipos/{local}", dirt)
cdlc = next(x for x in nomD["jugadores"] if x["idJugador"] == idJ)
esperar("nómina del dirigente: «Carlos» y «De la Cruz»", cdlc["nombre"] == "Carlos" and cdlc["apellido"] == "De la Cruz", str(cdlc))
esperar("nómina del dirigente: todos con nombre corto",
        all((x["nombre"], x["apellido"]) == (completos[x["idJugador"]][0].split()[0], corto_apellido(completos[x["idJugador"]][1])) for x in nomD["jugadores"]))
_, nomO = llamar("GET", f"/equipos/{local}", org)
o = next(x for x in nomO["jugadores"] if x["idJugador"] == idJ)
esperar("nómina del organizador: nombre completo", o["nombre"] == "Carlos Andrés" and o["apellido"] == "De la Cruz Pérez", str(o))

# Reportes: cada nombre del dirigente es el corto del nombre completo; el organizador ve el completo.
def filas(datos, ruta):
    if ruta == "goleadores": return datos
    if ruta == "tarjetas": return datos["porJugador"]
    return datos["sanciones"] + datos["enRiesgo"]
for ruta in ("goleadores", "tarjetas", "suspensiones"):
    _, d = llamar("GET", f"/dirigente/campeonatos/{A}/estadisticas/{ruta}", dirt)
    _, o = llamar("GET", f"/campeonatos/{A}/estadisticas/{ruta}", org)
    fd, fo = filas(d, ruta), filas(o, ruta)
    esperar(f"{ruta}: el dirigente ve nombres cortos ({len(fd)} filas)",
            all(x["jugador"] == corto(*completos[x["idJugador"]]) for x in fd if x["idJugador"] in completos),
            str([(x["jugador"], completos.get(x["idJugador"])) for x in fd][:4]))
    esperar(f"{ruta}: el organizador ve nombres completos",
            all(x["jugador"] == f"{completos[x['idJugador']][0]} {completos[x['idJugador']][1]}" for x in fo if x["idJugador"] in completos))
_, sus = llamar("GET", f"/dirigente/campeonatos/{A}/estadisticas/suspensiones", dirt)
esperar("la sanción aparece como «Carlos De la Cruz»", any(x["jugador"] == "Carlos De la Cruz" for x in sus["sanciones"]), str([x["jugador"] for x in sus["sanciones"]]))

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
