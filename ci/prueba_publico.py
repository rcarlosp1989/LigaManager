"""Prueba temporal: enlace público del campeonato (sin cuenta)."""
import json, subprocess, sys, urllib.request, urllib.error

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def llamar(metodo, ruta, token=None, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers={"Content-Type": "application/json"})
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

def sql(q):
    return subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-N", "-e", q], check=True, capture_output=True, text=True).stdout.strip()

PART = {"de", "del", "la", "las", "los", "da", "das", "do", "dos", "di", "van", "von", "y", "san", "santa", "mc", "mac"}
def corto(nombre_completo, n, a):
    out = []
    for w in a.split():
        out.append(w)
        if w.lower() not in PART: break
    return f"{n.split()[0]} {' '.join(out)}".strip()

A, B = D["campA"], D["campB"]
login = lambda e: llamar("POST", "/auth/login", cuerpo={"email": e, "password": "clave123"})[1]["token"]
org1, org2 = login("org1@prueba.ec"), login("org2@prueba.ec")

# Datos para comprobar nombres y fotos: un gol en un partido jugado de A, de un jugador con foto.
_, camp = llamar("GET", f"/campeonatos/{A}", org1)
local = sorted(camp["equipos"], key=lambda e: e["nombre"])[0]["idEquipo"]
jug = llamar("GET", f"/equipos/{local}", org1)[1]["jugadores"][0]
sql(f"UPDATE persona p JOIN jugador j ON j.id_persona = p.id_persona SET p.nombre = 'Carlos Andrés', p.apellido = 'De la Cruz Pérez', p.foto_url = '/api/imagenes/0123456789abcdef0123456789abcdef' WHERE j.id_jugador = {jug['idJugador']}")
sql(f"UPDATE partido SET jugado = 1, goles_local = 1, goles_visitante = 0 WHERE id_partido = {D['hoyA']}")
sql(f"INSERT INTO eventopartido (id_partido,id_jugador,tipo_evento,minuto,created_at) VALUES ({D['hoyA']},{jug['idJugador']},'GOL',10,NOW()),({D['hoyA']},{jug['idJugador']},'TARJETA_AMARILLA',20,NOW())")

# ── Organizador ──
s, e = llamar("GET", f"/campeonatos/{A}/enlace-publico", org1)
esperar("sin crear, el campeonato no tiene enlace", s == 200 and e.get("token") is None, f"{s} {e}")
s, e = llamar("POST", f"/campeonatos/{A}/enlace-publico", org1)
tok = (e or {}).get("token") or ""
esperar("org1 crea el enlace (22 caracteres)", s == 200 and len(tok) == 22, f"{s} {e}")
af = (e or {}).get("tokenAficionados") or ""
esperar("al crearlo, se crea también el enlace para aficionados", len(af) == 22 and af != tok, str(e))
s, _ = llamar("POST", f"/campeonatos/{A}/enlace-publico", org2)
esperar("org2 no puede crear el enlace de A", s == 400)
s, _ = llamar("GET", f"/campeonatos/{A}/enlace-publico", org2)
esperar("org2 no puede ver el enlace de A", s == 400)
s, _ = llamar("GET", f"/campeonatos/{A}/enlace-publico")
esperar("sin sesión no se administra el enlace (401)", s == 401)

# ── Público, sin sesión ──
P = f"/publico/{tok}"
s, c = llamar("GET", P)
esperar("el campeonato se ve sin sesión", s == 200 and c["nombre"] == "Senior A" and len(c["equipos"]) == 2, f"{s} {str(c)[:200]}")
esperar("muestra quién organiza", s == 200 and c.get("organizacion") == "org1", str(c)[:200])
s, js = llamar("GET", f"{P}/jornadas")
txt = json.dumps(js, ensure_ascii=False)
esperar("resultados por jornada", s == 200 and len(js) >= 1 and sum(len(j["partidos"]) for j in js) >= 2, f"{s} {txt[:200]}")
esperar("el partido jugado muestra el marcador", any(p["idPartido"] == D["hoyA"] and p["jugado"] and p["golesLocal"] == 1 for j in js for p in j["partidos"]), txt[:300])
esperar("los resultados no traen planillas, alineaciones ni observaciones", all(k not in txt for k in ("eventos", "alineacion", "observaciones", "oficiales", "cedula")), txt[:300])
s, g = llamar("GET", f"{P}/grupos")
esperar("grupos sin sesión", s == 200)
s, pos = llamar("GET", f"{P}/estadisticas/posiciones")
_, posOrg = llamar("GET", f"/campeonatos/{A}/estadisticas/posiciones", org1)
esperar("posiciones: las mismas que ve el organizador", s == 200 and pos == posOrg, f"{str(pos)[:150]} vs {str(posOrg)[:150]}")

