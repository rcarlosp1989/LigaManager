"""Prueba temporal: crear partido con cargos de oficiales (como en producción)."""
import json, sys, urllib.request, urllib.error
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
camp = llamar("GET", f"/campeonatos/{D['campA']}", tok)[1]
cargos = llamar("GET", f"/catalogos/cargos-oficiales?modalidadId={camp['idModalidad']}", tok)[1]
print("INFO cargos:", cargos)
pais = llamar("GET", "/catalogos/paises", tok)[1][0]["idPais"]
eqs = [e["idEquipo"] for e in llamar("GET", "/equipos", tok)[1]]
jornada = llamar("GET", f"/campeonatos/{D['campA']}/jornadas", tok)[1][0]["idJornada"]
est = llamar("POST", "/estadios", tok, {"nombre": "Estadio Ofi", "idPais": pais, "idCanton": None})[1]["idEstadio"]
arbs = [llamar("POST", "/arbitros", tok, {"nombre": f"Of{i}", "apellido": "Cargo", "cedula": "", "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None})[1]["idArbitro"] for i in range(3)]
central = next((c["idCargo"] for c in cargos if c.get("obligatorio")), cargos[0]["idCargo"] if cargos else None)
# Como lo arma la pantalla: idArbitro = el del primer cargo; solo se mandan cargos asignados.
cuerpo = {"idEquipoLocal": eqs[0], "idEquipoVisitante": eqs[1], "fecha": "2026-11-10T14:40", "idEstadio": est,
          "idArbitro": arbs[0], "oficiales": [{"idCargo": central, "idArbitro": arbs[0]}]}
s, r = llamar("POST", f"/jornadas/{jornada}/partidos", tok, cuerpo)
esperar("crear partido con árbitro central (resto sin asignar)", s in (200, 201), f"{s} {str(r)[:300]}")
s, jd = llamar("GET", f"/jornadas/{jornada}", tok)
p = [x for x in jd["partidos"] if x["fecha"].startswith("2026-11-10")]
esperar("quedó guardado con la hora", p and p[0]["fecha"] == "2026-11-10 14:40", str([x["fecha"] for x in p]))
otros = [c["idCargo"] for c in cargos if c["idCargo"] != central]
cuerpo2 = {**cuerpo, "fecha": "2026-11-11T09:15", "oficiales": [{"idCargo": central, "idArbitro": arbs[0]}] + [{"idCargo": c, "idArbitro": arbs[i + 1]} for i, c in enumerate(otros[:2])]}
s, r = llamar("POST", f"/jornadas/{jornada}/partidos", tok, cuerpo2)
esperar("crear partido con todos los cargos", s in (200, 201), f"{s} {str(r)[:300]}")
cuerpo3 = {**cuerpo, "fecha": "2026-11-12T10:00", "idArbitro": None}
s, r = llamar("POST", f"/jornadas/{jornada}/partidos", tok, cuerpo3)
esperar("crear partido sin idArbitro (solo cargos)", s in (200, 201), f"{s} {str(r)[:300]}")
print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
