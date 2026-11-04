"""Prueba temporal: partidos sin árbitro (designación opcional al crear y al editar)."""
import json, sys, random, urllib.request, urllib.error
BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []
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

tok = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})[1]["token"]
tok2 = llamar("POST", "/auth/login", cuerpo={"email": "org2@prueba.ec", "password": "clave123"})[1]["token"]
camp = llamar("GET", f"/campeonatos/{D['campA']}", tok)[1]
cargos = llamar("GET", f"/catalogos/cargos-oficiales?modalidadId={camp['idModalidad']}", tok)[1]
esperar("hay un cargo obligatorio en la modalidad (como en producción)", any(c.get("obligatorio") for c in cargos), str(cargos))
pais = llamar("GET", "/catalogos/paises", tok)[1][0]["idPais"]
eqs = [e["idEquipo"] for e in camp["equipos"]]
inst = llamar("GET", "/catalogos/instancias", tok)[1][0]["idInstancia"]
s, j = llamar("POST", f"/campeonatos/{D['campA']}/jornadas", tok, {"numero": random.randint(10000, 99999), "idInstancia": inst, "idGrupo": None})
jornada = j["idJornada"]
est = llamar("POST", "/estadios", tok, {"nombre": "Estadio Sin Juez", "idPais": pais, "idCanton": None})[1]["idEstadio"]
arbs = [llamar("POST", "/arbitros", tok, {"nombre": f"Juez{i}", "apellido": "Tarde", "cedula": "", "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None})[1]["idArbitro"] for i in range(2)]
arb_ajeno = llamar("POST", "/arbitros", tok2, {"nombre": "Ajeno", "apellido": "Otro", "cedula": "", "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None})[1]["idArbitro"]
central = next(c["idCargo"] for c in cargos if c.get("obligatorio"))
otro = next((c["idCargo"] for c in cargos if c["idCargo"] != central), None)

def partido_de(idp):
    jd = llamar("GET", f"/jornadas/{jornada}", tok)[1]
    return next(x for x in jd["partidos"] if x["idPartido"] == idp)

# Crear sin árbitro ni designación (lo que manda la pantalla: idArbitro null, oficiales []).
base = {"idEquipoLocal": eqs[0], "idEquipoVisitante": eqs[1], "fecha": "2026-12-05T10:00", "idEstadio": est}
s, p = llamar("POST", f"/jornadas/{jornada}/partidos", tok, {**base, "idArbitro": None, "oficiales": []})
esperar("crear partido sin árbitro ni designación (con cargo obligatorio en la modalidad)", s in (200, 201), f"{s} {str(p)[:250]}")
idp = p["idPartido"]
x = partido_de(idp)
esperar("queda sin árbitro y sin oficiales", x.get("idArbitro") is None and not x.get("arbitro") and not x.get("oficiales"), str(x)[:300])
s, p = llamar("POST", f"/jornadas/{jornada}/partidos", tok, {**base, "idEquipoLocal": eqs[1], "idEquipoVisitante": eqs[0]})
esperar("crear partido sin mandar los campos de árbitro", s in (200, 201), f"{s} {str(p)[:250]}")

# Editar sin árbitro (cambiar solo la hora).
editar = {"fecha": "2026-12-05T11:30", "idEstadio": est, "idArbitro": None, "idEquipoLocal": None, "idEquipoVisitante": None, "oficiales": []}
s, p = llamar("PUT", f"/partidos/{idp}", tok, editar)
esperar("editar la hora sin árbitro", s == 200 and p["fecha"].startswith("2026-12-05 11:30"), f"{s} {str(p)[:250]}")

# Asignar después.
s, p = llamar("PUT", f"/partidos/{idp}", tok, {**editar, "idArbitro": arbs[0], "oficiales": [{"idCargo": central, "idArbitro": arbs[0]}]})
x = partido_de(idp)
esperar("asignar el árbitro después con Editar", s == 200 and x.get("idArbitro") == arbs[0] and len(x.get("oficiales") or []) == 1, f"{s} {str(x)[:300]}")
if otro:
    s, p = llamar("PUT", f"/partidos/{idp}", tok, {**editar, "idArbitro": arbs[1], "oficiales": [{"idCargo": otro, "idArbitro": arbs[1]}]})
    esperar("designar solo un cargo no obligatorio", s == 200, f"{s} {str(p)[:200]}")

# Quitar toda la designación.
s, p = llamar("PUT", f"/partidos/{idp}", tok, editar)
x = partido_de(idp)
esperar("quitar la designación deja el partido sin árbitro", s == 200 and x.get("idArbitro") is None and not x.get("oficiales"), f"{s} {str(x)[:300]}")

# Lo que se manda se sigue validando.
s, r = llamar("PUT", f"/partidos/{idp}", tok, {**editar, "idArbitro": 999999})
esperar("árbitro inexistente: rechazado", s == 400, f"{s} {str(r)[:150]}")
s, r = llamar("PUT", f"/partidos/{idp}", tok, {**editar, "idArbitro": arb_ajeno})
esperar("árbitro de otro organizador: rechazado", s == 400, f"{s} {str(r)[:150]}")
s, r = llamar("POST", f"/jornadas/{jornada}/partidos", tok, {**base, "fecha": "2026-12-06T10:00", "idEquipoLocal": eqs[2] if len(eqs) > 2 else eqs[0], "idEquipoVisitante": eqs[3] if len(eqs) > 3 else eqs[1], "idArbitro": 999999})
esperar("crear con árbitro inexistente: rechazado", s == 400, f"{s} {str(r)[:150]}")
if otro:
    s, r = llamar("PUT", f"/partidos/{idp}", tok, {**editar, "oficiales": [{"idCargo": central, "idArbitro": arbs[0]}, {"idCargo": otro, "idArbitro": arbs[0]}]})
    esperar("una persona en dos cargos: rechazado", s == 400, f"{s} {str(r)[:150]}")
s, r = llamar("PUT", f"/partidos/{idp}", tok, {**editar, "idEstadio": None})
esperar("el estadio sigue siendo obligatorio al editar", s == 400, f"{s} {str(r)[:150]}")

# Sin árbitro también se juega: marcar jugado.
s, p = llamar("PUT", f"/partidos/{idp}/jugado", tok, {"jugado": True})
esperar("un partido sin árbitro se puede marcar jugado", s == 200 and p["jugado"], f"{s} {str(p)[:200]}")

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
