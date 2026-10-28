"""Prueba temporal: la misma cédula en dos ligas (jugadores y árbitros)."""
import json, sys, urllib.request, urllib.error, uuid

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
    if campos is not None and metodo == "POST" and ruta == "/jugadores" and "AutorizacionDatos" not in campos:
        campos = {**campos, "AutorizacionDatos": "true"}
    if campos is not None:
        borde = uuid.uuid4().hex
        datos = "".join(f"--{borde}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n" for k, v in campos.items()) + f"--{borde}--\r\n"
        datos = datos.encode(); h["Content-Type"] = f"multipart/form-data; boundary={borde}"
    else:
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None; h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers=h)
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode(); return r.status, t
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

login = lambda e: json.loads(llamar("POST", "/auth/login", cuerpo={"email": e, "password": "clave123"})[1])["token"]
o1, o2 = login("org1@prueba.ec"), login("org2@prueba.ec")
pais = json.loads(llamar("GET", "/catalogos/paises", o1)[1])[0]["idPais"]
eq1 = json.loads(llamar("GET", "/equipos", o1)[1])[0]["idEquipo"]
eq2 = json.loads(llamar("GET", "/equipos", o2)[1])[0]["idEquipo"]
jug1 = json.loads(llamar("GET", f"/equipos/{eq1}", o1)[1])["jugadores"]
j1 = json.loads(llamar("GET", f"/jugadores/{jug1[3]['idJugador']}", o1)[1])
ced = j1["cedula"]
nuevo = lambda tok, eq, cedula, nombre, dorsal: llamar("POST", "/jugadores", tok, campos={"Nombre": nombre, "Apellido": "Liga2", "Cedula": cedula,
    "FechaNac": "1995-05-05", "IdPais": pais, "IdEquipo": eq, "FechaDesde": D["hoy"], "Dorsal": dorsal})

s, t = nuevo(o2, eq2, ced, "Mismo", 70)
esperar("org2 registra en su liga a un jugador que ya está en la liga de org1", s in (200, 201), f"{s} {t[:200]}")
s, t = nuevo(o2, eq2, ced, "Otra vez", 71)
esperar("org2 no puede repetir esa cédula dentro de su liga", s == 400 and "Ya tienes un jugador" in t, f"{s} {t[:150]}")
s, t = nuevo(o1, eq1, ced, "Repetido", 72)
esperar("org1 tampoco puede repetir la cédula de su propio jugador", s == 400 and "Ya tienes un jugador" in t, f"{s} {t[:150]}")

l2 = json.loads(llamar("GET", "/jugadores", o2)[1])
copia = [x for x in l2 if x.get("cedula") == ced]
esperar("org2 ve su propia ficha, con sus datos", len(copia) == 1 and copia[0]["apellido"] == "Liga2", str(copia)[:200])
l1 = json.loads(llamar("GET", "/jugadores", o1)[1])
mias = [x for x in l1 if x.get("cedula") == ced]
esperar("org1 sigue viendo solo su ficha, sin cambios", len(mias) == 1 and mias[0]["apellido"] == j1["apellido"], str(mias)[:200])
esperar("org1 no ve la ficha de org2", not any(x.get("apellido") == "Liga2" for x in l1))

# Editar: no puede tomar la cédula de otro jugador propio, pero sí una que solo existe en otra liga
otro = json.loads(llamar("GET", f"/jugadores/{jug1[1]['idJugador']}", o1)[1])
s, t = llamar("PUT", f"/jugadores/{otro['idJugador']}", o1, campos={"Nombre": otro["nombre"], "Apellido": otro["apellido"], "Cedula": ced,
    "FechaNac": "1990-01-01", "IdPais": pais})
esperar("org1 no puede poner a un jugador la cédula de otro jugador suyo", s == 400 and "Ya tienes otro jugador" in t, f"{s} {t[:150]}")
s, t = nuevo(o2, eq2, cedula_valida(5550001), "SoloLiga2", 73)
s, t = llamar("PUT", f"/jugadores/{otro['idJugador']}", o1, campos={"Nombre": otro["nombre"], "Apellido": otro["apellido"], "Cedula": cedula_valida(5550001),
    "FechaNac": "1990-01-01", "IdPais": pais})
esperar("org1 puede usar una cédula que solo existe en la liga de org2", s == 200, f"{s} {t[:150]}")

# Árbitros
arb = lambda tok, cedula: llamar("POST", "/arbitros", tok, cuerpo={"nombre": "Juez", "apellido": "Compartido", "cedula": cedula, "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None})
s1, t1 = arb(o1, "0912345675"); s2, t2 = arb(o2, "0912345675")
esperar("el mismo árbitro se registra en las dos ligas", s1 in (200, 201) and s2 in (200, 201), f"{s1} {s2} {t2[:150]}")
s, t = arb(o2, "0912345675")
esperar("un árbitro no se repite dentro de la misma liga (400, no 500)", s == 400 and "Ya tienes un árbitro" in t, f"{s} {t[:150]}")
s, t = arb(o1, ced)
esperar("un árbitro puede tener la cédula de un jugador", s in (200, 201), f"{s} {t[:150]}")

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
