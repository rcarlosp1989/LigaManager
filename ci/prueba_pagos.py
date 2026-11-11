"""Prueba temporal: pagos del campeonato (valores, cobros automáticos, cobros manuales, abonos, dirigente)."""
import json, subprocess, sys, urllib.request, urllib.error
from collections import defaultdict

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
    r = subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-N", "-e", q], capture_output=True, text=True)
    if r.returncode != 0: print("SQL ERROR " + r.stderr.strip()[:300])
    return r.stdout

def filas(q): return [l.split("\t") for l in sql(q).strip().splitlines() if l.strip()]

def login(email, clave="clave123"):
    s, r = llamar("POST", "/auth/login", {"email": email, "password": clave}); return r["token"] if s == 200 else None

o1, o2 = login("org1@prueba.ec"), login("org2@prueba.ec")
B = D["campB"]
P = f"/campeonatos/{B}/pagos"
_, campB = llamar("GET", f"/campeonatos/{B}", token=o2)
eq = sorted(campB["equipos"], key=lambda e: e["nombre"])
local, visita = eq[0]["idEquipo"], eq[1]["idEquipo"]
_, campA = llamar("GET", f"/campeonatos/{D['campA']}", token=o1)
equipoA = campA["equipos"][0]["idEquipo"]

# ── El trigger de producción sigue: un pago con equipo Y jugador se rechaza ──
conc = filas("SELECT codigo, id_concepto FROM conceptopago WHERE codigo IS NOT NULL")
esperar("el script crea los 8 conceptos", len(conc) == 8, str(conc))
r = subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-e",
    f"INSERT INTO pago (id_campeonato, id_equipo, id_jugador, id_concepto, monto, fecha) SELECT {B}, {local}, MIN(id_jugador), {conc[0][1]}, 1, CURDATE() FROM jugador"], capture_output=True, text=True)
esperar("el trigger rechaza equipo y jugador juntos", r.returncode != 0 and "destino exclusivo" in r.stderr, r.stderr[:200])

# ── Sin valores ──
s, r = llamar("GET", P, token=o2)
esperar("sin valores: configurados = false y nada cobrado", s == 200 and r["valores"]["configurados"] is False and r["total"] == 0, str(r)[:300])
s, r = llamar("GET", P, token=o1)
esperar("org1 no ve los pagos de B", s == 400, str(r)[:200])

# ── Preparar datos: un partido jugado con tarjetas y un refuerzo ──
hoy = D["hoy"]
sql(f"UPDATE partido SET jugado = 1, desierto = 0, goles_local = 1, goles_visitante = 0 WHERE id_partido = {D['hoyB']}")
jl = [int(x[0]) for x in filas(f"SELECT id_jugador FROM jugador_equipo WHERE id_equipo = {local} ORDER BY id_jugador")]
jv = [int(x[0]) for x in filas(f"SELECT id_jugador FROM jugador_equipo WHERE id_equipo = {visita} ORDER BY id_jugador")]
sql(f"""INSERT INTO eventopartido (id_partido, id_jugador, tipo_evento, minuto, created_at) VALUES
  ({D['hoyB']}, {jl[0]}, 'TARJETA_AMARILLA', 10, NOW()),
  ({D['hoyB']}, {jl[1]}, 'TARJETA_AMARILLA', 20, NOW()), ({D['hoyB']}, {jl[1]}, 'TARJETA_AMARILLA', 30, NOW()),
  ({D['hoyB']}, {jv[0]}, 'TARJETA_ROJA', 40, NOW())""")
# Refuerzo: un jugador de A pasa al equipo local de B hoy.
ref = int(filas(f"SELECT MIN(id_jugador) FROM jugador_equipo WHERE id_equipo = {equipoA}")[0][0])
sql(f"INSERT INTO jugador_equipo (id_jugador, id_equipo, dorsal, fecha_desde) VALUES ({ref}, {local}, 77, '{hoy}')")

