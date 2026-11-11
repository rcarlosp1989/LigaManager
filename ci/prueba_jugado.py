"""Prueba temporal: un partido jugado queda en solo lectura para el vocal hasta desmarcarlo."""
import json, sys, urllib.request, urllib.error

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

def login(email):
    s, r = llamar("POST", "/auth/login", {"email": email, "password": "clave123"}); return r["token"]

org2, vocal = login("org2@prueba.ec"), login("vocalb@prueba.ec")
P = D["hoyB"]
s, det = llamar("GET", f"/vocal/partidos/{P}", token=vocal)
j0 = det["local"]["jugadores"][0]["idJugador"]
gol = lambda m: {"idJugador": j0, "tipoEvento": "GOL", "minuto": m}

# Viene cerrado por la prueba de la Fase 8. Desmarcarlo lo reabre.
s, p = llamar("GET", f"/partidos/{P}", token=org2)
esperar("punto de partida: cerrado y jugado", p["estadoRegistro"] == "Cerrado" and p["jugado"], str(p)[:200])
s, p = llamar("PUT", f"/partidos/{P}/jugado", {"jugado": False}, org2)
esperar("desmarcar un partido cerrado lo deja en vivo y sin cierre", s == 200 and not p["jugado"] and p["estadoRegistro"] == "EnVivo" and not p.get("cerradoPor") and not p.get("cerradoEn"), str(p)[:250])
s, _ = llamar("POST", f"/vocal/partidos/{P}/eventos", gol(11), vocal)
esperar("desmarcado, el vocal vuelve a registrar", s == 200, str(s))

# Marcado como jugado desde la tarjeta (sin cerrar en vivo): el vocal ya no puede registrar.
s, p = llamar("PUT", f"/partidos/{P}/jugado", {"jugado": True}, org2)
esperar("marcar jugado desde la tarjeta no lo cierra", s == 200 and p["jugado"] and p["estadoRegistro"] == "EnVivo", str(p)[:200])
for nombre, (m, ruta, cuerpo) in {
    "registrar un gol": ("POST", f"/vocal/partidos/{P}/eventos", gol(12)),
    "iniciar": ("PUT", f"/vocal/partidos/{P}/iniciar", None),
    "cerrar": ("PUT", f"/vocal/partidos/{P}/cerrar", {"observaciones": "x"}),
    "convocar": ("POST", f"/vocal/partidos/{P}/alineacion", {"idJugador": det["local"]["jugadores"][6]["idJugador"], "titular": False}),
}.items():
    s, r = llamar(m, ruta, cuerpo, vocal)
    esperar(f"jugado: el vocal no puede {nombre} (409)", s == 409 and "marcado como jugado" in str(r), f"{s} {str(r)[:140]}")
s, det2 = llamar("GET", f"/vocal/partidos/{P}", token=vocal)
esperar("jugado: el vocal todavía ve el partido", s == 200 and det2["partido"]["jugado"])
s, p = llamar("POST", f"/partidos/{P}/eventos", {"idJugador": j0, "tipoEvento": "TARJETA_AMARILLA", "minuto": 40}, org2)
esperar("jugado: el organizador sigue corrigiendo desde la planilla", s == 200, str(s))
s, _ = llamar("PUT", f"/partidos/{P}/reabrir", None, org2)
esperar("reabrir solo aplica a partidos cerrados en vivo (400)", s == 400, str(s))
s, p = llamar("PUT", f"/partidos/{P}/jugado", {"jugado": False}, org2)
s2, _ = llamar("POST", f"/vocal/partidos/{P}/eventos", gol(13), vocal)
esperar("desmarcado otra vez, el vocal registra", s == 200 and s2 == 200, f"{s} {s2}")

# Cierre del vocal y «Reabrir para el vocal»: reabrir también lo desmarca.
s, p = llamar("PUT", f"/vocal/partidos/{P}/cerrar", {"observaciones": "Fin."}, vocal)
esperar("el vocal cierra", s == 200 and p["estadoRegistro"] == "Cerrado" and p["jugado"], str(p)[:200])
s, p = llamar("PUT", f"/partidos/{P}/reabrir", None, org2)
esperar("reabrir lo deja en vivo y desmarcado", s == 200 and p["estadoRegistro"] == "EnVivo" and not p["jugado"] and not p.get("cerradoPor"), str(p)[:250])
s, _ = llamar("POST", f"/vocal/partidos/{P}/eventos", gol(14), vocal)
esperar("reabierto, el vocal registra", s == 200, str(s))

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
