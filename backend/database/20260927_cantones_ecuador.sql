-- Cantones de Ecuador (223, segun el listado oficial vigente, incluye Borbon y Sevilla Don Bosco).
-- Idempotente: INSERT IGNORE sobre la clave unica (provincia, nombre). Requiere 20260927_pais_provincia_canton.sql.
SET NAMES utf8mb4;
SET @ec := (SELECT id_pais FROM pais WHERE nombre = 'Ecuador');

-- Azuay (15)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Azuay' AND id_pais = @ec)
FROM (
    SELECT 'Camilo Ponce Enríquez' AS n
    UNION ALL SELECT 'Chordeleg'
    UNION ALL SELECT 'Cuenca'
    UNION ALL SELECT 'El Pan'
    UNION ALL SELECT 'Girón'
    UNION ALL SELECT 'Guachapala'
    UNION ALL SELECT 'Gualaceo'
    UNION ALL SELECT 'Nabón'
    UNION ALL SELECT 'Oña'
    UNION ALL SELECT 'Paute'
    UNION ALL SELECT 'Pucará'
    UNION ALL SELECT 'San Fernando'
    UNION ALL SELECT 'Santa Isabel'
    UNION ALL SELECT 'Sevilla de Oro'
    UNION ALL SELECT 'Sígsig'
) t;

-- Bolívar (7)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Bolívar' AND id_pais = @ec)
FROM (
    SELECT 'Caluma' AS n
    UNION ALL SELECT 'Chillanes'
    UNION ALL SELECT 'Chimbo'
    UNION ALL SELECT 'Echeandía'
    UNION ALL SELECT 'Guaranda'
    UNION ALL SELECT 'Las Naves'
    UNION ALL SELECT 'San Miguel'
) t;

-- Carchi (6)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Carchi' AND id_pais = @ec)
FROM (
    SELECT 'Bolívar' AS n
    UNION ALL SELECT 'Espejo'
    UNION ALL SELECT 'Mira'
    UNION ALL SELECT 'Montúfar'
    UNION ALL SELECT 'San Pedro de Huaca'
    UNION ALL SELECT 'Tulcán'
) t;

-- Cañar (7)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Cañar' AND id_pais = @ec)
FROM (
    SELECT 'Azogues' AS n
    UNION ALL SELECT 'Biblián'
    UNION ALL SELECT 'Cañar'
    UNION ALL SELECT 'Déleg'
    UNION ALL SELECT 'El Tambo'
    UNION ALL SELECT 'La Troncal'
    UNION ALL SELECT 'Suscal'
) t;

-- Chimborazo (10)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Chimborazo' AND id_pais = @ec)
FROM (
    SELECT 'Alausí' AS n
    UNION ALL SELECT 'Chambo'
    UNION ALL SELECT 'Chunchi'
    UNION ALL SELECT 'Colta'
    UNION ALL SELECT 'Cumandá'
    UNION ALL SELECT 'Guamote'
    UNION ALL SELECT 'Guano'
    UNION ALL SELECT 'Pallatanga'
    UNION ALL SELECT 'Penipe'
    UNION ALL SELECT 'Riobamba'
) t;

-- Cotopaxi (7)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Cotopaxi' AND id_pais = @ec)
FROM (
    SELECT 'La Maná' AS n
    UNION ALL SELECT 'Latacunga'
    UNION ALL SELECT 'Pangua'
    UNION ALL SELECT 'Pujilí'
    UNION ALL SELECT 'Salcedo'
    UNION ALL SELECT 'Saquisilí'
    UNION ALL SELECT 'Sigchos'
) t;

-- El Oro (14)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'El Oro' AND id_pais = @ec)
FROM (
    SELECT 'Arenillas' AS n
    UNION ALL SELECT 'Atahualpa'
    UNION ALL SELECT 'Balsas'
    UNION ALL SELECT 'Chilla'
    UNION ALL SELECT 'El Guabo'
    UNION ALL SELECT 'Huaquillas'
    UNION ALL SELECT 'Las Lajas'
    UNION ALL SELECT 'Machala'
    UNION ALL SELECT 'Marcabelí'
    UNION ALL SELECT 'Pasaje'
    UNION ALL SELECT 'Piñas'
    UNION ALL SELECT 'Portovelo'
    UNION ALL SELECT 'Santa Rosa'
    UNION ALL SELECT 'Zaruma'
) t;

-- Esmeraldas (8)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Esmeraldas' AND id_pais = @ec)
FROM (
    SELECT 'Atacames' AS n
    UNION ALL SELECT 'Borbón'
    UNION ALL SELECT 'Eloy Alfaro'
    UNION ALL SELECT 'Esmeraldas'
    UNION ALL SELECT 'Muisne'
    UNION ALL SELECT 'Quinindé'
    UNION ALL SELECT 'Rioverde'
    UNION ALL SELECT 'San Lorenzo'
) t;