# ── Valores ──
v = {"inscripcion": 150, "refuerzo": 25, "apelacion": 20, "arbitraje": 10, "amarilla": 2, "roja": 10}
s, r = llamar("PUT", P + "/valores", {**v, "amarilla": -1, "inicioSegundaEtapa": None}, o2)
esperar("valor negativo se rechaza", s == 400, str(r))
s, r = llamar("PUT", P + "/valores", {**v, "amarilla": 2.555, "inicioSegundaEtapa": None}, o2)
esperar("más de dos decimales se rechaza", s == 400, str(r))
s, r = llamar("PUT", P + "/valores", {**v, "inicioSegundaEtapa": hoy}, o1)
esperar("org1 no cambia los valores de B", s == 400, str(r))
s, r = llamar("PUT", P + "/valores", {**v, "inicioSegundaEtapa": hoy}, o2)
esperar("org2 guarda los valores", s == 200 and r["configurados"] and r["inicioSegundaEtapa"] == hoy and r["roja"] == 10, str(r))

# ── Esperado, calculado desde la base con las mismas reglas ──
def esperado():
    tot = defaultdict(float)
    for (e,) in filas(f"SELECT id_equipo FROM campeonato_equipo WHERE id_campeonato = {B}"):
        tot[int(e)] += 150
    for (e,) in filas(f"""SELECT je.id_equipo FROM jugador_equipo je JOIN campeonato_equipo ce ON ce.id_equipo = je.id_equipo AND ce.id_campeonato = {B}
                          JOIN campeonato c ON c.id_campeonato = {B} WHERE je.fecha_desde >= '{hoy}' AND je.fecha_desde <= c.fecha_fin"""):
        tot[int(e)] += 25
    for l, vi in filas(f"SELECT p.id_equipo_local, p.id_equipo_visitante FROM partido p JOIN jornada j ON j.id_jornada = p.id_jornada WHERE j.id_campeonato = {B} AND p.jugado = 1 AND p.desierto = 0"):
        tot[int(l)] += 10; tot[int(vi)] += 10
    ev = filas(f"""SELECT e.id_partido, e.id_jugador, e.tipo_evento, p.id_equipo_local, p.id_equipo_visitante FROM eventopartido e
                   JOIN partido p ON p.id_partido = e.id_partido JOIN jornada j ON j.id_jornada = p.id_jornada
                   WHERE j.id_campeonato = {B} AND p.jugado = 1 AND e.tipo_evento IN ('TARJETA_AMARILLA','TARJETA_ROJA')""")
    grupos = defaultdict(list)
    for p, j, t, l, vi in ev: grupos[(p, j, l, vi)].append(t)
    for (p, j, l, vi), tipos in grupos.items():
        eqs = {int(x[0]) for x in filas(f"SELECT id_equipo FROM jugador_equipo WHERE id_jugador = {j} AND id_equipo IN ({l},{vi})")}
        if not eqs: continue
        e = int(l) if int(l) in eqs else int(vi)
        a, rj = tipos.count("TARJETA_AMARILLA"), tipos.count("TARJETA_ROJA")
        tot[e] += 10 if (rj == 0 and a >= 2) else 2 * a + 10 * rj
    return tot

s, r = llamar("GET", P, token=o2)
exp = esperado()
por_equipo = {e["idEquipo"]: e for e in (r or {}).get("equipos", [])}
esperar("resumen: total por equipo = esperado", s == 200 and all(abs(por_equipo[e]["total"] - exp[e]) < 0.001 for e in exp), f"{ {e: por_equipo.get(e, {}).get('total') for e in exp} } vs {dict(exp)}")
nref = int(sql(f"SELECT COUNT(*) FROM jugador_equipo WHERE id_equipo = {local} AND fecha_desde >= '{hoy}'").strip())
esperar("resumen: categorías de local (inscripción 150, 25 por refuerzo)", nref >= 1 and por_equipo[local]["inscripcion"] == 150 and por_equipo[local]["refuerzos"] == 25 * nref, f"{nref} refuerzos · {por_equipo[local]}")
esperar("resumen: arbitraje 10 al visitante por el partido jugado", por_equipo[visita]["arbitraje"] >= 10, str(por_equipo[visita]))
n1 = int(sql(f"SELECT COUNT(*) FROM pago WHERE id_campeonato = {B}").strip())
llamar("GET", P, token=o2)
n2 = int(sql(f"SELECT COUNT(*) FROM pago WHERE id_campeonato = {B}").strip())
esperar("consultar de nuevo no duplica cobros", n1 == n2 and n1 > 0, f"{n1} → {n2}")
esperar("todos los cobros van a nombre del equipo (sin jugador)", sql(f"SELECT COUNT(*) FROM pago WHERE id_campeonato = {B} AND (id_equipo IS NULL OR id_jugador IS NOT NULL)").strip() == "0")

