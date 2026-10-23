"""Prueba de integración temporal del rol Dirigente contra el API real y MySQL (GitHub Actions)."""
import json, re, subprocess, sys, urllib.request, urllib.error, urllib.parse

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def llamar(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt)
        except Exception: return e.code, txt

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

def login(email, clave="clave123"):
    s, r = llamar("POST", "/auth/login", {"email": email, "password": clave})
    return r["token"] if s == 200 else None

def sql(consulta):
    subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-e", consulta], check=True, capture_output=True)

A, B = D["campA"], D["campB"]
org1, org2 = login("org1@prueba.ec"), login("org2@prueba.ec")
esperar("organizadores inician sesión", org1 and org2)

_, campA = llamar("GET", f"/campeonatos/{A}", token=org1)
_, campB = llamar("GET", f"/campeonatos/{B}", token=org2)
local, visita = [e["idEquipo"] for e in sorted(campA["equipos"], key=lambda e: e["nombre"])]   # «Local» antes que «Visita»
equipoB = campB["equipos"][0]["idEquipo"]

# ── Invitar ──
s, inv = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": local}, org1)
esperar("org1 invita a un dirigente de su equipo Local", s == 200 and len(inv["codigo"]) == 11 and inv["idEquipo"] == local, str(inv))
codigo = inv["codigo"]
s, _ = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": local}, org2)
esperar("org2 no puede invitar en el campeonato de org1", s == 400)
s, r = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": equipoB}, org1)
esperar("no se invita con un equipo que no está inscrito en el campeonato", s == 400, str(r))

s, info = llamar("GET", "/invitaciones-dirigente/" + urllib.parse.quote(codigo.lower().replace("-", " ")))
esperar("la invitación se consulta sin sesión", s == 200 and info["vigente"] and info["campeonato"] == "Senior A" and "Local" in info["equipo"], str(info))

s, r = llamar("POST", f"/invitaciones-dirigente/{codigo}/aceptar", {}, org1)
esperar("un organizador no puede aceptar", s == 400 and "dirigente" in r["error"], str(r))
s, r = llamar("POST", f"/invitaciones-dirigente/{codigo}/aceptar", {"email": "org2@prueba.ec", "password": "clave123"})
esperar("con el email de un organizador no se acepta", s == 400, str(r))
s, ses = llamar("POST", f"/invitaciones-dirigente/{codigo}/aceptar", {"nombre": "Pedro Dirigente", "email": "dir1@prueba.ec", "password": "clave123"})
esperar("se crea la cuenta del dirigente desde la invitación", s == 200 and ses["rol"] == "Dirigente", str(ses))
dir1 = ses["token"] if s == 200 else None
s, r = llamar("POST", f"/invitaciones-dirigente/{codigo}/aceptar", {"nombre": "Otro", "email": "otro.dir@prueba.ec", "password": "clave123"})
esperar("el código no sirve dos veces", s == 400 and "ya se usó" in r["error"], str(r))
esperar("el dirigente inicia sesión con su cuenta", login("dir1@prueba.ec") is not None)

# ── Bloqueado en todo lo de administración y en lo del vocal ──
for nombre, metodo, ruta, cuerpo in [
    ("listar campeonatos", "GET", "/campeonatos", None),
    ("detalle de campeonato (organizador)", "GET", f"/campeonatos/{A}", None),
    ("equipos", "GET", "/equipos", None),
    ("nómina por la ruta del organizador", "GET", f"/equipos/{local}", None),
    ("jugadores", "GET", "/jugadores", None),
    ("dashboard", "GET", "/dashboard", None),
    ("posiciones por la ruta del organizador", "GET", f"/campeonatos/{A}/estadisticas/posiciones", None),
    ("agregar sanción manual", "POST", f"/campeonatos/{A}/estadisticas/suspensiones", {"idJugador": 1, "motivo": "x", "partidosSancion": 1, "fechaDecision": D["hoy"]}),
    ("editar campeonato", "PUT", f"/campeonatos/{A}", {"nombre": "X"}),
    ("borrar partido", "DELETE", f"/partidos/{D['hoyA']}", None),
    ("listar dirigentes", "GET", f"/campeonatos/{A}/dirigentes", None),
    ("invitar dirigentes", "POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": local}),
    ("inicio del vocal", "GET", "/vocal/inicio", None),
    ("partido del vocal", "GET", f"/vocal/partidos/{D['hoyA']}", None),
]:
    s, _ = llamar(metodo, ruta, cuerpo, dir1)
    esperar(f"dirigente rechazado: {nombre} (403)", s == 403, f"{s}")

