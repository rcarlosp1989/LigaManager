"""Auditoría UX: prepara invitaciones y enlaces para recorrer la app como cada rol."""
import json, sys, urllib.request, urllib.error

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))

def llamar(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t

o1 = llamar("POST", "/auth/login", {"email": "org1@prueba.ec", "password": "clave123"})[1]["token"]
A = D["campA"]
salida = {"campA": A, "campB": D["campB"]}

s, inv = llamar("POST", f"/campeonatos/{A}/vocales/invitaciones", {"tipo": "Titular"}, o1)
if s != 200:
    s, inv = llamar("POST", f"/campeonatos/{A}/vocales/invitaciones", {"tipo": "Reemplazo", "fecha": D["hoy"]}, o1)
print("vocal", s, str(inv)[:200])
salida["vocal"] = inv.get("codigo") if isinstance(inv, dict) else None

_, camp = llamar("GET", f"/campeonatos/{A}", token=o1)
for e in camp["equipos"]:
    s, inv = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", {"idEquipo": e["idEquipo"]}, o1)
    print("dirigente", e["nombre"], s, str(inv)[:120])
    if s == 200:
        salida["dirigente"] = inv["codigo"]; break

s, e = llamar("POST", f"/campeonatos/{A}/enlace-publico", None, o1)
print("enlace", s, str(e)[:300])
if isinstance(e, dict):
    for k, v in e.items():
        if isinstance(v, str) and "token" in k.lower(): salida[k] = v
json.dump(salida, open("auditoria_datos.json", "w"))
print(json.dumps(salida))
