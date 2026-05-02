# Backend — App de Letras y Acordes

API REST en NestJS + MongoDB.

## Requisitos

- Node.js 20+
- MongoDB local **o** MongoDB Atlas (gratis)
- npm 10+

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Editá .env con tu cadena de conexión a MongoDB
```

### Opción A — MongoDB local

Instalá MongoDB Community y dejá la URL por defecto en `.env`:

```
MONGODB_URI=mongodb://localhost:27017/acordes-app
```

### Opción B — MongoDB Atlas (recomendado para empezar)

1. Crear cuenta en https://cloud.mongodb.com (free tier)
2. Crear cluster M0 (gratis, 512 MB)
3. Database Access → crear usuario con password
4. Network Access → permitir tu IP (o `0.0.0.0/0` solo en desarrollo)
5. Copiar la connection string a `MONGODB_URI` en `.env`

## Ejecutar

```bash
# Sembrar admin y acordes básicos (la primera vez)
npm run seed

# Levantar servidor en modo desarrollo (hot reload)
npm run start:dev
```

El servidor queda en `http://localhost:3000/api/v1` y la documentación Swagger en `http://localhost:3000/api/docs`.

## Probar la API

### Login admin

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acordes-app.com","password":"cambiar-en-primer-login"}'
```

Respuesta:

```json
{
  "access_token": "eyJ...",
  "user": { "id": "...", "email": "...", "name": "Admin", "role": "admin" }
}
```

### Crear canción (admin)

```bash
curl -X POST http://localhost:3000/api/v1/songs \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d @cancion-ejemplo.json
```

### Buscar canciones (público)

```bash
curl "http://localhost:3000/api/v1/songs/search?q=ejemplo"
```

### Transponer canción

```bash
curl "http://localhost:3000/api/v1/songs/SONG_ID/transpose?semitones=2"
```

## Estructura

```
src/
├── auth/           # JWT + guards de roles
├── users/          # Esquema y servicio de usuarios
├── songs/          # CRUD de canciones + búsqueda
├── chords/         # Catálogo de acordes con diagramas
├── genres/         # Listado de géneros disponibles
├── common/         # Servicios compartidos
│   ├── services/
│   │   ├── transposer.service.ts       # Lógica de transposición
│   │   └── chord-parser.service.ts     # Parser texto plano → JSON
│   └── utils/
│       └── slugify.ts                   # URLs amigables
├── scripts/
│   └── seed.ts     # Carga inicial (admin + acordes básicos)
├── app.module.ts
└── main.ts
```

## Tests

```bash
# Tests unitarios (transposición)
npm test

# Coverage
npm run test:cov
```

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST   | `/auth/login` | — | Login, devuelve JWT |
| GET    | `/auth/me` | JWT | Datos del usuario logueado |
| GET    | `/songs` | — | Listado paginado |
| GET    | `/songs/search?q=...` | — | Búsqueda full-text |
| GET    | `/songs/:id` | — | Detalle de canción |
| GET    | `/songs/:id/transpose?semitones=N` | — | Canción transpuesta |
| POST   | `/songs` | Admin | Crear canción |
| PUT    | `/songs/:id` | Admin | Editar canción |
| DELETE | `/songs/:id` | Admin | Eliminar canción |
| GET    | `/chords` | — | Catálogo de acordes |
| GET    | `/chords/:name` | — | Diagrama de un acorde |
| GET    | `/chords/categories` | — | Acordes agrupados |
| GET    | `/genres` | — | Géneros con conteo |
