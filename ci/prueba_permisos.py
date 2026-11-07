"""Prueba temporal de permisos: el organizador 2 intenta ver, cambiar y borrar lo del organizador 1."""
import json, sys, urllib.request, urllib.error, uuid

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas, avisos = [], []

def llamar(metodo, ruta, cuerpo=None, token=None, forma=None):
    if forma is not None:
        borde = uuid.uuid4().hex
        partes = []
        for k, v in forma.items():
            partes.append(f"--{borde}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n")
        datos = ("".join(partes) + f"--{borde}--\r\n").encode()
        tipo = f"multipart/form-data; boundary={borde}"
    else:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
        tipo = "application/json"
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", tipo)
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode(); return r.status, (json.loads(txt) if txt else None), txt
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt), txt
        except Exception: return e.code, txt, txt

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

def login(email):
    return llamar("POST", "/auth/login", {"email": email, "password": "clave123"})[1]["token"]

o1, o2 = login("org1@prueba.ec"), login("org2@prueba.ec")
A, B = D["campA"], D["campB"]

# ── Datos del organizador 1 ──
pais = llamar("GET", "/catalogos/paises", token=o1)[1][0]["idPais"]
inst = llamar("GET", "/catalogos/instancias", token=o1)[1][0]["idInstancia"]
equiposA = [e["idEquipo"] for e in llamar("GET", "/equipos", token=o1)[1]]
eqA = equiposA[0]
s, det, _ = llamar("GET", f"/equipos/{eqA}", token=o1)
jugA = [j["idJugador"] for j in det["jugadores"]]
jornadaA = llamar("GET", f"/campeonatos/{A}/jornadas", token=o1)[1][0]["idJornada"]
PA = D["mananaA"]
s, est, _ = llamar("POST", "/estadios", {"nombre": "Estadio Secreto Org1", "idPais": pais, "idCanton": None}, o1)
estA = est["idEstadio"]
s, arb, _ = llamar("POST", "/arbitros", {"nombre": "Arbitro", "apellido": "SecretoOrg1", "cedula": "0919191916", "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None}, o1)
arbA = arb["idArbitro"]
s, gr, _ = llamar("POST", f"/campeonatos/{A}/grupos", {"nombre": "Grupo Secreto"}, o1)
grA = gr["idGrupo"]
llamar("POST", f"/partidos/{PA}/alineacion", {"idJugador": jugA[0], "titular": True}, o1)
s, p, _ = llamar("POST", f"/partidos/{PA}/alineacion", {"idJugador": jugA[1], "titular": False}, o1)
alinA = p["alineacionLocal"][0]["idAlineacion"] if p.get("alineacionLocal") else p["alineacionVisitante"][0]["idAlineacion"]
s, p, _ = llamar("POST", f"/partidos/{PA}/eventos", {"idJugador": jugA[0], "tipoEvento": "TARJETA_AMARILLA", "minuto": 5}, o1)
evA = p["eventos"][0]["idEvento"]
s, p, _ = llamar("POST", f"/partidos/{PA}/cambios", {"idJugadorSale": jugA[0], "idJugadorEntra": jugA[1], "minuto": 20}, o1)
camA = p["cambios"][0]["idCambio"]
s, r, _ = llamar("POST", f"/campeonatos/{A}/estadisticas/suspensiones", {"idJugador": jugA[2], "motivo": "Prueba", "partidosSancion": 1}, o1)
s, susp, _ = llamar("GET", f"/campeonatos/{A}/estadisticas/suspensiones", token=o1)
sancA = next((x.get("idSancion") for x in (susp if isinstance(susp, list) else susp.get("manuales", susp.get("sanciones", []))) if isinstance(x, dict) and x.get("idSancion")), 999999)
s, fa, _ = llamar("POST", f"/campeonatos/{A}/fases", {"idInstancia": inst, "orden": 1, "formato": "GRUPOS", "equiposClasifican": 2}, o1)
faseA = (fa or {}).get("idFase", 999999)
s, inv, _ = llamar("POST", f"/campeonatos/{A}/vocales/invitaciones", {"tipo": "Titular"}, o1)
invA = inv["idInvitacion"]
print(f"datos org1: eq={eqA} jug={jugA[:3]} jornada={jornadaA} partido={PA} est={estA} arb={arbA} grupo={grA} alin={alinA} ev={evA} cambio={camA} sancion={sancA} fase={faseA} inv={invA}")

# ── Datos del organizador 2 ──
eqB = [e["idEquipo"] for e in llamar("GET", "/equipos", token=o2)[1]][0]
jugB = [j["idJugador"] for j in llamar("GET", f"/equipos/{eqB}", token=o2)[1]["jugadores"]]
jornadaB = llamar("GET", f"/campeonatos/{B}/jornadas", token=o2)[1][0]["idJornada"]

# ── Ataques directos sobre lo del organizador 1 ──
ataques = [
 ("ver campeonato", "GET", f"/campeonatos/{A}", None),
 ("editar campeonato", "PUT", f"/campeonatos/{A}", {"nombre": "Robado", "anio": 2026, "fechaInicio": "2026-01-01", "fechaFin": "2026-12-31", "estado": "EnCurso", "idModalidad": 1, "idTipoPartido": 1}),
 ("borrar campeonato", "DELETE", f"/campeonatos/{A}", None),
 ("inscribir su equipo en campeonato ajeno", "POST", f"/campeonatos/{A}/equipos/{eqB}", None),
 ("quitar equipo de campeonato ajeno", "DELETE", f"/campeonatos/{A}/equipos/{eqA}", None),
 ("ver equipo", "GET", f"/equipos/{eqA}", None),
 ("editar equipo", "PUT", f"/equipos/{eqA}", {"nombre": "Robado", "idPais": pais}),
 ("borrar equipo", "DELETE", f"/equipos/{eqA}", None),
 ("ver jugador", "GET", f"/jugadores/{jugA[0]}", None),
 ("cambiar dorsal", "PATCH", f"/jugadores/{jugA[0]}/dorsal", {"dorsal": 99}),
 ("borrar jugador", "DELETE", f"/jugadores/{jugA[0]}", None),
 ("vincular jugador ajeno a su equipo", "POST", f"/jugadores/{jugA[3]}/vincular-equipo", {"idEquipo": eqB, "fechaDesde": D["hoy"], "fechaHasta": None, "dorsal": 50, "posicion": None}),
 ("vincular su jugador a equipo ajeno", "POST", f"/jugadores/{jugB[0]}/vincular-equipo", {"idEquipo": eqA, "fechaDesde": D["hoy"], "fechaHasta": None, "dorsal": 51, "posicion": None}),
 ("editar estadio", "PUT", f"/estadios/{estA}", {"nombre": "Robado", "idPais": pais, "idCanton": None}),
 ("borrar estadio", "DELETE", f"/estadios/{estA}", None),
 ("ver árbitro", "GET", f"/arbitros/{arbA}", None),
 ("editar árbitro", "PUT", f"/arbitros/{arbA}", {"nombre": "R", "apellido": "R", "cedula": "0912345675", "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None}),
 ("borrar árbitro", "DELETE", f"/arbitros/{arbA}", None),
 ("ver grupos", "GET", f"/campeonatos/{A}/grupos", None),
 ("ver posiciones", "GET", f"/campeonatos/{A}/posiciones", None),
 ("crear grupo", "POST", f"/campeonatos/{A}/grupos", {"nombre": "X"}),
 ("ver grupo", "GET", f"/grupos/{grA}", None),
 ("editar grupo", "PUT", f"/grupos/{grA}", {"nombre": "Robado"}),
 ("borrar grupo", "DELETE", f"/grupos/{grA}", None),
 ("meter equipo en grupo", "POST", f"/grupos/{grA}/equipos/{eqA}", None),
 ("generar calendario de grupo", "POST", f"/grupos/{grA}/calendario", {"idInstancia": inst}),
 ("generar calendario de campeonato", "POST", f"/campeonatos/{A}/calendario", {"idInstancia": inst}),
 ("ver fases", "GET", f"/campeonatos/{A}/fases", None),
 ("crear fase", "POST", f"/campeonatos/{A}/fases", {"idInstancia": inst, "orden": 2, "formato": "GRUPOS", "equiposClasifican": 2}),
 ("borrar fase", "DELETE", f"/fases/{faseA}", None),
 ("ver jornadas", "GET", f"/campeonatos/{A}/jornadas", None),
 ("crear jornada", "POST", f"/campeonatos/{A}/jornadas", {"numero": 9, "idInstancia": inst, "idGrupo": None}),
 ("ver jornada", "GET", f"/jornadas/{jornadaA}", None),
 ("borrar jornada", "DELETE", f"/jornadas/{jornadaA}", None),
 ("crear partido en jornada ajena", "POST", f"/jornadas/{jornadaA}/partidos", {"idEquipoLocal": eqA, "idEquipoVisitante": equiposA[1], "fecha": D["manana"] + "T15:00", "idEstadio": None, "idArbitro": None}),
 ("ver partido", "GET", f"/partidos/{PA}", None),
 ("editar partido", "PUT", f"/partidos/{PA}", {"idEquipoLocal": eqA, "idEquipoVisitante": equiposA[1], "fecha": D["manana"] + "T15:00", "idEstadio": None, "idArbitro": None}),
 ("borrar partido", "DELETE", f"/partidos/{PA}", None),
 ("iniciar partido", "PUT", f"/partidos/{PA}/iniciar", None),
 ("cerrar partido", "PUT", f"/partidos/{PA}/cerrar", {"observaciones": None}),
 ("reabrir partido", "PUT", f"/partidos/{PA}/reabrir", None),
 ("marcar jugado", "PUT", f"/partidos/{PA}/jugado", {"jugado": True}),
 ("editar planilla", "PUT", f"/partidos/{PA}/planilla", {"observaciones": "x", "desierto": False}),
 ("registrar evento", "POST", f"/partidos/{PA}/eventos", {"idJugador": jugA[0], "tipoEvento": "GOL", "minuto": 9}),
 ("borrar evento", "DELETE", f"/eventos/{evA}", None),
 ("convocar", "POST", f"/partidos/{PA}/alineacion", {"idJugador": jugA[4], "titular": True}),
 ("quitar convocado", "DELETE", f"/alineacion/{alinA}", None),
 ("registrar cambio", "POST", f"/partidos/{PA}/cambios", {"idJugadorSale": jugA[0], "idJugadorEntra": jugA[1], "minuto": 30}),
 ("borrar cambio", "DELETE", f"/cambios/{camA}", None),
 ("ver estadística posiciones", "GET", f"/campeonatos/{A}/estadisticas/posiciones", None),
 ("ver goleadores", "GET", f"/campeonatos/{A}/estadisticas/goleadores", None),
 ("ver tarjetas", "GET", f"/campeonatos/{A}/estadisticas/tarjetas", None),
 ("ver suspensiones", "GET", f"/campeonatos/{A}/estadisticas/suspensiones", None),
 ("crear suspensión", "POST", f"/campeonatos/{A}/estadisticas/suspensiones", {"idJugador": jugA[0], "motivo": "x", "partidosSancion": 1}),
 ("borrar suspensión", "DELETE", f"/campeonatos/{A}/estadisticas/suspensiones/{sancA}", None),
 ("ver vocales", "GET", f"/campeonatos/{A}/vocales", None),
 ("crear invitación", "POST", f"/campeonatos/{A}/vocales/invitaciones", {"tipo": "Titular"}),
 ("revocar invitación", "DELETE", f"/campeonatos/{A}/vocales/invitaciones/{invA}", None),
 ("su partido con equipos ajenos", "POST", f"/jornadas/{jornadaB}/partidos", {"idEquipoLocal": eqA, "idEquipoVisitante": equiposA[1], "fecha": D["manana"] + "T16:00", "idEstadio": None, "idArbitro": None}),
 ("su partido con estadio y árbitro ajenos", "POST", f"/jornadas/{jornadaB}/partidos", {"idEquipoLocal": eqB, "idEquipoVisitante": eqB + 1, "fecha": D["manana"] + "T17:00", "idEstadio": estA, "idArbitro": arbA}),
 ("su campeonato con equipo ajeno", "POST", f"/campeonatos/{B}/equipos/{eqA}", None),
 ("convocar jugador ajeno en su partido", "POST", f"/partidos/{D['hoyB']}/alineacion", {"idJugador": jugA[5], "titular": True}),
]
for nombre, m, ruta, cuerpo in ataques:
    s, r, txt = llamar(m, ruta, cuerpo, o2)
    # Una consulta puede responder 200 si viene vacía: lo que importa es que no muestre nada ajeno.
    fuga = any(t in txt for t in ["Senior A", "Grupo Secreto", "Estadio Secreto", "SecretoOrg1"])
    bien = (400 <= s < 500) or (m == "GET" and s == 200 and not fuga)
    esperar(f"org2 no puede {nombre} ({m} {ruta} → {s})", bien, txt[:160])
    if s >= 500: avisos.append(f"{nombre}: {s}")

# ── Listados: nada del organizador 1 aparece al organizador 2 ──
for ruta in ["/campeonatos", "/equipos", "/jugadores", "/estadios", "/arbitros", "/catalogos/estadios", "/dashboard"]:
    s, r, txt = llamar("GET", ruta, token=o2)
    fuga = [t for t in ["Senior A", "Estadio Secreto Org1", "SecretoOrg1"] if t in txt]
    esperar(f"listado {ruta} de org2 no muestra datos de org1", s == 200 and not fuga, f"{s} {fuga}")

# Crear un jugador con la cédula de uno ajeno no debe revelar ni robar su ficha
ced = llamar("GET", f"/jugadores/{jugA[0]}", token=o1)[1]
cedula = ced.get("cedula") or ced.get("persona", {}).get("cedula")
s, r, txt = llamar("POST", "/jugadores", token=o2, forma={"Nombre": "Copia", "Apellido": "Copia", "Cedula": cedula, "FechaNac": "1990-01-01", "IdPais": pais, "IdEquipo": eqB, "FechaDesde": D["hoy"], "Dorsal": 60, "AutorizacionDatos": "true"})
print(f"INFO jugador con cédula ajena ({cedula}): {s} {txt[:200]}")
nombre_real = (ced.get("nombre") or "") + " " + (ced.get("apellido") or "")
esperar("crear jugador con cédula ajena no muestra el nombre del jugador ajeno", (ced.get("apellido") or "@@") not in txt, txt[:200])

# ── Lo de org1 sigue intacto ──
s, p, _ = llamar("GET", f"/partidos/{PA}", token=o1)
esperar("partido de org1 intacto", s == 200 and len(p["eventos"]) == 1 and len(p["cambios"]) == 1 and not p["jugado"], str(p)[:200])
s, e, _ = llamar("GET", f"/equipos/{eqA}", token=o1)
esperar("equipo de org1 intacto", s == 200 and "Robado" not in json.dumps(e) and len(e["jugadores"]) == 8, str(e)[:200])
s, r, txt = llamar("GET", "/estadios", token=o1)
esperar("estadio de org1 intacto", s == 200 and "Estadio Secreto Org1" in txt and "Robado" not in txt, txt[:120])
for ruta in [f"/arbitros/{arbA}", f"/grupos/{grA}", f"/campeonatos/{A}"]:
    s, r, txt = llamar("GET", ruta, token=o1)
    esperar(f"{ruta} de org1 intacto", s == 200 and "Robado" not in txt, f"{s} {txt[:120]}")

# ── Errores internos ──
s, r, txt = llamar("POST", "/jugadores", token=o1, forma={"Nombre": "X"})
print(f"INFO jugador incompleto: {s} {txt[:200]}")
if avisos: print("AVISOS 5xx:", avisos)
print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
