"""Prueba temporal: límite de intentos fallidos (invitación e inicio de sesión)."""
import json, sys, urllib.request, urllib.error

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def llamar(metodo, ruta, cuerpo=None, token=None, ip=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    if ip: req.add_header("X-Forwarded-For", ip)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode(); return r.status, (json.loads(txt) if txt else None), dict(r.headers)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt), dict(e.headers)
        except Exception: return e.code, txt, dict(e.headers)

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

s, r, _ = llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "clave123"})
org1 = r["token"]
s, inv, _ = llamar("POST", f"/campeonatos/{D['campA']}/vocales/invitaciones", {"tipo": "Titular"}, org1)
codigo = inv["codigo"]

A, B = "203.0.113.10", "203.0.113.20"
est = [llamar("GET", f"/invitaciones/MAL-{i:04d}-XX", ip=A)[0] for i in range(10)]
esperar("10 códigos falsos responden 404", est == [404] * 10, str(est))
s, r, h = llamar("GET", "/invitaciones/MAL-9999-XX", ip=A)
esperar("el intento 11 se bloquea con 429", s == 429, f"{s} {r}")
esperar("el mensaje está en español y dice cuánto esperar", isinstance(r, dict) and r.get("error", "").startswith("Demasiados intentos fallidos. Espere 15 minutos"), str(r))
ra = int(h.get("Retry-After", "0"))
esperar("trae Retry-After cercano a 15 minutos", 880 <= ra <= 900, str(ra))
s, r, _ = llamar("GET", f"/invitaciones/{codigo}", ip=A)
esperar("bloqueada, ni el código correcto pasa", s == 429, str(s))
s, r, _ = llamar("POST", f"/invitaciones/{codigo}/aceptar", {"nombre": "X", "email": "x@prueba.ec", "password": "clave123"}, ip=A)
esperar("bloqueada, tampoco puede aceptar", s == 429, str(s))
s, r, _ = llamar("GET", f"/invitaciones/{codigo}", ip=B)
esperar("otra IP abre la invitación sin problema", s == 200 and r.get("vigente"), f"{s} {str(r)[:120]}")
s, r, _ = llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "clave123"}, ip=A)
esperar("el bloqueo de invitación no impide iniciar sesión", s == 200, str(s))

# El proxy agrega la IP real al final: solo cuenta el último valor.
s, _, _ = llamar("GET", f"/invitaciones/{codigo}", ip=f"198.51.100.7, {A}")
esperar("no se esquiva el bloqueo poniendo otra IP delante", s == 429, str(s))
s, _, _ = llamar("GET", f"/invitaciones/{codigo}", ip=f"{A}, 198.51.100.8")
esperar("cuenta la IP que agrega el proxy (la última)", s == 200, str(s))

C = "203.0.113.30"
est = [llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "mala"}, ip=C)[0] for _ in range(10)]
esperar("10 claves malas responden 400", est == [400] * 10, str(est))
s, r, _ = llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "clave123"}, ip=C)
esperar("tras 10 claves malas, ni la correcta entra (429)", s == 429 and "Demasiados intentos" in r.get("error", ""), f"{s} {r}")

E = "203.0.113.40"
for _ in range(9): llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "mala"}, ip=E)
s, _, _ = llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "clave123"}, ip=E)
esperar("con 9 fallos todavía entra", s == 200, str(s))
est = [llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "mala"}, ip=E)[0] for _ in range(9)]
s, _, _ = llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "clave123"}, ip=E)
esperar("un acierto borra la cuenta de fallos", s == 200 and est == [400] * 9, f"{s} {est}")

s, _, _ = llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "clave123"})
esperar("sin X-Forwarded-For el login sigue funcionando", s == 200, str(s))

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
