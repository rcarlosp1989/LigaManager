"""Prueba de integración temporal de la Fase 8 (estado, autor, bloqueo, duplicados)."""
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

org2 = login("org2@prueba.ec")
P = D["hoyB"]
s, inv = llamar("POST", f"/campeonatos/{D['campB']}/vocales/invitaciones", {"tipo": "Titular"}, org2)
s, ses = llamar("POST", f"/invitaciones/{inv['codigo']}/aceptar", {"nombre": "Vocal B", "email": "vocalb@prueba.ec", "password": "clave123"})
vocal = ses["token"]

s, p = llamar("GET", f"/partidos/{P}", token=org2)
esperar("un partido nuevo está sin iniciar", s == 200 and p["estadoRegistro"] == "SinIniciar", str(p)[:200])

s, det = llamar("GET", f"/vocal/partidos/{P}", token=vocal)
loc = det["local"]["jugadores"]
for j in loc[:3]:
    llamar("POST", f"/vocal/partidos/{P}/alineacion", {"idJugador": j["idJugador"], "titular": True}, vocal)
s, p = llamar("POST", f"/vocal/partidos/{P}/alineacion", {"idJugador": loc[3]["idJugador"], "titular": False}, vocal)
esperar("la convocatoria del vocal guarda su nombre", s == 200 and all(a.get("registradoPor") == "Vocal B" for a in p["alineacionLocal"]), str(p["alineacionLocal"])[:200])
esperar("convocar desde el vocal pone el partido en vivo", p["estadoRegistro"] == "EnVivo" and p.get("iniciadoEn"), str(p)[:200])

s, p = llamar("PUT", f"/vocal/partidos/{P}/iniciar", None, vocal)
esperar("iniciar no cambia la hora de inicio ya guardada", s == 200 and p["estadoRegistro"] == "EnVivo", str(p)[:200])

evento = {"idJugador": loc[0]["idJugador"], "tipoEvento": "GOL", "minuto": 10, "idCliente": "11111111-1111-1111-1111-111111111111"}
s1, p1 = llamar("POST", f"/vocal/partidos/{P}/eventos", evento, vocal)
s2, p2 = llamar("POST", f"/vocal/partidos/{P}/eventos", evento, vocal)
esperar("el mismo evento enviado dos veces se guarda una vez", s1 == 200 and s2 == 200 and len(p2["eventos"]) == 1, str(p2)[:200])
esperar("el evento guarda autor e idCliente", p2["eventos"][0].get("registradoPor") == "Vocal B" and p2["eventos"][0].get("idCliente") == evento["idCliente"], str(p2["eventos"])[:200])
cambio = {"idJugadorSale": loc[1]["idJugador"], "idJugadorEntra": loc[3]["idJugador"], "minuto": 20, "idCliente": "22222222-2222-2222-2222-222222222222"}
s1, _ = llamar("POST", f"/vocal/partidos/{P}/cambios", cambio, vocal)
s2, p2 = llamar("POST", f"/vocal/partidos/{P}/cambios", cambio, vocal)
esperar("el mismo cambio enviado dos veces se guarda una vez", s1 == 200 and s2 == 200 and len(p2["cambios"]) == 1 and p2["cambios"][0].get("registradoPor") == "Vocal B", str(p2)[:200])

s, p = llamar("POST", f"/partidos/{P}/eventos", {"idJugador": loc[2]["idJugador"], "tipoEvento": "TARJETA_AMARILLA", "minuto": 25}, org2)
esperar("un evento del organizador (planilla) queda a su nombre", s == 200 and any(e.get("registradoPor") == "org2" for e in p["eventos"]), str(p["eventos"])[:200])