s, c = llamar("GET", f"{P}/equipos/{local}", token=o2)
textos = [x.get("descripcion") or "" for x in c["cobros"]]
n2 = filas(f"SELECT p.nombre FROM persona p JOIN jugador j ON j.id_persona = p.id_persona WHERE j.id_jugador = {jl[1]}")[0][0]
de2 = [x for x in c["cobros"] if f"· {n2} " in (x.get("descripcion") or "")]
esperar("doble amarilla: una sola roja «doble amarilla»", [(x["concepto"], "doble amarilla" in x.get("descripcion")) for x in de2] == [("ROJA", True)], str([(x["concepto"], x.get("descripcion")) for x in de2]))
esperar("refuerzo con nombre e «inscrito el»", any(x["concepto"] == "REFUERZO" and "inscrito el" in (x.get("descripcion") or "") for x in c["cobros"]), str(textos))
esperar("arbitraje con «Jornada N · vs»", any(x["concepto"] == "ARBITRAJE" and " · vs " in (x.get("descripcion") or "") for x in c["cobros"]), str(textos))
esperar("cobros ordenados por fecha", [x["fecha"] for x in c["cobros"]] == sorted(x["fecha"] for x in c["cobros"]))

# Cambiar los valores no altera lo generado.
s, _ = llamar("PUT", P + "/valores", {**v, "arbitraje": 99, "inicioSegundaEtapa": hoy}, o2)
s, r2 = llamar("GET", P, token=o2)
esperar("cambiar el valor del arbitraje no altera los cobros ya generados", {e["idEquipo"]: e["total"] for e in r2["equipos"]} == {e["idEquipo"]: e["total"] for e in r["equipos"]})
llamar("PUT", P + "/valores", {**v, "inicioSegundaEtapa": hoy}, o2)

# ── Cobros manuales ──
s, r = llamar("POST", P + "/cobros", {"idEquipo": local, "concepto": "MULTA", "monto": 30, "fecha": hoy, "descripcion": ""}, o2)
esperar("multa sin motivo se rechaza", s == 400 and "motivo" in str(r), str(r))
s, r = llamar("POST", P + "/cobros", {"idEquipo": equipoA, "concepto": "MULTA", "monto": 30, "fecha": hoy, "descripcion": "x"}, o2)
esperar("cobro a un equipo que no está en el campeonato se rechaza", s == 400, str(r))
s, r = llamar("POST", P + "/cobros", {"idEquipo": local, "concepto": "INSCRIPCION", "monto": 30, "fecha": hoy, "descripcion": "x"}, o2)
esperar("no se crea a mano un cobro automático", s == 400, str(r))
s, r = llamar("POST", P + "/cobros", {"idEquipo": local, "concepto": "MULTA", "monto": 30, "fecha": hoy, "descripcion": "Indisciplina de la barra"}, o1)
esperar("org1 no cobra en B", s == 400, str(r))
s, c = llamar("POST", P + "/cobros", {"idEquipo": local, "concepto": "MULTA", "monto": 30, "fecha": hoy, "descripcion": "Indisciplina de la barra"}, o2)
multa = next((x for x in (c or {}).get("cobros", []) if x["concepto"] == "MULTA"), None)
esperar("org2 registra una multa", s == 200 and multa and multa["monto"] == 30 and not multa["automatico"], str(c)[:300])
s, c = llamar("POST", P + "/cobros", {"idEquipo": local, "concepto": "APELACION", "monto": None, "fecha": hoy, "descripcion": None}, o2)
apel = next((x for x in (c or {}).get("cobros", []) if x["concepto"] == "APELACION"), None)
esperar("la apelación sin monto toma el valor del campeonato (20)", s == 200 and apel and apel["monto"] == 20, str(c)[:300])

