"""Prueba de integración temporal de la Fase 7 contra el API real y MySQL (GitHub Actions)."""
import json, sys, urllib.request, urllib.error, urllib.parse

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

org1, org2 = login("org1@prueba.ec"), login("org2@prueba.ec")
esperar("organizadores inician sesión", org1 and org2)

# ── Dashboard filtrado por organizador ──
s, dash = llamar("GET", "/dashboard", token=org2)
esperar("Dashboard: org2 ve solo su campeonato", s == 200 and dash["totalCampeonatos"] == 1, str(dash)[:200])
esperar("Dashboard: org2 ve solo sus próximos partidos", s == 200 and all("Barrial" in p["campeonato"] for p in dash["proximosPartidos"]), str(dash)[:300])

# ── Invitación titular ──
s, inv = llamar("POST", f"/campeonatos/{D['campA']}/vocales/invitaciones", {"tipo": "Titular"}, org1)
esperar("org1 crea invitación titular", s == 200 and len(inv["codigo"]) == 11, str(inv))
codigo = inv["codigo"]
s, _ = llamar("POST", f"/campeonatos/{D['campA']}/vocales/invitaciones", {"tipo": "Titular"}, org2)
esperar("org2 no puede invitar en el campeonato de org1", s == 400)

s, info = llamar("GET", "/invitaciones/" + urllib.parse.quote(codigo.lower().replace("-", " ")))
esperar("la invitación se consulta sin sesión (código en minúsculas y con espacio)", s == 200 and info["vigente"] and info["campeonato"] == "Senior A", str(info))

s, r = llamar("POST", f"/invitaciones/{codigo}/aceptar", {}, org1)
esperar("un organizador no puede aceptar", s == 400 and "vocal" in r["error"], str(r))
s, r = llamar("POST", f"/invitaciones/{codigo}/aceptar", {"email": "org2@prueba.ec", "password": "clave123"})
esperar("con el email de un organizador no se acepta", s == 400, str(r))

s, ses = llamar("POST", f"/invitaciones/{codigo}/aceptar", {"nombre": "Juan Vocal", "email": "vocal@prueba.ec", "password": "clave123"})
esperar("se crea la cuenta del vocal desde la invitación", s == 200 and ses["rol"] == "Vocal", str(ses))
vocal = ses["token"] if s == 200 else None
s, r = llamar("POST", f"/invitaciones/{codigo}/aceptar", {"nombre": "Otro", "email": "otro@prueba.ec", "password": "clave123"})
esperar("el código no sirve dos veces", s == 400 and "ya se usó" in r["error"], str(r))
esperar("el vocal inicia sesión con su cuenta", login("vocal@prueba.ec") is not None)

# ── Inicio del vocal ──
s, ini = llamar("GET", "/vocal/inicio", token=vocal)
esperar("inicio: el partido de hoy de su campeonato", s == 200 and [p["idPartido"] for p in ini["partidosHoy"]] == [D["hoyA"]], str(ini)[:300])
esperar("inicio: no ve el partido de hoy de otro campeonato", s == 200 and all(p["idCampeonato"] == D["campA"] for p in ini["partidosHoy"] + ini["proximos"]))
esperar("inicio: el de mañana aparece como próximo", s == 200 and D["mananaA"] in [p["idPartido"] for p in ini["proximos"]])
s, _ = llamar("GET", "/vocal/inicio", token=org1)
esperar("un organizador no entra a /api/vocal", s == 403)

# ── Partido de hoy ──
s, det = llamar("GET", f"/vocal/partidos/{D['hoyA']}", token=vocal)
esperar("detalle del partido de hoy con planteles y foto", s == 200 and len(det["local"]["jugadores"]) == 8 and any(j.get("fotoUrl") for j in det["local"]["jugadores"]), str(det)[:300])
loc = det["local"]["jugadores"]; vis = det["visitante"]["jugadores"]
s, _ = llamar("GET", f"/vocal/partidos/{D['mananaA']}", token=vocal)
esperar("el partido de mañana no se abre hoy", s == 404)
s, _ = llamar("GET", f"/vocal/partidos/{D['hoyB']}", token=vocal)
esperar("el partido de otro campeonato no se abre", s == 404)

