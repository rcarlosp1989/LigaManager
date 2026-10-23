"""Prueba temporal: jugadores con documento pendiente."""
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

org = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})[1]["token"]
pais = llamar("GET", "/catalogos/paises", org)[1][0]["idPais"]
_, camp = llamar("GET", f"/campeonatos/{D['campA']}", org)
eq = camp["equipos"][0]["idEquipo"]
base = lambda nombre, **extra: {"Nombre": nombre, "Apellido": "Pendiente", "FechaNac": "1998-03-03", "IdPais": pais,
                                "IdEquipo": eq, "FechaDesde": D["hoy"], "Posicion": "Volante", **extra}

s, j1 = llamar("POST", "/jugadores", org, campos=base("Uno", TipoIdentificacion="Pendiente", Cedula=""))
esperar("se registra un jugador con documento pendiente (número vacío)", s in (200, 201) and j1.get("tipoIdentificacion") == "Pendiente" and j1.get("cedula") == "", f"{s} {str(j1)[:200]}")
s, j2 = llamar("POST", "/jugadores", org, campos=base("Dos", TipoIdentificacion="Pendiente"))
esperar("otro jugador pendiente, sin enviar el número, no choca con el primero", s in (200, 201) and j2.get("tipoIdentificacion") == "Pendiente", f"{s} {str(j2)[:200]}")
s, j3 = llamar("POST", "/jugadores", org, campos=base("Tres", TipoIdentificacion="Pendiente", Cedula="0912345675"))
esperar("si es pendiente, el número que llegue se descarta", s in (200, 201) and j3.get("cedula") == "", f"{s} {str(j3)[:200]}")
s, r = llamar("POST", "/jugadores", org, campos=base("Cuatro", TipoIdentificacion="Cedula", Cedula=""))
esperar("con tipo Cédula, el número sigue siendo obligatorio", s == 400, f"{s} {r}")
s, r = llamar("POST", "/jugadores", org, campos=base("Cinco", TipoIdentificacion="Cedula", Cedula="0912345670"))
esperar("una cédula inválida sigue rechazándose", s == 400, f"{s} {r}")

_, nom = llamar("GET", f"/equipos/{eq}", org)
fila = next((x for x in nom["jugadores"] if x["idJugador"] == j1["idJugador"]), None)
esperar("la nómina muestra el tipo Pendiente", fila and fila["tipoIdentificacion"] == "Pendiente" and fila["cedula"] == "", str(fila))
_, lista = llamar("GET", "/jugadores", org)
esperar("la lista de jugadores trae el tipo Pendiente", any(x["idJugador"] == j1["idJugador"] and x["tipoIdentificacion"] == "Pendiente" for x in lista))

# Completar el documento.
ced = cedula_valida(6262)
s, u = llamar("PUT", f"/jugadores/{j1['idJugador']}", org, campos={"Nombre": "Uno", "Apellido": "Pendiente", "Cedula": ced, "FechaNac": "1998-03-03",
                                                                  "IdPais": pais, "Posicion": "Volante", "TipoIdentificacion": "Cedula"})
esperar("se completa la cédula con Editar", s == 200 and u["tipoIdentificacion"] == "Cedula" and u["cedula"] == ced, f"{s} {str(u)[:200]}")
s, u = llamar("PUT", f"/jugadores/{j2['idJugador']}", org, campos={"Nombre": "Dos", "Apellido": "Pendiente", "Cedula": ced, "FechaNac": "1998-03-03",
                                                                  "IdPais": pais, "Posicion": "Volante", "TipoIdentificacion": "Cedula"})
esperar("la regla de documentos repetidos sigue funcionando", s == 400 and "documento" in str(u), f"{s} {u}")
s, u = llamar("PUT", f"/jugadores/{j1['idJugador']}", org, campos={"Nombre": "Uno", "Apellido": "Pendiente", "FechaNac": "1998-03-03",
                                                                  "IdPais": pais, "Posicion": "Volante", "TipoIdentificacion": "Pendiente"})
esperar("se puede volver a dejar pendiente", s == 200 and u["tipoIdentificacion"] == "Pendiente" and u["cedula"] == "", f"{s} {str(u)[:200]}")

s, r = llamar("POST", "/arbitros", org, cuerpo={"nombre": "Of", "apellido": "Pend", "cedula": "x", "tipoIdentificacion": "Pendiente", "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None})
esperar("un oficial no usa «Pendiente»", s == 400, f"{s} {r}")

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