# ── Abonos ──
saldo = c["saldo"]
s, r = llamar("POST", f"{P}/equipos/{local}/abonos", {"monto": saldo + 1, "fecha": hoy, "metodo": "EFECTIVO"}, o2)
esperar("abono mayor al saldo se rechaza", s == 400 and "saldo" in str(r), str(r))
s, r = llamar("POST", f"{P}/equipos/{local}/abonos", {"monto": 10, "fecha": hoy, "metodo": "CHEQUE"}, o2)
esperar("método inválido se rechaza", s == 400, str(r))
s, r = llamar("POST", f"{P}/equipos/{local}/abonos", {"monto": 10, "fecha": hoy, "metodo": "EFECTIVO"}, o1)
esperar("org1 no abona en B", s == 400, str(r))
s, c = llamar("POST", f"{P}/equipos/{local}/abonos", {"monto": 160, "fecha": hoy, "metodo": "TRANSFERENCIA", "referencia": "TRX-123"}, o2)
ins = next(x for x in c["cobros"] if x["concepto"] == "INSCRIPCION")
segundo = [x for x in c["cobros"] if x["abonado"] > 0 and x["concepto"] != "INSCRIPCION"]
esperar("el abono se reparte: inscripción pagada y $10 al siguiente", s == 200 and ins["saldo"] == 0 and len(segundo) == 1 and segundo[0]["abonado"] == 10, str([(x["concepto"], x["abonado"]) for x in c["cobros"]]))
lote = c["abonos"][0] if c["abonos"] else {}
esperar("un abono repartido es un solo registro (lote) con 2 cobros", len(c["abonos"]) == 1 and lote["monto"] == 160 and len(lote["cobros"]) == 2 and lote["metodo"] == "TRANSFERENCIA" and lote["referencia"] == "TRX-123", str(c["abonos"]))
esperar("saldo baja en 160", abs(c["saldo"] - (saldo - 160)) < 0.001, f"{saldo} → {c['saldo']}")
s, c = llamar("POST", f"{P}/equipos/{local}/abonos", {"monto": 20, "fecha": hoy, "metodo": "EFECTIVO", "idPago": apel["idPago"]}, o2)
apel2 = next(x for x in c["cobros"] if x["idPago"] == apel["idPago"])
esperar("abono a un cobro puntual (apelación)", s == 200 and apel2["saldo"] == 0, str(apel2))
s, r = llamar("POST", f"{P}/equipos/{local}/abonos", {"monto": 1, "fecha": hoy, "metodo": "EFECTIVO", "idPago": apel["idPago"]}, o2)
esperar("no se abona a un cobro ya pagado", s == 400, str(r))

# ── Eliminar ──
s, r = llamar("DELETE", f"{P}/cobros/{apel['idPago']}", None, o2)
esperar("no se elimina un cobro con abonos", s == 400 and "abonos" in str(r), str(r))
s, r = llamar("DELETE", f"{P}/cobros/{ins['idPago']}", None, o2)
esperar("no se elimina un cobro automático", s == 400, str(r))
s, c = llamar("DELETE", f"{P}/cobros/{multa['idPago']}", None, o2)
esperar("se elimina una multa sin abonos", s == 200 and not any(x["idPago"] == multa["idPago"] for x in c["cobros"]), str(r)[:200])
s, c = llamar("DELETE", f"{P}/abonos/{lote['lote']}", None, o2)
esperar("eliminar el abono devuelve los saldos", s == 200 and next(x for x in c["cobros"] if x["concepto"] == "INSCRIPCION")["saldo"] == 150 and len(c["abonos"]) == 1, str(c["abonos"]))

