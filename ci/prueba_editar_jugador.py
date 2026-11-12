"""Prueba temporal: solo organizador y administrador editan jugadores."""
import json, subprocess, sys, urllib.request, urllib.error, uuid

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def llamar(metodo, ruta, token=None, cuerpo=None, campos=None):
    h = {}
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
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

def sql(q):
    subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-e", q], check=True, capture_output=True)

login = lambda e: json.loads(llamar("POST", "/auth/login", cuerpo={"email": e, "password": "clave123"})[1])["token"]
EMAIL = "org1@prueba.ec"
o1 = login(EMAIL)
equipos = [e["idEquipo"] for e in json.loads(llamar("GET", "/equipos", o1)[1])]
idj = next(js[0]["idJugador"] for js in (json.loads(llamar("GET", f"/equipos/{e}", o1)[1]).get("jugadores") or [] for e in equipos) if js)
j = json.loads(llamar("GET", f"/jugadores/{idj}", o1)[1])
actual = next((h for h in j.get("historial", []) if not h.get("fechaHasta")), {})
campos = lambda apellido: {"Nombre": j["nombre"], "Apellido": apellido, "Cedula": j["cedula"] or "", "TipoIdentificacion": j.get("tipoIdentificacion") or "Cedula",
    "FechaNac": j["fechaNac"], "IdPais": j["idPais"], "IdCanton": j.get("idCanton") or "", "Posicion": actual.get("posicion") or "", "Dorsal": actual.get("dorsal") or ""}

try:
    s, t = llamar("PUT", f"/jugadores/{idj}", o1, campos=campos("EditadoOrg"))
    esperar("organizador edita un jugador de su liga", s == 200 and "EditadoOrg" in t, f"{s} {t[:200]}")
    for rol in ["Arbitro", "Veedor", "Delegado", "Vocal", "Dirigente"]:
        sql(f"UPDATE usuario SET rol = '{rol}' WHERE email = '{EMAIL}'")
        tok = login(EMAIL)
        s, t = llamar("PUT", f"/jugadores/{idj}", tok, campos=campos("Intruso"))
        s2, _ = llamar("PATCH", f"/jugadores/{idj}/dorsal", tok, cuerpo={"dorsal": 98})
        esperar(f"{rol}: no puede editar jugadores ni dorsales (403)", s == 403 and s2 == 403, f"{s} {s2}")
    sql(f"UPDATE usuario SET rol = 'Admin' WHERE email = '{EMAIL}'")
    tok = login(EMAIL)
    s, t = llamar("PUT", f"/jugadores/{idj}", tok, campos=campos("EditadoAdmin"))
    esperar("administrador edita un jugador", s == 200 and "EditadoAdmin" in t, f"{s} {t[:200]}")
finally:
    sql(f"UPDATE usuario SET rol = 'Organizador' WHERE email = '{EMAIL}'")
    llamar("PUT", f"/jugadores/{idj}", login(EMAIL), campos=campos(j["apellido"]))

final = json.loads(llamar("GET", f"/jugadores/{idj}", login(EMAIL))[1])
esperar("nadie más cambió el jugador (apellido restaurado)", final["apellido"] == j["apellido"], final["apellido"])
print(f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
