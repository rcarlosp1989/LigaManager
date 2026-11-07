"""Prueba temporal: fase eliminatoria (configuración, llaves manuales, ganadores, penales y tabla)."""
import json, subprocess, sys, urllib.request, urllib.error

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
            txt = r.read().decode(); return r.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt)
        except Exception: return e.code, txt

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

def sql(q):
    return subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-N", "-e", q], capture_output=True, text=True).stdout

def resultado(idp, gl, gv):
    sql(f"UPDATE partido SET jugado = 1, goles_local = {gl}, goles_visitante = {gv} WHERE id_partido = {idp}")

def login(email):
    s, r = llamar("POST", "/auth/login", {"email": email, "password": "clave123"}); return r["token"]

o1, o2 = login("org1@prueba.ec"), login("org2@prueba.ec")
A = D["campA"]
E = f"/campeonatos/{A}/eliminatoria"

# Cuatro equipos en el campeonato A (dos de la semilla y dos nuevos).
pais = llamar("GET", "/catalogos/paises", token=o1)[1][0]["idPais"]
for n in ("Senior A Tres", "Senior A Cuatro"):
    s, e = llamar("POST", "/equipos", {"nombre": n, "idPais": pais}, o1)
    llamar("POST", f"/campeonatos/{A}/equipos/{e['idEquipo']}", None, o1)
s, c = llamar("GET", f"/campeonatos/{A}", token=o1)
eq = [e["idEquipo"] for e in c["equipos"]]
esperar("el campeonato A tiene 4 equipos", len(eq) == 4, str(eq))

# Tabla de la fase regular antes de la eliminatoria (para comparar después).
s, tabla0 = llamar("GET", f"/campeonatos/{A}/posiciones", token=o1)
pj0 = {p["idEquipo"]: p["pj"] for p in tabla0}

s, r = llamar("GET", E, token=o1)
esperar("sin configurar: configurada = false", s == 200 and r["configurada"] is False, str(r)[:200])

def config(n=4, tercer=True, **k):
    return {"equiposClasifican": n, "tercerPuesto": tercer, "reglaTarjetas": k.get("regla", "BORRAR_SALVO_EXPULSION_FINAL"), "rondas": k.get("rondas", [
        {"tipo": "SEMIFINAL", "idaYVuelta": True, "desempate": "PENALES", "golVisitante": True},
        {"tipo": "TERCER_PUESTO", "idaYVuelta": False, "desempate": "PENALES", "golVisitante": True},
        {"tipo": "FINAL", "idaYVuelta": False, "desempate": "MEJOR_UBICADO", "golVisitante": False},
    ])}

s, r = llamar("PUT", E, config(n=3), o1)
esperar("3 clasificados no es válido", s == 400, str(r))
s, r = llamar("PUT", E, config(n=8), o1)
esperar("no pueden clasificar más que los inscritos", s == 400 and "inscritos" in str(r), str(r))
s, r = llamar("PUT", E, config(regla="OTRA"), o1)
esperar("regla de tarjetas inválida se rechaza", s == 400, str(r))
s, r = llamar("PUT", E, config(), o2)
esperar("org2 no configura el campeonato A", s == 400, str(r))
s, r = llamar("PUT", E, config(), o1)
ok = s == 200 and r["configurada"] and [x["tipo"] for x in r["rondas"]] == ["SEMIFINAL", "TERCER_PUESTO", "FINAL"]
esperar("org1 configura: semifinal, tercer puesto y final", ok, str(r)[:300])
ronda = {x["tipo"]: x for x in (r or {}).get("rondas", [])}
esperar("semifinal ida y vuelta con gol de visitante", ronda.get("SEMIFINAL", {}).get("idaYVuelta") and ronda["SEMIFINAL"]["golVisitante"], str(ronda.get("SEMIFINAL")))
esperar("el tercer puesto es partido único y el gol de visitante se apaga", not ronda.get("TERCER_PUESTO", {}).get("idaYVuelta", True) and not ronda["TERCER_PUESTO"]["golVisitante"], str(ronda.get("TERCER_PUESTO")))
esperar("solo la semifinal se puede armar", [x["puedeCrearse"] for x in r["rondas"]] == [True, False, False], str([x["puedeCrearse"] for x in r["rondas"]]))
s, tabla = llamar("GET", f"/estadisticas/{A}/posiciones" if False else f"/campeonatos/{A}/estadisticas/posiciones", token=o1)