completo = f"{'Carlos Andrés'} {'De la Cruz Pérez'}"
for ruta, filas in (("goleadores", lambda d: d), ("tarjetas", lambda d: d["porJugador"]), ("suspensiones", lambda d: d["sanciones"] + d["enRiesgo"])):
    s, d = llamar("GET", f"{P}/estadisticas/{ruta}")
    _, o = llamar("GET", f"/campeonatos/{A}/estadisticas/{ruta}", org1)
    fp = filas(d) if s == 200 else []
    esperar(f"{ruta}: se ve sin sesión, con las mismas filas que el organizador", s == 200 and len(fp) == len(filas(o)), f"{s} {len(fp)} vs {len(filas(o))}")
    esperar(f"{ruta}: sin fotos", all(x.get("fotoUrl") is None for x in fp), str(fp[:2]))
    nuestro = [x for x in fp if x["idJugador"] == jug["idJugador"]]
    if ruta != "suspensiones":
        esperar(f"{ruta}: el jugador aparece como «Carlos De la Cruz»", nuestro and nuestro[0]["jugador"] == "Carlos De la Cruz", str(nuestro))
        org_fila = [x for x in filas(o) if x["idJugador"] == jug["idJugador"]]
        esperar(f"{ruta}: el organizador lo sigue viendo completo y con foto", org_fila and org_fila[0]["jugador"] == completo and org_fila[0].get("fotoUrl"), str(org_fila))

s, _ = llamar("GET", f"{P}/equipos/{local}")
esperar("no hay nóminas públicas (404)", s == 404, str(s))
for metodo in ("POST", "PUT", "DELETE"):
    s, _ = llamar(metodo, f"{P}/estadisticas/suspensiones", cuerpo={"idJugador": 1})
    esperar(f"{metodo} en el enlace público no hace nada (405)", s == 405, str(s))
s, gB = llamar("GET", f"{P}/estadisticas/goleadores")
esperar("el enlace de A no muestra jugadores de B", s == 200 and "Barrial" not in json.dumps(gB, ensure_ascii=False))
s, c2 = llamar("GET", P, org2)
esperar("con sesión de otro organizador también se ve (es público)", s == 200 and c2["nombre"] == "Senior A", str(s))

# ── Enlace para aficionados ──
s, c = llamar("GET", P)
esperar("con el enlace completo: no es de aficionados y trae el código del de aficionados", s == 200 and c.get("aficionados") in (None, False) and c.get("enlaceAficionados") == af, str(c)[-200:])
F = f"/publico/{af}"
s, c = llamar("GET", F)
esperar("aficionados: el campeonato se ve y viene marcado como de aficionados", s == 200 and c["nombre"] == "Senior A" and c.get("aficionados") is True, str(c)[-200:])
esperar("aficionados: no trae el código de ningún otro enlace", s == 200 and tok not in json.dumps(c) and c.get("enlaceAficionados") is None, str(c)[-200:])
for ruta in ("jornadas", "en-vivo", "grupos", "estadisticas/posiciones", "estadisticas/goleadores"):
    s, d = llamar("GET", f"{F}/{ruta}")
    s2, d2 = llamar("GET", f"{P}/{ruta}")
    esperar(f"aficionados: {ruta} igual que el enlace completo", s == 200 and d == d2, f"{s} {str(d)[:120]}")
for ruta in ("tarjetas", "suspensiones"):
    s, _ = llamar("GET", f"{F}/estadisticas/{ruta}")
    esperar(f"aficionados: {ruta} no se ven (404)", s == 404, str(s))