# ── Lectura del dirigente ──
s, ini = llamar("GET", "/dirigente/inicio", token=dir1)
esperar("inicio: ve su campeonato y su equipo", s == 200 and len(ini["campeonatos"]) == 1 and ini["campeonatos"][0]["idCampeonato"] == A and ini["campeonatos"][0]["idEquipo"] == local, str(ini)[:300])
s, det = llamar("GET", f"/dirigente/campeonatos/{A}", token=dir1)
esperar("detalle: equipos del campeonato y su equipo", s == 200 and len(det["equipos"]) == 2 and det["idEquipoPropio"] == local, str(det)[:300])
esperar("detalle: próximos partidos de su equipo", s == 200 and len(det["proximos"]) >= 1, str(det)[:400])
s, _ = llamar("GET", f"/dirigente/campeonatos/{B}", token=dir1)
esperar("no ve un campeonato donde no está habilitado (404)", s == 404)

for nombre, ruta in [("grupos", "grupos"), ("posiciones", "estadisticas/posiciones"), ("goleadores", "estadisticas/goleadores"),
                     ("tarjetas", "estadisticas/tarjetas"), ("suspensiones", "estadisticas/suspensiones"), ("jornadas", "jornadas")]:
    s, r = llamar("GET", f"/dirigente/campeonatos/{A}/{ruta}", token=dir1)
    esperar(f"lee {nombre}", s == 200, f"{s} {str(r)[:150]}")
s, pos = llamar("GET", f"/dirigente/campeonatos/{A}/estadisticas/posiciones", token=dir1)
_, posOrg = llamar("GET", f"/campeonatos/{A}/estadisticas/posiciones", token=org1)
esperar("posiciones: las mismas que ve el organizador", s == 200 and pos == posOrg, f"{str(pos)[:200]} vs {str(posOrg)[:200]}")
s, posB = llamar("GET", f"/dirigente/campeonatos/{B}/estadisticas/posiciones", token=dir1)
esperar("posiciones de otro campeonato: vacías", s == 200 and "Barrial" not in json.dumps(posB, ensure_ascii=False), str(posB)[:200])
s, golB = llamar("GET", f"/dirigente/campeonatos/{B}/estadisticas/goleadores", token=dir1)
esperar("goleadores de otro campeonato: vacíos", s == 200 and golB == [], str(golB)[:200])

s, jornadas = llamar("GET", f"/dirigente/campeonatos/{A}/jornadas", token=dir1)
idJ = jornadas[0]["idJornada"]
s, jd = llamar("GET", f"/dirigente/campeonatos/{A}/jornadas/{idJ}", token=dir1)
esperar("lee el detalle de una jornada con sus partidos", s == 200 and len(jd["partidos"]) == 2, str(jd)[:200])
_, jornadasB = llamar("GET", f"/campeonatos/{B}/jornadas", token=org2)
s, _ = llamar("GET", f"/dirigente/campeonatos/{A}/jornadas/{jornadasB[0]['idJornada']}", token=dir1)
esperar("no lee una jornada de otro campeonato aunque la pida por el suyo (404)", s == 404)
s, _ = llamar("GET", f"/dirigente/campeonatos/{B}/jornadas/{jornadasB[0]['idJornada']}", token=dir1)
esperar("no lee una jornada de otro campeonato (404)", s == 404)
s, jl = llamar("GET", f"/dirigente/campeonatos/{B}/jornadas", token=dir1)
esperar("lista de jornadas de otro campeonato: vacía", s == 200 and jl == [], str(jl)[:200])