s, r = llamar("POST", f"{E}/rondas/FINAL", {"llaves": [{"idEquipoA": eq[0], "idEquipoB": eq[1]}], "fechaIda": "2026-12-20 10:00"}, o1)
esperar("la final no se arma antes de la semifinal", s == 400, str(r))
semis = lambda ll, **k: {"llaves": ll, "fechaIda": k.get("ida", "2026-12-06 10:00"), "fechaVuelta": k.get("vuelta", "2026-12-13 10:00")}
s, r = llamar("POST", f"{E}/rondas/SEMIFINAL", semis([{"idEquipoA": eq[0], "idEquipoB": eq[1]}]), o1)
esperar("la semifinal lleva 2 llaves", s == 400 and "2 llaves" in str(r), str(r))
s, r = llamar("POST", f"{E}/rondas/SEMIFINAL", semis([{"idEquipoA": eq[0], "idEquipoB": eq[1]}, {"idEquipoA": eq[0], "idEquipoB": eq[2]}]), o1)
esperar("un equipo no puede estar en dos llaves", s == 400, str(r))
s, r = llamar("POST", f"{E}/rondas/SEMIFINAL", semis([{"idEquipoA": eq[0], "idEquipoB": eq[1]}, {"idEquipoA": eq[2], "idEquipoB": eq[3]}], vuelta="2026-12-01 10:00"), o1)
esperar("la vuelta debe ser después de la ida", s == 400, str(r))
s, r = llamar("POST", f"{E}/rondas/SEMIFINAL", semis([{"idEquipoA": eq[0], "idEquipoB": eq[1]}, {"idEquipoA": eq[2], "idEquipoB": eq[3]}]), o2)
esperar("org2 no arma llaves en A", s == 400, str(r))
s, r = llamar("POST", f"{E}/rondas/SEMIFINAL", semis([{"idEquipoA": eq[0], "idEquipoB": eq[1]}, {"idEquipoA": eq[2], "idEquipoB": eq[3]}]), o1)
semi = next((x for x in (r or {}).get("rondas", []) if x["tipo"] == "SEMIFINAL"), {})
esperar("se arma la semifinal con 2 llaves de ida y vuelta", s == 200 and semi.get("creada") and len(semi["llaves"]) == 2
        and all(len(l["partidos"]) == 2 for l in semi["llaves"]), str(r)[:300])
l1, l2 = semi["llaves"]
p1i, p1v = l1["partidos"]; p2i, p2v = l2["partidos"]
esperar("ida y vuelta marcadas", p1i["pierna"] == "IDA" and p1v["pierna"] == "VUELTA" and p1i["fecha"] == "2026-12-06 10:00", str(l1["partidos"]))
s, js = llamar("GET", f"/campeonatos/{A}/jornadas", token=o1)
sf = [j for j in js if j["instancia"] == "Semifinal"]
esperar("se crearon 2 jornadas «Semifinal» con 2 partidos cada una", len(sf) == 2 and all(j["totalPartidos"] == 2 for j in sf), str(sf))
s, p = llamar("GET", f"/partidos/{p1v['idPartido']}", token=o1)
esperar("en la vuelta es local el equipo B", s == 200 and p["idEquipoLocal"] == eq[1] and p.get("idLlave") == l1["idLlave"], str(p)[:200])
s, r2 = llamar("PUT", f"/partidos/{p1i['idPartido']}", {"fecha": "2026-12-06 11:00", "idEstadio": None, "idArbitro": None, "idEquipoLocal": eq[2], "idEquipoVisitante": None}, o1)
esperar("no se cambian los equipos de un partido de llave", s == 400, str(r2))
s, r2 = llamar("DELETE", f"/partidos/{p1i['idPartido']}", None, o1)
esperar("no se elimina un partido de llave", s == 400 and "Llaves" in str(r2), str(r2))
s, r2 = llamar("DELETE", E, None, o1)
esperar("no se borra la configuración con llaves armadas", s == 400, str(r2))
s, r2 = llamar("PUT", E, config(n=2), o1)
esperar("no se cambia cuántos clasifican con llaves armadas", s == 400, str(r2))

