"""Prueba temporal: autorización de datos de jugadores y aceptación de términos."""
import json, subprocess, sys, urllib.request, urllib.error, uuid

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def cedula_valida(n):
    b = f"09{n:07d}"; s = 0
    for i, ch in enumerate(b):
        v = int(ch) * (2 if i % 2 == 0 else 1); s += v - 9 if v > 9 else v
    return b + str((10 - s % 10) % 10)

def llamar(metodo, ruta, token=None, cuerpo=None, campos=None):
    h = {}
    if campos is not None:
        borde = uuid.uuid4().hex
        partes = b"".join(f"--{borde}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode() for k, v in campos.items())
        datos = partes + f"--{borde}--\r\n".encode(); h["Content-Type"] = f"multipart/form-data; boundary={borde}"
    else:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None; h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers=h)
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

def login(email):
    s, r = llamar("POST", "/auth/login", cuerpo={"email": email, "password": "clave123"})
    return r["token"] if s == 200 else None

# ── Jugadores existentes: autorización dada por otorgada por el script ──
sin = sql("SELECT COUNT(*) FROM persona p JOIN jugador j ON j.id_persona = p.id_persona WHERE p.autorizacion_datos_en IS NULL")
previos = sql("SELECT COUNT(*) FROM persona p JOIN jugador j ON j.id_persona = p.id_persona WHERE p.autorizacion_datos_por IS NULL")
esperar(f"todos los jugadores tienen la autorización registrada ({previos} dados por otorgados por el script)", sin == "0" and int(previos) > 0, f"sin={sin} previos={previos}")

# ── Registrar jugador ──
org = login("org1@prueba.ec")
pais = llamar("GET", "/catalogos/paises", org)[1][0]["idPais"]
eq = llamar("GET", f"/campeonatos/{D['campA']}", org)[1]["equipos"][0]["idEquipo"]
idOrg = sql("SELECT id_usuario FROM usuario WHERE email = 'org1@prueba.ec'")
base = lambda n, **x: {"Nombre": "Priv", "Apellido": f"Prueba{n}", "Cedula": cedula_valida(7300 + n), "FechaNac": "1999-09-09",
                       "IdPais": pais, "IdEquipo": eq, "FechaDesde": D["hoy"], "Posicion": "Volante", **x}
s, r = llamar("POST", "/jugadores", org, campos=base(1))
esperar("sin la autorización no se registra el jugador", s == 400 and "autorización" in str(r), f"{s} {r}")
s, r = llamar("POST", "/jugadores", org, campos=base(2, AutorizacionDatos="false"))
esperar("con la autorización en falso tampoco", s == 400, f"{s} {r}")
s, j = llamar("POST", "/jugadores", org, campos=base(3, AutorizacionDatos="true"))
esperar("con la autorización se registra", s in (200, 201), f"{s} {str(j)[:200]}")
fila = sql(f"SELECT CONCAT(IFNULL(autorizacion_datos_en,'NULL'),'|',IFNULL(autorizacion_datos_por,'NULL')) FROM persona WHERE id_persona = {j['idPersona']}")
en, por = fila.split("|")
esperar("se guarda cuándo y quién registró la autorización", en != "NULL" and por == idOrg, fila)
s, u = llamar("PUT", f"/jugadores/{j['idJugador']}", org, campos={"Nombre": "Priv", "Apellido": "Editado", "Cedula": cedula_valida(7303), "FechaNac": "1999-09-09", "IdPais": pais, "Posicion": "Volante"})
esperar("editar no pide de nuevo la autorización", s == 200, f"{s} {u}")
esperar("editar conserva la autorización", sql(f"SELECT autorizacion_datos_en IS NOT NULL FROM persona WHERE id_persona = {j['idPersona']}") == "1")

# ── Términos ──
s, t = llamar("GET", "/auth/terminos", org)
esperar("un organizador que ya existía tiene los términos pendientes", s == 200 and t["pendiente"] is True and t.get("aceptadosEn") is None, f"{s} {t}")
version = t["version"]
s, r = llamar("POST", "/auth/terminos", org, cuerpo={"version": "1999-01-01"})
esperar("aceptar una versión vieja se rechaza", s == 400, f"{s} {r}")
s, t2 = llamar("POST", "/auth/terminos", org, cuerpo={"version": version})
esperar("acepta la versión vigente", s == 200 and t2["pendiente"] is False and t2.get("aceptadosEn"), f"{s} {t2}")
s, t3 = llamar("GET", "/auth/terminos", org)
esperar("ya no quedan pendientes", s == 200 and t3["pendiente"] is False, f"{s} {t3}")
fila = sql("SELECT CONCAT(IFNULL(terminos_version,'NULL'),'|',terminos_aceptados_en IS NOT NULL) FROM usuario WHERE email = 'org1@prueba.ec'")
esperar("se guarda la versión y la fecha", fila == f"{version}|1", fila)
s, _ = llamar("GET", "/auth/terminos")
esperar("sin sesión no se consulta (401)", s == 401, str(s))

s, r = llamar("POST", "/auth/register", cuerpo={"nombre": "Nueva Liga", "email": "nueva.liga@prueba.ec", "password": "clave123"})
esperar("registrarse sin aceptar los términos se rechaza", s == 400 and "términos" in str(r), f"{s} {r}")
s, r = llamar("POST", "/auth/register", cuerpo={"nombre": "Nueva Liga", "email": "nueva.liga@prueba.ec", "password": "clave123", "aceptaTerminos": True})
esperar("registrarse aceptándolos funciona", s == 200 and (r.get("rol") == "Organizador" or r.get("confirmarCorreo")), f"{s} {r}")
tokNueva = r.get("token") if s == 200 else None
if s == 200 and r.get("confirmarCorreo"):
    # Con servicio de correo: se confirma con el enlace del correo de prueba.
    import glob, os, re as _re
    correos = sorted(glob.glob(os.path.join(os.environ.get("CORREOS", "correos"), "*.json")))
    for f in reversed(correos):
        m = json.load(open(f))
        if m["para"] == "nueva.liga@prueba.ec":
            codigo = _re.search(r"/confirmar-correo/([A-Za-z0-9_-]+)", m["texto"]).group(1)
            s2, r2 = llamar("POST", "/auth/confirmar-correo", cuerpo={"token": codigo})
            tokNueva = r2.get("token") if s2 == 200 else None
            break
s, t4 = llamar("GET", "/auth/terminos", tokNueva)
esperar("la cuenta nueva no tiene términos pendientes", s == 200 and t4["pendiente"] is False, f"{s} {t4}")

vocal = login("vocal@prueba.ec")
if vocal:
    s, _ = llamar("GET", "/auth/terminos", vocal)
    esperar("un vocal no usa los términos de organizador (403)", s == 403, str(s))
dirigente = login("dir1@prueba.ec")
if dirigente:
    s, _ = llamar("GET", "/auth/terminos", dirigente)
    esperar("un dirigente no usa los términos de organizador (403)", s == 403, str(s))

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