for j in loc[:3]:
    s, p = llamar("POST", f"/vocal/partidos/{D['hoyA']}/alineacion", {"idJugador": j["idJugador"], "titular": True}, vocal)
s, p = llamar("POST", f"/vocal/partidos/{D['hoyA']}/alineacion", {"idJugador": loc[3]["idJugador"], "titular": False}, vocal)
esperar("el vocal convoca titulares y suplentes", s == 200 and len(p["alineacionLocal"]) == 4, str(p)[:200])
s, p = llamar("POST", f"/vocal/partidos/{D['hoyA']}/eventos", {"idJugador": loc[0]["idJugador"], "tipoEvento": "GOL", "minuto": 12}, vocal)
esperar("el vocal registra un gol", s == 200 and len(p["eventos"]) == 1, str(p)[:200])
id_gol = p["eventos"][0]["idEvento"]
s, p = llamar("POST", f"/vocal/partidos/{D['hoyA']}/eventos", {"idJugador": loc[1]["idJugador"], "tipoEvento": "TARJETA_AMARILLA", "minuto": 20}, vocal)
s, p = llamar("POST", f"/vocal/partidos/{D['hoyA']}/cambios", {"idJugadorSale": loc[2]["idJugador"], "idJugadorEntra": loc[3]["idJugador"], "minuto": 30}, vocal)
esperar("el vocal registra un cambio", s == 200 and len(p["cambios"]) == 1, str(p)[:200])
s, _ = llamar("DELETE", f"/vocal/eventos/{id_gol}", token=vocal)
esperar("el vocal deshace un evento", s == 204)
s, p = llamar("POST", f"/vocal/partidos/{D['mananaA']}/eventos", {"idJugador": loc[0]["idJugador"], "tipoEvento": "GOL", "minuto": 5}, vocal)
esperar("no registra en el partido de mañana", s == 400)

# ── Lo que el vocal NO puede (403 del servidor) ──
prohibidas = [
    ("GET", "/campeonatos"), ("GET", f"/campeonatos/{D['campA']}"), ("POST", "/campeonatos"),
    ("GET", f"/jornadas/1"), ("PUT", f"/partidos/{D['hoyA']}"), ("DELETE", f"/partidos/{D['hoyA']}"),
    ("PUT", f"/partidos/{D['hoyA']}/jugado"), ("POST", f"/partidos/{D['hoyA']}/eventos"),
    ("GET", "/equipos"), ("PUT", f"/equipos/1"), ("GET", "/jugadores"), ("DELETE", "/jugadores/1"),
    ("GET", "/dashboard"), ("GET", f"/campeonatos/{D['campA']}/vocales"),
    ("POST", f"/campeonatos/{D['campA']}/vocales/invitaciones"), ("GET", "/estadios"), ("GET", "/arbitros"),
]
for metodo, ruta in prohibidas:
    s, r = llamar(metodo, ruta, {} if metodo in ("POST", "PUT") else None, vocal)
    esperar(f"403 para el vocal: {metodo} {ruta}", s == 403, f"{s} {str(r)[:120]}")

