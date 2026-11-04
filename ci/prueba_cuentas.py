"""Prueba temporal: Recordarme, confirmar correo y restablecer contraseña (correo de prueba)."""
import datetime, glob, json, os, re, subprocess, sys, time, urllib.request, urllib.error

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
CORREOS = os.environ.get("CORREOS", "correos")
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

def correos(para):
    out = []
    for f in sorted(glob.glob(os.path.join(CORREOS, "*.json"))):
        m = json.load(open(f))
        if m["para"] == para: out.append(m)
    return out

def codigo(m, ruta):
    x = re.search(rf"http://localhost:4173/{ruta}/([A-Za-z0-9_-]+)", m["texto"])
    return x.group(1) if x else None

def horas_hasta(iso):
    exp = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if exp.tzinfo is None: exp = exp.replace(tzinfo=datetime.timezone.utc)
    return (exp - datetime.datetime.now(datetime.timezone.utc)).total_seconds() / 3600

s, o = llamar("GET", "/auth/opciones")
esperar("con correo de prueba, la app ofrece restablecer la contraseña", s == 200 and o["correo"] is True, f"{s} {o}")

# ── Recordarme ──
s, r = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123", "recordarme": True})
esperar("Recordarme: la sesión dura 7 días", s == 200 and 167 < horas_hasta(r["expira"]) <= 168.1, f"{s} {r.get('expira') if isinstance(r, dict) else r}")
s, r = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})
esperar("sin Recordarme: la sesión dura 12 horas", s == 200 and 11.9 < horas_hasta(r["expira"]) <= 12.1, f"{s} {r.get('expira') if isinstance(r, dict) else r}")
esperar("las cuentas que ya existían entran sin confirmar el correo", s == 200)

# ── Registro con confirmación ──
EMAIL, CLAVE = "cuenta.nueva@prueba.ec", "clave123"
s, r = llamar("POST", "/auth/register", cuerpo={"nombre": "Liga Nueva", "email": EMAIL, "password": CLAVE, "aceptaTerminos": True})
esperar("al registrarse queda pendiente de confirmar (sin sesión)", s == 200 and r.get("confirmarCorreo") is True and "token" not in r, f"{s} {r}")
lista = correos(EMAIL)
esperar("le llega un correo de confirmación", len(lista) == 1 and "Confirme su correo" in lista[0]["asunto"], str(lista)[:300])
c1 = codigo(lista[0], "confirmar-correo") if lista else None
esperar("el correo trae el enlace a la app (dirección de la app)", c1 is not None, lista[0]["texto"][:300] if lista else "")
esperar("en la base solo se guarda el hash del enlace", c1 and sql(f"SELECT COUNT(*) FROM token_usuario WHERE token_hash = '{c1}'") == "0")
esperar("la cuenta nueva está sin confirmar", sql(f"SELECT email_verificado FROM usuario WHERE email = '{EMAIL}'") == "0")

s, r = llamar("POST", "/auth/login", cuerpo={"email": EMAIL, "password": CLAVE})
esperar("sin confirmar no entra (403 con código)", s == 403 and r.get("codigo") == "CORREO_SIN_CONFIRMAR", f"{s} {r}")
s, r = llamar("POST", "/auth/login", cuerpo={"email": EMAIL, "password": "otra-clave"})
esperar("con la clave equivocada sigue diciendo «credenciales incorrectas» (no revela la cuenta)", s == 400 and "Credenciales" in r["error"], f"{s} {r}")

s, r = llamar("POST", "/auth/reenviar-confirmacion", cuerpo={"email": EMAIL})
esperar("reenviar enseguida responde igual pero no manda otro (1 por minuto)", s == 200 and len(correos(EMAIL)) == 1, f"{s} {len(correos(EMAIL))}")
s, r = llamar("POST", "/auth/reenviar-confirmacion", cuerpo={"email": "nadie@prueba.ec"})
esperar("reenviar a un correo inexistente responde igual", s == 200 and "Si el correo" in r["mensaje"], f"{s} {r}")

s, r = llamar("POST", "/auth/confirmar-correo", cuerpo={"token": "codigo-inventado"})
esperar("un código inventado no confirma", s == 400, f"{s} {r}")
s, r = llamar("POST", "/auth/confirmar-correo", cuerpo={"token": c1})
esperar("el enlace confirma y entra directo", s == 200 and r.get("rol") == "Organizador" and r.get("token"), f"{s} {r}")
s, r = llamar("POST", "/auth/confirmar-correo", cuerpo={"token": c1})
esperar("el enlace no sirve dos veces", s == 400 and "ya se usó" in r["error"], f"{s} {r}")
s, r = llamar("POST", "/auth/login", cuerpo={"email": EMAIL, "password": CLAVE})
esperar("confirmada, inicia sesión", s == 200, f"{s} {r}")
s, r = llamar("POST", "/auth/reenviar-confirmacion", cuerpo={"email": EMAIL})
time.sleep(0.5)
esperar("ya confirmada, reenviar no manda nada", len(correos(EMAIL)) == 1)