# ── Origen que desaparece ──
amarilla = next(x for x in c["cobros"] if x["concepto"] == "AMARILLA")
sql(f"DELETE FROM eventopartido WHERE id_partido = {D['hoyB']} AND id_jugador = {jl[0]} AND tipo_evento = 'TARJETA_AMARILLA'")
s, c = llamar("GET", f"{P}/equipos/{local}", token=o2)
esperar("se borra la tarjeta → su cobro (sin abonos) desaparece", not any(x["idPago"] == amarilla["idPago"] for x in c["cobros"]), str([(x["concepto"], x.get("descripcion")) for x in c["cobros"]]))
# Un abono a la roja de la visita y luego el partido vuelve a pendiente: el arbitraje se va, la roja con abono queda.
_, cv = llamar("GET", f"{P}/equipos/{visita}", token=o2)
roja = next(x for x in cv["cobros"] if x["concepto"] == "ROJA")
arb0 = sum(1 for x in cv["cobros"] if x["concepto"] == "ARBITRAJE")
llamar("POST", f"{P}/equipos/{visita}/abonos", {"monto": 5, "fecha": hoy, "metodo": "EFECTIVO", "idPago": roja["idPago"]}, o2)
sql(f"UPDATE partido SET jugado = 0 WHERE id_partido = {D['hoyB']}")
_, cv = llamar("GET", f"{P}/equipos/{visita}", token=o2)
esperar("partido pendiente: su arbitraje sin abonos desaparece", sum(1 for x in cv["cobros"] if x["concepto"] == "ARBITRAJE") == arb0 - 1, f"{arb0} → {[x['descripcion'] for x in cv['cobros'] if x['concepto'] == 'ARBITRAJE']}")
esperar("partido pendiente: la roja con abono se conserva", any(x["idPago"] == roja["idPago"] for x in cv["cobros"]), str(cv["cobros"])[:300])
sql(f"UPDATE partido SET jugado = 1 WHERE id_partido = {D['hoyB']}")

# ── Dirigente ──
s, inv = llamar("POST", f"/campeonatos/{B}/dirigentes/invitaciones", {"idEquipo": local}, o2)
s, ses = llamar("POST", f"/invitaciones-dirigente/{inv['codigo']}/aceptar", {"nombre": "Dirigente Pagos", "email": "dir.pagos@prueba.ec", "password": "clave123"})
dp = ses["token"] if s == 200 else login("dir.pagos@prueba.ec")
esperar("dirigente de B Local inicia sesión", dp is not None, str(ses)[:200])
s, cd = llamar("GET", f"/dirigente/campeonatos/{B}/pagos", token=dp)
_, co = llamar("GET", f"{P}/equipos/{local}", token=o2)
esperar("el dirigente ve la cuenta de su equipo", s == 200 and cd["idEquipo"] == local and cd["total"] == co["total"] and len(cd["cobros"]) == len(co["cobros"]), str(cd)[:300])
s, r = llamar("GET", f"/dirigente/campeonatos/{D['campA']}/pagos", token=dp)
esperar("el dirigente no ve pagos de otro campeonato", s == 404, str(r)[:200])
s, r = llamar("GET", P, token=dp)
esperar("el dirigente no ve el resumen de todos los equipos", s in (400, 403), f"{s} {str(r)[:150]}")
s, r = llamar("GET", f"{P}/equipos/{visita}", token=dp)
esperar("el dirigente no ve la cuenta de otro equipo", s in (400, 403), f"{s} {str(r)[:150]}")
s, r = llamar("POST", f"{P}/equipos/{local}/abonos", {"monto": 1, "fecha": hoy, "metodo": "EFECTIVO"}, dp)
esperar("el dirigente no registra abonos", s in (400, 403), f"{s}")
s, r = llamar("GET", f"/dirigente/campeonatos/{B}/pagos", token=o2)
esperar("el organizador no usa la ruta del dirigente", s == 403, f"{s}")

# ── Eliminar un equipo con cobros ──
pais = llamar("GET", "/catalogos/paises", token=o2)[1][0]["idPais"]
s, nuevo = llamar("POST", "/equipos", {"nombre": "Barrial B Pagos", "idPais": pais}, o2)
llamar("POST", f"/campeonatos/{B}/equipos/{nuevo['idEquipo']}", None, o2)
llamar("GET", P, token=o2)
esperar("el equipo nuevo recibe su inscripción", sql(f"SELECT COUNT(*) FROM pago WHERE id_equipo = {nuevo['idEquipo']}").strip() == "1")
s, r = llamar("DELETE", f"/campeonatos/{B}/equipos/{nuevo['idEquipo']}", None, o2)
llamar("GET", P, token=o2)
esperar("al sacarlo del campeonato su inscripción sin abonos desaparece", sql(f"SELECT COUNT(*) FROM pago WHERE id_equipo = {nuevo['idEquipo']}").strip() == "0", f"{s} {r}")
s, r = llamar("DELETE", f"/equipos/{nuevo['idEquipo']}", None, o2)
esperar("y el equipo se puede eliminar", s in (200, 204), f"{s} {r}")

print(f"\n{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
