-- Extensiones necesarias.
--
-- postgis: consultas geográficas sobre aeropuertos y distancias geodésicas.
-- citext:  correos electrónicos insensibles a mayúsculas sin duplicar índices.
-- pgcrypto: gen_random_uuid() para identificadores generados en servidor.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