# ── Documentos: solo los de su equipo ──
CED = re.compile(r"^\d{10}$")
s, propia = llamar("GET", f"/dirigente/campeonatos/{A}/equipos/{local}", token=dir1)
_, orgLocal = llamar("GET", f"/equipos/{local}", token=org1)
doc = lambda n: sorted((j["idJugador"], j["cedula"], j["tipoIdentificacion"]) for j in n["jugadores"])
esperar("nómina propia: SIN documentos (ni número ni tipo)", s == 200 and len(propia["jugadores"]) > 0 and all(j["cedula"] == "" and j["tipoIdentificacion"] == "" for j in propia["jugadores"]), str(propia)[:300])
esperar("nómina propia: los mismos jugadores que ve el organizador", s == 200 and sorted(j["idJugador"] for j in propia["jugadores"]) == sorted(j["idJugador"] for j in orgLocal["jugadores"]))
esperar("el organizador sí ve los documentos de ese equipo", all(j["cedula"] or j["tipoIdentificacion"] == "Pendiente" for j in orgLocal["jugadores"]))
s, rival = llamar("GET", f"/dirigente/campeonatos/{A}/equipos/{visita}", token=dir1)
_, orgVisita = llamar("GET", f"/equipos/{visita}", token=org1)
esperar("nómina de otro equipo del campeonato: rechazada (404)", s == 404, f"{s} {str(rival)[:200]}")
esperar("nómina de otro equipo: no llega ningún jugador", "jugadores" not in json.dumps(rival), str(rival)[:200])
esperar("nómina propia: sin fecha de nacimiento", "fechaNac" not in json.dumps(propia))
s, _ = llamar("GET", f"/dirigente/campeonatos/{A}/equipos/{equipoB}", token=dir1)
esperar("nómina de un equipo de otro campeonato (404)", s == 404)
s, _ = llamar("GET", f"/dirigente/campeonatos/{B}/equipos/{equipoB}", token=dir1)
esperar("nómina de otro campeonato (404)", s == 404)
s, org = llamar("GET", f"/equipos/{visita}", token=org1)
esperar("el organizador sigue viendo todos los documentos", s == 200 and len(org["jugadores"]) > 0 and all(j["cedula"] for j in org["jugadores"]), str(org)[:200])

# ── Solo lectura en sus propias rutas ──
for metodo in ("POST", "PUT", "DELETE"):
    s, _ = llamar(metodo, f"/dirigente/campeonatos/{A}/estadisticas/suspensiones", {"idJugador": 1, "motivo": "x"}, dir1)
    esperar(f"{metodo} en rutas del dirigente no hace nada (405)", s == 405, str(s))

# ── El organizador administra ──
s, lista = llamar("GET", f"/campeonatos/{A}/dirigentes", token=org1)
esperar("org1 ve al dirigente con su equipo", s == 200 and len(lista["dirigentes"]) == 1 and lista["dirigentes"][0]["idEquipo"] == local, str(lista)[:300])
idDir = lista["dirigentes"][0]["idUsuario"]
s, _ = llamar("GET", f"/campeonatos/{A}/dirigentes", token=org2)
esperar("org2 no ve los dirigentes de org1", s == 400)

s, inv2 = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": visita}, org1)
s, lista = llamar("GET", f"/campeonatos/{A}/dirigentes", token=org1)
esperar("la invitación pendiente aparece en la lista", any(i["idInvitacion"] == inv2["idInvitacion"] for i in lista["invitaciones"]), str(lista)[:300])
s, _ = llamar("DELETE", f"/campeonatos/{A}/dirigentes/invitaciones/{inv2['idInvitacion']}", token=org1)
esperar("org1 anula la invitación", s == 204)
s, info = llamar("GET", f"/invitaciones-dirigente/{inv2['codigo']}")
esperar("la invitación anulada ya no es vigente", s == 200 and not info["vigente"] and "anulada" in info["motivo"], str(info))
s, r = llamar("POST", f"/invitaciones-dirigente/{inv2['codigo']}/aceptar", {"nombre": "X", "email": "x.dir@prueba.ec", "password": "clave123"})
esperar("la invitación anulada no se puede aceptar", s == 400, str(r))

s, inv3 = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": visita}, org1)
sql(f"UPDATE invitacion_dirigente SET vence_en = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id_invitacion = {inv3['idInvitacion']}")
s, r = llamar("POST", f"/invitaciones-dirigente/{inv3['codigo']}/aceptar", {"nombre": "X", "email": "y.dir@prueba.ec", "password": "clave123"})
esperar("la invitación vencida no se puede aceptar", s == 400 and "venció" in r["error"], str(r))

