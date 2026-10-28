// Para un partido jugado: el equipo que perdió se ve atenuado (en un empate, ninguno).
export const perdio = (propios, rivales) => propios != null && rivales != null && propios < rivales