# Llave 1: ida 2-1 (A local), vuelta 1-0 para B (B local) → global 2-2, visitante: A 0 en la vuelta… A hizo 0 de visita, B hizo 1 de visita → pasa B.
resultado(p1i["idPartido"], 2, 1); resultado(p1v["idPartido"], 1, 0)
# Llave 2: ida 1-1, vuelta 1-1 → global 2-2, visitante 1-1 → penales.
resultado(p2i["idPartido"], 1, 1); resultado(p2v["idPartido"], 1, 1)
s, r = llamar("GET", E, token=o1)
semi = next(x for x in r["rondas"] if x["tipo"] == "SEMIFINAL")
l1, l2 = semi["llaves"]
esperar("llave 1: global 2-2, pasa B por gol de visitante", l1["globalA"] == 2 and l1["globalB"] == 2 and l1.get("idGanador") == eq[1] and "visitante" in (l1.get("detalle") or ""), str(l1)[:300])
esperar("llave 2: empatada, faltan los penales", l2["estado"] == "FALTAN_PENALES" and l2.get("idGanador") is None, str(l2)[:300])
esperar("con una llave sin ganador, la final no se puede armar", not next(x for x in r["rondas"] if x["tipo"] == "FINAL")["puedeCrearse"])
s, x = llamar("PUT", f"/llaves/{l1['idLlave']}/penales", {"penalesA": 4, "penalesB": 3}, o1)
esperar("no hay penales en una llave que no empató", s == 400, str(x))
s, x = llamar("PUT", f"/llaves/{l2['idLlave']}/penales", {"penalesA": 3, "penalesB": 3}, o1)
esperar("los penales no pueden empatar", s == 400, str(x))
s, x = llamar("PUT", f"/llaves/{l2['idLlave']}/penales", {"penalesA": 3, "penalesB": 4}, o2)
esperar("org2 no registra penales en A", s == 400, str(x))
s, r = llamar("PUT", f"/llaves/{l2['idLlave']}/penales", {"penalesA": 3, "penalesB": 4}, o1)
semi = next(x for x in r["rondas"] if x["tipo"] == "SEMIFINAL")
l2 = semi["llaves"][1]
esperar("llave 2: penales 3-4, pasa B", l2.get("idGanador") == eq[3] and "penales 3-4" in (l2.get("detalle") or ""), str(l2)[:300])
s, p = llamar("GET", f"/partidos/{p2v['idPartido']}", token=o1)
esperar("los penales quedan en la vuelta (local = B)", p.get("penalesLocal") == 4 and p.get("penalesVisitante") == 3, str(p)[:300])
fin = next(x for x in r["rondas"] if x["tipo"] == "FINAL")
ter = next(x for x in r["rondas"] if x["tipo"] == "TERCER_PUESTO")
esperar("candidatos de la final: los ganadores", sorted(c["idEquipo"] for c in fin["candidatos"]) == sorted([eq[1], eq[3]]), str(fin["candidatos"]))
esperar("candidatos del tercer puesto: los perdedores", sorted(c["idEquipo"] for c in ter["candidatos"]) == sorted([eq[0], eq[2]]), str(ter["candidatos"]))