# ── Cambio de equipo: una invitación nueva al mismo dirigente lo reemplaza ──
s, inv4 = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": visita}, org1)
s, ses = llamar("POST", f"/invitaciones-dirigente/{inv4['codigo']}/aceptar", {}, dir1)
esperar("el dirigente ya registrado acepta con su sesión", s == 200 and ses["rol"] == "Dirigente", str(ses))
s, det = llamar("GET", f"/dirigente/campeonatos/{A}", token=dir1)
esperar("ahora su equipo es Visita", s == 200 and det["idEquipoPropio"] == visita, str(det)[:200])
s, n1 = llamar("GET", f"/dirigente/campeonatos/{A}/equipos/{visita}", token=dir1)
s2, n2 = llamar("GET", f"/dirigente/campeonatos/{A}/equipos/{local}", token=dir1)
esperar("ve la nómina de Visita (sin documentos) y ya no la de Local", len(n1["jugadores"]) > 0 and all(j["cedula"] == "" for j in n1["jugadores"]) and s2 == 404, f"{s2}")

# ── Vocal: ya no recibe documentos ──
s, invV = llamar("POST", f"/campeonatos/{A}/vocales/invitaciones", {"tipo": "Titular"}, org1)
s, sesV = llamar("POST", f"/invitaciones/{invV['codigo']}/aceptar", {"nombre": "Vocal Doc", "email": "vocal.doc@prueba.ec", "password": "clave123"})
vocal = sesV["token"] if s == 200 else None
s, pv = llamar("GET", f"/vocal/partidos/{D['hoyA']}", token=vocal)
jug = (pv or {}).get("local", {}).get("jugadores", []) + (pv or {}).get("visitante", {}).get("jugadores", [])
esperar("el vocal ve los planteles (nombre y edad)", s == 200 and len(jug) > 0 and all(j["nombre"] and j["edad"] > 0 for j in jug), f"{s} {str(pv)[:200]}")
esperar("el vocal NO recibe documentos", s == 200 and all(j["cedula"] == "" and j["tipoIdentificacion"] == "" for j in jug), str(jug[:2]))
s, _ = llamar("GET", "/dirigente/inicio", token=vocal)
esperar("el vocal no entra a las rutas del dirigente (403)", s == 403)

# Cuentas cruzadas: cada invitación solo para su tipo de cuenta.
s, invD = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": local}, org1)
s, r = llamar("POST", f"/invitaciones-dirigente/{invD['codigo']}/aceptar", {}, vocal)
esperar("una cuenta de vocal no acepta invitación de dirigente", s == 400, str(r))
s, r = llamar("POST", f"/invitaciones-dirigente/{invD['codigo']}/aceptar", {"email": "vocal.doc@prueba.ec", "password": "clave123"})
esperar("con el email de un vocal no se crea dirigente", s == 400, str(r))
s, invV2 = llamar("POST", f"/campeonatos/{A}/vocales/invitaciones", {"tipo": "Titular"}, org1)
s, r = llamar("POST", f"/invitaciones/{invV2['codigo']}/aceptar", {}, dir1)
esperar("una cuenta de dirigente no acepta invitación de vocal", s == 400, str(r))
s, r = llamar("POST", f"/invitaciones/{invV2['codigo']}/aceptar", {"email": "dir1@prueba.ec", "password": "clave123"})
esperar("con el email de un dirigente no se crea vocal", s == 400, str(r))

# ── Quitar acceso ──
s, _ = llamar("DELETE", f"/campeonatos/{A}/dirigentes/{idDir}", token=org2)
esperar("org2 no puede quitar dirigentes de org1", s == 400)
s, _ = llamar("DELETE", f"/campeonatos/{A}/dirigentes/{idDir}", token=org1)
esperar("org1 quita el acceso", s == 204)
s, _ = llamar("GET", f"/dirigente/campeonatos/{A}", token=dir1)
esperar("sin acceso ya no ve el campeonato (404)", s == 404)
s, _ = llamar("GET", f"/dirigente/campeonatos/{A}/equipos/{visita}", token=dir1)
esperar("sin acceso ya no ve la nómina (404)", s == 404)
s, g = llamar("GET", f"/dirigente/campeonatos/{A}/estadisticas/goleadores", token=dir1)
esperar("sin acceso los reportes vienen vacíos", s == 200 and g == [])
s, ini = llamar("GET", "/dirigente/inicio", token=dir1)
esperar("sin acceso el inicio queda vacío", s == 200 and ini["campeonatos"] == [], str(ini))

print(f"\n{len(fallas)} fallas" if fallas else "\nTodo bien")
sys.exit(1 if fallas else 0)