s, p = llamar("PUT", f"/vocal/partidos/{P}/cerrar", {"observaciones": "Todo en orden."}, vocal)
esperar("el vocal cierra: queda cerrado, jugado y con su nombre", s == 200 and p["estadoRegistro"] == "Cerrado" and p["jugado"] and p.get("cerradoPor") == "Vocal B" and p.get("cerradoEn"), str(p)[:250])
id_ev = p["eventos"][0]["idEvento"]; id_al = p["alineacionLocal"][0]["idAlineacion"]

for nombre, (m, ruta, cuerpo) in {
    "evento": ("POST", f"/vocal/partidos/{P}/eventos", {"idJugador": loc[0]["idJugador"], "tipoEvento": "GOL", "minuto": 80}),
    "borrar evento": ("DELETE", f"/vocal/eventos/{id_ev}", None),
    "convocar": ("POST", f"/vocal/partidos/{P}/alineacion", {"idJugador": loc[5]["idJugador"], "titular": False}),
    "quitar convocado": ("DELETE", f"/vocal/alineacion/{id_al}", None),
    "cambio": ("POST", f"/vocal/partidos/{P}/cambios", {"idJugadorSale": loc[0]["idJugador"], "idJugadorEntra": loc[3]["idJugador"], "minuto": 70}),
    "cerrar otra vez": ("PUT", f"/vocal/partidos/{P}/cerrar", {"observaciones": "x"}),
    "iniciar": ("PUT", f"/vocal/partidos/{P}/iniciar", None),
}.items():
    s, r = llamar(m, ruta, cuerpo, vocal)
    esperar(f"partido cerrado: el vocal no puede {nombre} (409)", s == 409, f"{s} {str(r)[:120]}")

s, det = llamar("GET", f"/vocal/partidos/{P}", token=vocal)
esperar("el vocal todavía ve el resumen del partido cerrado", s == 200 and det["partido"]["estadoRegistro"] == "Cerrado")
s, _ = llamar("PUT", f"/partidos/{P}/reabrir", None, vocal)
esperar("el vocal no puede reabrir (403)", s == 403)

s, p = llamar("POST", f"/partidos/{P}/eventos", {"idJugador": loc[2]["idJugador"], "tipoEvento": "TARJETA_ROJA", "minuto": 60}, org2)
esperar("el organizador corrige después del cierre", s == 200)
s, _ = llamar("DELETE", f"/eventos/{id_ev}", token=org2)
esperar("el organizador borra después del cierre", s == 204)
s, p = llamar("GET", f"/partidos/{P}", token=org2)
esperar("el organizador ve estado y autor", p["estadoRegistro"] == "Cerrado" and p["cerradoPor"] == "Vocal B" and {e.get("registradoPor") for e in p["eventos"]} == {"org2"}, str(p)[:300])

s, p = llamar("PUT", f"/partidos/{P}/reabrir", None, org2)
esperar("el organizador reabre para el vocal", s == 200 and p["estadoRegistro"] == "EnVivo" and not p.get("cerradoPor"), str(p)[:200])
s, p = llamar("POST", f"/vocal/partidos/{P}/eventos", {"idJugador": loc[0]["idJugador"], "tipoEvento": "GOL", "minuto": 85, "idCliente": "33333333-3333-3333-3333-333333333333"}, vocal)
esperar("reabierto, el vocal vuelve a registrar", s == 200)
s, p = llamar("PUT", f"/partidos/{P}/reabrir", None, org2)
esperar("reabrir un partido no cerrado se rechaza", s == 400)
s, p = llamar("PUT", f"/partidos/{P}/cerrar", {"observaciones": None}, org2)
esperar("el organizador también puede cerrar desde el modo en vivo", s == 200 and p["estadoRegistro"] == "Cerrado" and p["cerradoPor"] == "org2", str(p)[:200])

s, p = llamar("GET", f"/partidos/{D['mananaA']}", token=login("org1@prueba.ec"))
esperar("los partidos viejos quedan sin iniciar y sin autor", s == 200 and p["estadoRegistro"] == "SinIniciar" and not p.get("cerradoPor"), str(p)[:200])

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