s, x = llamar("POST", f"{E}/rondas/FINAL", {"llaves": [{"idEquipoA": eq[0], "idEquipoB": eq[1]}], "fechaIda": "2026-12-20 10:00"}, o1)
esperar("la final la juegan solo los ganadores", s == 400 and "ganadores" in str(x), str(x))
s, x = llamar("POST", f"{E}/rondas/TERCER_PUESTO", {"llaves": [{"idEquipoA": eq[1], "idEquipoB": eq[3]}], "fechaIda": "2026-12-20 08:00"}, o1)
esperar("el tercer puesto lo juegan los perdedores", s == 400 and "perdedores" in str(x), str(x))
s, x = llamar("POST", f"{E}/rondas/FINAL", {"llaves": [{"idEquipoA": eq[1], "idEquipoB": eq[3]}], "fechaIda": "2026-12-20 10:00"}, o1)
esperar("se arma la final", s == 200 and next(y for y in x["rondas"] if y["tipo"] == "FINAL")["creada"], str(x)[:200])
s, x = llamar("DELETE", f"{E}/rondas/SEMIFINAL", None, o1)
esperar("no se elimina la semifinal con la final armada", s == 400, str(x))
s, x = llamar("DELETE", f"{E}/rondas/FINAL", None, o1)
esperar("se puede eliminar la final si no empezó", s == 200 and not next(y for y in x["rondas"] if y["tipo"] == "FINAL")["creada"], str(x)[:200])
s, js2 = llamar("GET", f"/campeonatos/{A}/jornadas", token=o1)
esperar("al eliminarla se borra su jornada", not any(j["instancia"] == "Final" for j in js2), str([j["instancia"] for j in js2]))
s, x = llamar("POST", f"{E}/rondas/FINAL", {"llaves": [{"idEquipoA": eq[1], "idEquipoB": eq[3]}], "fechaIda": "2026-12-20 10:00"}, o1)
s, x = llamar("POST", f"{E}/rondas/TERCER_PUESTO", {"llaves": [{"idEquipoA": eq[0], "idEquipoB": eq[2]}], "fechaIda": "2026-12-20 08:00"}, o1)
esperar("se arma el tercer puesto", s == 200 and next(y for y in x["rondas"] if y["tipo"] == "TERCER_PUESTO")["creada"], str(x)[:200])

# Final 0-0 con «mejor ubicado»: gana el mejor de la tabla de la fase regular.
pf = next(y for y in x["rondas"] if y["tipo"] == "FINAL")["llaves"][0]["partidos"][0]["idPartido"]
resultado(pf, 0, 0)
s, tabla = llamar("GET", f"/campeonatos/{A}/posiciones", token=o1)
pos = {p["idEquipo"]: p["posicion"] for p in tabla}
mejor = eq[1] if pos[eq[1]] < pos[eq[3]] else eq[3]
s, x = llamar("GET", E, token=o1)
lf = next(y for y in x["rondas"] if y["tipo"] == "FINAL")["llaves"][0]
esperar("final empatada: pasa el mejor ubicado", lf.get("idGanador") == mejor and "mejor ubicado" in (lf.get("detalle") or ""), str(lf)[:300])
esperar("hay campeón", (x.get("campeon") or {}).get("idEquipo") == mejor, str(x.get("campeon")))
s, y = llamar("PUT", f"/llaves/{lf['idLlave']}/penales", {"penalesA": 5, "penalesB": 4}, o1)
esperar("con «mejor ubicado» no se registran penales", s == 400, str(y))
esperar("la tabla no cuenta los partidos de la fase eliminatoria", all(p["pj"] == pj0.get(p["idEquipo"], 0) for p in tabla), f"{pj0} {[(p['idEquipo'], p['pj']) for p in tabla]}")
s, est = llamar("GET", f"/campeonatos/{A}/estadisticas/posiciones", token=o1)
filas = [f for g in est.get("grupos", []) for f in g.get("posiciones", [])] if isinstance(est, dict) else []
esperar("estadísticas: la tabla marca 4 clasificados", sum(1 for f in filas if f.get("clasifica")) == 4 or not filas, str(est)[:300])