-- Galápagos (3)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Galápagos' AND id_pais = @ec)
FROM (
    SELECT 'Isabela' AS n
    UNION ALL SELECT 'San Cristóbal'
    UNION ALL SELECT 'Santa Cruz'
) t;

-- Guayas (25)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Guayas' AND id_pais = @ec)
FROM (
    SELECT 'Alfredo Baquerizo Moreno' AS n
    UNION ALL SELECT 'Balao'
    UNION ALL SELECT 'Balzar'
    UNION ALL SELECT 'Colimes'
    UNION ALL SELECT 'Coronel Marcelino Maridueña'
    UNION ALL SELECT 'Daule'
    UNION ALL SELECT 'Durán'
    UNION ALL SELECT 'El Empalme'
    UNION ALL SELECT 'El Triunfo'
    UNION ALL SELECT 'General Antonio Elizalde'
    UNION ALL SELECT 'Guayaquil'
    UNION ALL SELECT 'Isidro Ayora'
    UNION ALL SELECT 'Lomas de Sargentillo'
    UNION ALL SELECT 'Milagro'
    UNION ALL SELECT 'Naranjal'
    UNION ALL SELECT 'Naranjito'
    UNION ALL SELECT 'Nobol'
    UNION ALL SELECT 'Palestina'
    UNION ALL SELECT 'Pedro Carbo'
    UNION ALL SELECT 'Playas'
    UNION ALL SELECT 'Salitre'
    UNION ALL SELECT 'Samborondón'
    UNION ALL SELECT 'San Jacinto de Yaguachi'
    UNION ALL SELECT 'Santa Lucía'
    UNION ALL SELECT 'Simón Bolívar'
) t;

-- Imbabura (6)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Imbabura' AND id_pais = @ec)
FROM (
    SELECT 'Antonio Ante' AS n
    UNION ALL SELECT 'Cotacachi'
    UNION ALL SELECT 'Ibarra'
    UNION ALL SELECT 'Otavalo'
    UNION ALL SELECT 'Pimampiro'
    UNION ALL SELECT 'San Miguel de Urcuquí'
) t;

-- Loja (16)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Loja' AND id_pais = @ec)
FROM (
    SELECT 'Calvas' AS n
    UNION ALL SELECT 'Catamayo'
    UNION ALL SELECT 'Celica'
    UNION ALL SELECT 'Chaguarpamba'
    UNION ALL SELECT 'Espíndola'
    UNION ALL SELECT 'Gonzanamá'
    UNION ALL SELECT 'Loja'
    UNION ALL SELECT 'Macará'
    UNION ALL SELECT 'Olmedo'
    UNION ALL SELECT 'Paltas'
    UNION ALL SELECT 'Pindal'
    UNION ALL SELECT 'Puyango'
    UNION ALL SELECT 'Quilanga'
    UNION ALL SELECT 'Saraguro'
    UNION ALL SELECT 'Sozoranga'
    UNION ALL SELECT 'Zapotillo'
) t;

-- Los Ríos (13)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Los Ríos' AND id_pais = @ec)
FROM (
    SELECT 'Baba' AS n
    UNION ALL SELECT 'Babahoyo'
    UNION ALL SELECT 'Buena Fe'
    UNION ALL SELECT 'Mocache'
    UNION ALL SELECT 'Montalvo'
    UNION ALL SELECT 'Palenque'
    UNION ALL SELECT 'Puebloviejo'
    UNION ALL SELECT 'Quevedo'
    UNION ALL SELECT 'Quinsaloma'
    UNION ALL SELECT 'Urdaneta'
    UNION ALL SELECT 'Valencia'
    UNION ALL SELECT 'Ventanas'
    UNION ALL SELECT 'Vinces'
) t;

-- Manabí (22)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Manabí' AND id_pais = @ec)
FROM (
    SELECT 'Bolívar' AS n
    UNION ALL SELECT 'Chone'
    UNION ALL SELECT 'El Carmen'
    UNION ALL SELECT 'Flavio Alfaro'
    UNION ALL SELECT 'Jama'
    UNION ALL SELECT 'Jaramijó'
    UNION ALL SELECT 'Jipijapa'
    UNION ALL SELECT 'Junín'
    UNION ALL SELECT 'Manta'
    UNION ALL SELECT 'Montecristi'
    UNION ALL SELECT 'Olmedo'
    UNION ALL SELECT 'Paján'
    UNION ALL SELECT 'Pedernales'
    UNION ALL SELECT 'Pichincha'
    UNION ALL SELECT 'Portoviejo'
    UNION ALL SELECT 'Puerto López'
    UNION ALL SELECT 'Rocafuerte'
    UNION ALL SELECT 'San Vicente'
    UNION ALL SELECT 'Santa Ana'
    UNION ALL SELECT 'Sucre'
    UNION ALL SELECT 'Tosagua'
    UNION ALL SELECT 'Veinticuatro de Mayo'
) t;

