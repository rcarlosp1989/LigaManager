"""Prueba temporal: chequeo de salud y avisos de errores por correo."""
import glob, json, os, sys, time, urllib.request, urllib.error

BASE = "http://localhost:5080/api"
CORREOS = os.environ.get("CORREOS", "correos")
fallas = []

def llamar(metodo, ruta, cuerpo=None, token=None):
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 method=metodo, headers={"Content-Type": "application/json"})
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, None

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

def avisos():
    r = []
    for f in glob.glob(os.path.join(CORREOS, "*.json")):
        try:
            d = json.load(open(f))
            if d.get("asunto", "").startswith("[LigaManager] Error"): r.append(d)
        except Exception: pass
    return r

s, d = llamar("GET", "/salud")
esperar("salud: 200 con la base conectada", s == 200 and d and d.get("estado") == "ok" and d.get("baseDeDatos") is True, f"{s} {d}")

antes = len(avisos())
s, _ = llamar("POST", "/errores-pantalla", {"mensaje": "TypeError: x is undefined en prueba 123", "pila": "at Prueba (app.js:10:5)", "ruta": "/campeonatos/7", "navegador": "Prueba"})
esperar("pantalla: aviso aceptado (204)", s == 204, str(s))
time.sleep(2)
nuevos = avisos()[antes:] if False else [a for a in avisos()]
mio = [a for a in nuevos if "x is undefined" in a.get("asunto", "") + a.get("texto", "")]
esperar("pantalla: llega el correo al administrador", len(mio) == 1 and mio[0]["para"] == "admin@prueba.ec", str(mio[:1]))
esperar("correo: dice dónde y qué navegador", mio and "/campeonatos/7" in mio[0]["texto"] and "Prueba" in mio[0]["texto"], str(mio[:1]))

# El mismo error (aunque cambien los números) no vuelve a avisar dentro de la hora.
s, _ = llamar("POST", "/errores-pantalla", {"mensaje": "TypeError: x is undefined en prueba 456", "ruta": "/campeonatos/9"})
time.sleep(2)
mio2 = [a for a in avisos() if "x is undefined" in a.get("asunto", "") + a.get("texto", "")]
esperar("repetido: no manda otro correo en la misma hora", s == 204 and len(mio2) == 1, f"{s} correos={len(mio2)}")

s, _ = llamar("POST", "/errores-pantalla", {"mensaje": ""})
esperar("pantalla: sin mensaje → 400", s == 400, str(s))

# Límite por IP: 20 avisos cada 10 minutos (ya van 3).
codigos = [llamar("POST", "/errores-pantalla", {"mensaje": f"Otro error {i}"})[0] for i in range(20)]
esperar("pantalla: más de 20 avisos seguidos → 429", 429 in codigos and codigos.index(429) >= 16, str(codigos))

total = len(avisos())
esperar("tope diario: nunca más de 20 correos", total <= 20, str(total))
print(f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