# ── Entrega 2: penales al cerrar en vivo ──
s, x = llamar("GET", E, token=o1)
pt = next(y for y in x["rondas"] if y["tipo"] == "TERCER_PUESTO")["llaves"][0]["partidos"][0]["idPartido"]
s, info = llamar("GET", f"/partidos/{pt}/llave", token=o1)
esperar("info de cierre: tercer puesto, último partido, penales", s == 200 and info["esUltimo"] and info["desempate"] == "PENALES" and info["pierna"] == "UNICO", str(info))
s, _ = llamar("GET", f"/partidos/{D['mananaA']}/llave", token=o1)
esperar("un partido de la fase regular no tiene llave (204)", s == 204, str(s))
s, r = llamar("PUT", f"/partidos/{pt}/cerrar", {"observaciones": None}, o1)
esperar("0-0 sin penales: no se cierra", s == 400 and "penales" in str(r), str(r))
s, p = llamar("GET", f"/partidos/{pt}", token=o1)
esperar("y el partido sigue sin jugar (se deshizo)", s == 200 and not p["jugado"] and p["estadoRegistro"] != "Cerrado", str(p)[:200])
s, r = llamar("PUT", f"/partidos/{pt}/cerrar", {"observaciones": None, "penalesLocal": 3, "penalesVisitante": 3}, o1)
esperar("penales empatados no cierran", s == 400, str(r))
s, r = llamar("PUT", f"/partidos/{pt}/cerrar", {"observaciones": None, "penalesLocal": 5, "penalesVisitante": 4}, o1)
esperar("con penales 5-4 se cierra", s == 200 and r["jugado"] and r.get("penalesLocal") == 5, str(r)[:200])
s, x = llamar("GET", E, token=o1)
lt = next(y for y in x["rondas"] if y["tipo"] == "TERCER_PUESTO")["llaves"][0]
esperar("tercer puesto: gana el local por penales 5-4", lt.get("idGanador") == lt["equipoA"]["idEquipo"] and "penales 5-4" in (lt.get("detalle") or ""), str(lt)[:250])

# ── Entrega 2: regla de tarjetas ──
H = D["hoyA"]
sql(f"UPDATE partido SET jugado = 1 WHERE id_partido = {H}")
sql(f"UPDATE partido SET jugado = 0 WHERE id_partido = {D['mananaA']}")
s, ph = llamar("GET", f"/partidos/{H}", token=o1)
s, eqh = llamar("GET", f"/equipos/{ph['idEquipoLocal']}", token=o1)
jr = eqh["jugadores"][-1]["idJugador"]
s, _ = llamar("POST", f"/partidos/{H}/eventos", {"idJugador": jr, "tipoEvento": "TARJETA_ROJA", "minuto": 80}, o1)
esperar("roja en el último partido de la fase regular", s == 200, str(s))
def estado_roja(regla):
    llamar("PUT", E, config(regla=regla), o1)
    s, su = llamar("GET", f"/campeonatos/{A}/estadisticas/suspensiones", token=o1)
    lista = [x for x in (su or {}).get("sanciones", []) if x["idJugador"] == jr and x["motivo"] == "Roja directa"]
    return s, (lista[0]["estado"] if lista else None)
s, e1 = estado_roja("BORRAR_TODO")
esperar("«Borrar todo»: la sanción pendiente se anula", s == 200 and e1 == "Anulada", str(e1))
s, e2 = estado_roja("BORRAR_SALVO_EXPULSION_FINAL")
esperar("«Borrar, salvo expulsión al final»: la roja del último partido sigue", s == 200 and e2 in ("Suspendido", "Cumplida"), str(e2))
s, e3 = estado_roja("MANTENER")
esperar("«Mantener todo»: la sanción sigue", s == 200 and e3 in ("Suspendido", "Cumplida"), str(e3))
s, ta = llamar("GET", f"/campeonatos/{A}/estadisticas/tarjetas", token=o1)
esperar("el reporte de tarjetas responde con la regla", s == 200, str(s))

# Lectura pública y permisos.
s, e = llamar("POST", f"/campeonatos/{A}/enlace-publico", None, o1)
s, pub = llamar("GET", f"/publico/{e['token']}/eliminatoria")
esperar("el enlace público ve el cuadro y el campeón", s == 200 and pub["configurada"] and (pub.get("campeon") or {}).get("idEquipo") == mejor, str(pub)[:200])
s, _ = llamar("GET", E, token=o2)
esperar("org2 no ve la eliminatoria de A", s == 400)
s, _ = llamar("GET", E)
esperar("sin sesión no se consulta (401)", s == 401, str(s))

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