s, _ = llamar("POST", f"/campeonatos/{A}/enlace-aficionados", org2)
esperar("org2 no puede cambiar el enlace de aficionados de A", s == 400, str(s))
s, _ = llamar("POST", f"/campeonatos/{A}/enlace-aficionados")
esperar("sin sesión no se cambia el enlace de aficionados (401)", s == 401, str(s))
s, e4 = llamar("POST", f"/campeonatos/{A}/enlace-aficionados", org1)
af2 = (e4 or {}).get("tokenAficionados") or ""
esperar("cambiar el de aficionados da uno nuevo y no toca el completo", s == 200 and len(af2) == 22 and af2 != af and e4.get("token") == tok, str(e4))
esperar("el de aficionados anterior deja de funcionar (404)", llamar("GET", F)[0] == 404)
esperar("el nuevo de aficionados funciona", llamar("GET", f"/publico/{af2}")[0] == 200)
esperar("el completo sigue funcionando", llamar("GET", P)[0] == 200)
s, _ = llamar("DELETE", f"/campeonatos/{A}/enlace-aficionados", org1)
esperar("org1 desactiva el de aficionados", s == 204, str(s))
esperar("desactivado, el de aficionados ya no se ve (404)", llamar("GET", f"/publico/{af2}/jornadas")[0] == 404)
s, e5 = llamar("GET", f"/campeonatos/{A}/enlace-publico", org1)
esperar("el organizador ve el completo y el de aficionados vacío", s == 200 and e5.get("token") == tok and e5.get("tokenAficionados") is None, str(e5))
s, c = llamar("GET", P)
esperar("el enlace completo sigue, sin código de aficionados", s == 200 and c.get("enlaceAficionados") is None, str(c)[-120:])

s, r = llamar("GET", "/publico/codigoinventado12345678")
esperar("un código inventado no muestra nada (404)", s == 404, f"{s} {r}")
s, r = llamar("GET", "/publico/abc")
esperar("un código con otro largo no muestra nada (404)", s == 404, str(s))
s, r = llamar("GET", f"/publico/{tok}/estadisticas/goleadores".replace(tok, tok[:-1] + ("a" if tok[-1] != "a" else "b")))
esperar("un código casi igual no muestra nada (404)", s == 404, str(s))
s, _ = llamar("GET", f"/publico/{tok.swapcase()}")
esperar("el mismo código con mayúsculas y minúsculas cambiadas no muestra nada (404)", s == 404, str(s))

# ── Cambiar y desactivar ──
s, e2 = llamar("POST", f"/campeonatos/{A}/enlace-publico", org1)
tok2 = (e2 or {}).get("token") or ""
esperar("cambiar el enlace da uno nuevo", s == 200 and len(tok2) == 22 and tok2 != tok, f"{s} {e2}")
esperar("al cambiar el completo, como no había de aficionados, se crea uno", len((e2 or {}).get("tokenAficionados") or "") == 22, str(e2))
af3 = e2["tokenAficionados"]
s, _ = llamar("GET", P)
esperar("el enlace anterior deja de funcionar (404)", s == 404, str(s))
s, _ = llamar("GET", f"/publico/{tok2}")
esperar("el nuevo funciona", s == 200, str(s))
s, _ = llamar("DELETE", f"/campeonatos/{A}/enlace-publico", org1)
esperar("org1 desactiva el enlace", s == 204, str(s))
s, _ = llamar("GET", f"/publico/{tok2}")
esperar("desactivado, ya no se ve (404)", s == 404, str(s))
esperar("desactivar el completo no apaga el de aficionados", llamar("GET", f"/publico/{af3}")[0] == 200)
s, e3 = llamar("GET", f"/campeonatos/{A}/enlace-publico", org1)
esperar("desactivado, el organizador no tiene enlace", s == 200 and e3.get("token") is None, f"{s} {e3}")
s, _ = llamar("GET", f"/publico/{tok2}/jornadas")
esperar("desactivado, tampoco los resultados (404)", s == 404, str(s))

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