-- Morona Santiago (13)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Morona Santiago' AND id_pais = @ec)
FROM (
    SELECT 'Gualaquiza' AS n
    UNION ALL SELECT 'Huamboya'
    UNION ALL SELECT 'Limón Indanza'
    UNION ALL SELECT 'Logroño'
    UNION ALL SELECT 'Morona'
    UNION ALL SELECT 'Pablo Sexto'
    UNION ALL SELECT 'Palora'
    UNION ALL SELECT 'San Juan Bosco'
    UNION ALL SELECT 'Santiago'
    UNION ALL SELECT 'Sevilla Don Bosco'
    UNION ALL SELECT 'Sucúa'
    UNION ALL SELECT 'Taisha'
    UNION ALL SELECT 'Tiwintza'
) t;

-- Napo (5)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Napo' AND id_pais = @ec)
FROM (
    SELECT 'Archidona' AS n
    UNION ALL SELECT 'Carlos Julio Arosemena Tola'
    UNION ALL SELECT 'El Chaco'
    UNION ALL SELECT 'Quijos'
    UNION ALL SELECT 'Tena'
) t;

-- Orellana (4)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Orellana' AND id_pais = @ec)
FROM (
    SELECT 'Aguarico' AS n
    UNION ALL SELECT 'Francisco de Orellana'
    UNION ALL SELECT 'La Joya de los Sachas'
    UNION ALL SELECT 'Loreto'
) t;

-- Pastaza (4)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Pastaza' AND id_pais = @ec)
FROM (
    SELECT 'Arajuno' AS n
    UNION ALL SELECT 'Mera'
    UNION ALL SELECT 'Pastaza'
    UNION ALL SELECT 'Santa Clara'
) t;

-- Pichincha (8)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Pichincha' AND id_pais = @ec)
FROM (
    SELECT 'Cayambe' AS n
    UNION ALL SELECT 'Mejía'
    UNION ALL SELECT 'Pedro Moncayo'
    UNION ALL SELECT 'Pedro Vicente Maldonado'
    UNION ALL SELECT 'Puerto Quito'
    UNION ALL SELECT 'Quito'
    UNION ALL SELECT 'Rumiñahui'
    UNION ALL SELECT 'San Miguel de Los Bancos'
) t;

-- Santa Elena (3)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Santa Elena' AND id_pais = @ec)
FROM (
    SELECT 'La Libertad' AS n
    UNION ALL SELECT 'Salinas'
    UNION ALL SELECT 'Santa Elena'
) t;

-- Santo Domingo de los Tsáchilas (2)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Santo Domingo de los Tsáchilas' AND id_pais = @ec)
FROM (
    SELECT 'La Concordia' AS n
    UNION ALL SELECT 'Santo Domingo'
) t;

-- Sucumbíos (7)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Sucumbíos' AND id_pais = @ec)
FROM (
    SELECT 'Cascales' AS n
    UNION ALL SELECT 'Cuyabeno'
    UNION ALL SELECT 'Gonzalo Pizarro'
    UNION ALL SELECT 'Lago Agrio'
    UNION ALL SELECT 'Putumayo'
    UNION ALL SELECT 'Shushufindi'
    UNION ALL SELECT 'Sucumbíos'
) t;

-- Tungurahua (9)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Tungurahua' AND id_pais = @ec)
FROM (
    SELECT 'Ambato' AS n
    UNION ALL SELECT 'Baños de Agua Santa'
    UNION ALL SELECT 'Cevallos'
    UNION ALL SELECT 'Mocha'
    UNION ALL SELECT 'Patate'
    UNION ALL SELECT 'Quero'
    UNION ALL SELECT 'San Pedro de Pelileo'
    UNION ALL SELECT 'Santiago de Píllaro'
    UNION ALL SELECT 'Tisaleo'
) t;

-- Zamora Chinchipe (9)
INSERT IGNORE INTO canton (nombre, id_provincia)
SELECT t.n, (SELECT id_provincia FROM provincia WHERE nombre = 'Zamora Chinchipe' AND id_pais = @ec)
FROM (
    SELECT 'Centinela del Cóndor' AS n
    UNION ALL SELECT 'Chinchipe'
    UNION ALL SELECT 'El Pangui'
    UNION ALL SELECT 'Nangaritza'
    UNION ALL SELECT 'Palanda'
    UNION ALL SELECT 'Paquisha'
    UNION ALL SELECT 'Yacuambi'
    UNION ALL SELECT 'Yantzaza'
    UNION ALL SELECT 'Zamora'
) t;