# ── Reemplazo ──
s, rem = llamar("POST", f"/vocal/campeonatos/{D['campA']}/reemplazos", {"fecha": D["hoy"]}, vocal)
esperar("el titular delega el día de hoy", s == 200 and rem["tipo"] == "Reemplazo", str(rem))
s, ses2 = llamar("POST", f"/invitaciones/{rem['codigo']}/aceptar", {"nombre": "Pedro Reemplazo", "email": "reemplazo@prueba.ec", "password": "clave123"})
reemplazo = ses2["token"] if s == 200 else None
s, ini2 = llamar("GET", "/vocal/inicio", token=reemplazo)
esperar("el reemplazo ve el partido de hoy", s == 200 and [p["idPartido"] for p in ini2["partidosHoy"]] == [D["hoyA"]], str(ini2)[:300])
esperar("el reemplazo no ve próximos", s == 200 and ini2["proximos"] == [], str(ini2)[:300])
s, _ = llamar("POST", f"/vocal/campeonatos/{D['campA']}/reemplazos", {"fecha": D["hoy"]}, reemplazo)
esperar("el reemplazo no puede delegar", s == 400)
s, p = llamar("POST", f"/vocal/partidos/{D['hoyA']}/eventos", {"idJugador": vis[0]["idJugador"], "tipoEvento": "TARJETA_AMARILLA", "minuto": 33}, reemplazo)
esperar("el reemplazo registra hoy", s == 200)

s, rem2 = llamar("POST", f"/campeonatos/{D['campA']}/vocales/invitaciones", {"tipo": "Reemplazo", "fecha": D["manana"]}, org1)
s, ses3 = llamar("POST", f"/invitaciones/{rem2['codigo']}/aceptar", {"nombre": "Ana Mañana", "email": "manana@prueba.ec", "password": "clave123"})
s, ini3 = llamar("GET", "/vocal/inicio", token=ses3["token"])
esperar("un reemplazo de mañana no tiene partidos hoy", s == 200 and ini3["partidosHoy"] == [], str(ini3)[:200])
s, _ = llamar("GET", f"/vocal/partidos/{D['hoyA']}", token=ses3["token"])
esperar("un reemplazo de mañana no abre el partido de hoy", s == 404)

s, rev = llamar("POST", f"/campeonatos/{D['campA']}/vocales/invitaciones", {"tipo": "Titular"}, org1)
s, _ = llamar("DELETE", f"/campeonatos/{D['campA']}/vocales/invitaciones/{rev['idInvitacion']}", token=org1)
s, r = llamar("GET", f"/invitaciones/{rev['codigo']}")
esperar("una invitación anulada no está vigente", s == 200 and not r["vigente"] and "anulada" in r["motivo"], str(r))
s, r = llamar("POST", f"/invitaciones/{rev['codigo']}/aceptar", {"nombre": "X", "email": "x@prueba.ec", "password": "clave123"})
esperar("una invitación anulada no se acepta", s == 400)

s, lista = llamar("GET", f"/campeonatos/{D['campA']}/vocales", token=org1)
esperar("el organizador ve titular y reemplazos", s == 200 and {v["tipo"] for v in lista["vocales"]} == {"Titular", "Reemplazo"} and len(lista["vocales"]) == 3, str(lista)[:300])

# ── Cerrar el partido ──
s, p = llamar("PUT", f"/vocal/partidos/{D['hoyA']}/cerrar", {"observaciones": "Sin novedades."}, vocal)
esperar("el vocal cierra con observaciones y el partido queda jugado", s == 200 and p["jugado"] and p["observaciones"] == "Sin novedades.", str(p)[:200])

# ── Quitar al vocal ──
s, _ = llamar("DELETE", f"/campeonatos/{D['campA']}/vocales/{ses['idUsuario'] if 'idUsuario' in ses else 0}", token=org1)
ids = {v["nombre"]: v["idUsuario"] for v in lista["vocales"]}
s, _ = llamar("DELETE", f"/campeonatos/{D['campA']}/vocales/{ids['Juan Vocal']}", token=org1)
esperar("el organizador quita al vocal", s == 204)
s, _ = llamar("GET", f"/vocal/partidos/{D['hoyA']}", token=vocal)
esperar("el vocal quitado ya no abre el partido", s == 404)

# ── El organizador sigue igual ──
s, _ = llamar("GET", f"/partidos/{D['hoyA']}", token=org1)
esperar("el organizador sigue leyendo su partido", s == 200)
s, _ = llamar("GET", f"/partidos/{D['hoyA']}", token=org2)
esperar("otro organizador no lee ese partido", s == 404)

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