# ── Restablecer la contraseña ──
s, r = llamar("POST", "/auth/olvide-clave", cuerpo={"email": "nadie@prueba.ec"})
esperar("olvidé la clave con un correo inexistente responde igual y no envía", s == 200 and "Si el correo" in r["mensaje"] and not correos("nadie@prueba.ec"), f"{s} {r}")
s, sesionVieja = llamar("POST", "/auth/login", cuerpo={"email": EMAIL, "password": CLAVE, "recordarme": True})
tokViejo = sesionVieja["token"]
s, _ = llamar("GET", "/campeonatos", tokViejo)
esperar("la sesión anterior funciona antes del cambio", s == 200)
time.sleep(1.1)
s, r = llamar("POST", "/auth/olvide-clave", cuerpo={"email": EMAIL.upper()})
lista = [m for m in correos(EMAIL) if "Restablezca" in m["asunto"]]
esperar("olvidé la clave (sin importar mayúsculas) envía el enlace", s == 200 and len(lista) == 1, f"{s} {len(lista)}")
c2 = codigo(lista[0], "restablecer") if lista else None
s, r = llamar("POST", "/auth/olvide-clave", cuerpo={"email": EMAIL})
esperar("pedirlo de nuevo enseguida no manda otro", len([m for m in correos(EMAIL) if "Restablezca" in m["asunto"]]) == 1)

s, r = llamar("GET", f"/auth/restablecer/{c2}")
esperar("el enlace de restablecer es válido", s == 200 and r["valido"], f"{s} {r}")
s, r = llamar("GET", "/auth/restablecer/inventado")
esperar("un enlace inventado no es válido (404)", s == 404 and not r["valido"], f"{s} {r}")
s, r = llamar("POST", "/auth/restablecer", cuerpo={"token": c2, "password": "123"})
esperar("una contraseña corta se rechaza", s == 400, f"{s} {r}")
s, r = llamar("GET", f"/auth/restablecer/{c2}")
esperar("después de un intento fallido el enlace sigue valiendo", s == 200)
s, nueva = llamar("POST", "/auth/restablecer", cuerpo={"token": c2, "password": "nueva456"})
esperar("guarda la contraseña nueva y entra directo", s == 200 and nueva.get("token"), f"{s} {nueva}")
s, _ = llamar("GET", "/campeonatos", tokViejo)
esperar("la sesión anterior se cerró (401)", s == 401, str(s))
s, _ = llamar("GET", "/campeonatos", nueva["token"])
esperar("la sesión nueva funciona", s == 200, str(s))
s, _ = llamar("POST", "/auth/login", cuerpo={"email": EMAIL, "password": CLAVE})
esperar("la contraseña anterior ya no sirve", s == 400)
s, _ = llamar("POST", "/auth/login", cuerpo={"email": EMAIL, "password": "nueva456"})
esperar("la contraseña nueva sirve", s == 200)
s, r = llamar("POST", "/auth/restablecer", cuerpo={"token": c2, "password": "otra789"})
esperar("el enlace de restablecer no sirve dos veces", s == 400, f"{s} {r}")
s, r = llamar("GET", f"/auth/restablecer/{c2}")
esperar("usado, ya no es válido", s == 404, f"{s} {r}")

# Enlace vencido: se pide otro (pasado el minuto de espera, simulado en la base) y se vence.
sql(f"UPDATE token_usuario t JOIN usuario u ON u.id_usuario = t.id_usuario SET t.creado_en = t.creado_en - INTERVAL 2 MINUTE WHERE u.email = '{EMAIL}'")
llamar("POST", "/auth/olvide-clave", cuerpo={"email": EMAIL})
lista = [m for m in correos(EMAIL) if "Restablezca" in m["asunto"]]
esperar("pasado el minuto se puede pedir otro enlace", len(lista) == 2, str(len(lista)))
c3 = codigo(lista[-1], "restablecer") if len(lista) == 2 else None
sql(f"UPDATE token_usuario t JOIN usuario u ON u.id_usuario = t.id_usuario SET t.vence_en = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE u.email = '{EMAIL}' AND t.usado_en IS NULL")
s, r = llamar("GET", f"/auth/restablecer/{c3}")
esperar("un enlace vencido no es válido", s == 404 and "venció" in (r.get("motivo") or ""), f"{s} {r}")

# Un vocal (cuenta creada con invitación) también puede restablecer.
if sql("SELECT COUNT(*) FROM usuario WHERE email = 'vocal@prueba.ec'") == "1":
    llamar("POST", "/auth/olvide-clave", cuerpo={"email": "vocal@prueba.ec"})
    esperar("un vocal también recibe el enlace", any("Restablezca" in m["asunto"] for m in correos("vocal@prueba.ec")))

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
