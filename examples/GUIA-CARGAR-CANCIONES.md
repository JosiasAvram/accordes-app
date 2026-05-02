# Guía rápida — cómo cargar canciones

Tenés dos formatos posibles. **Recomiendo el formato texto** porque es muchísimo más rápido de escribir.

## Formato 1 — Texto plano (recomendado)

Es el clásico que ves en cualquier sitio de letras: los acordes arriba, la letra debajo. Cada par "línea de acordes + línea de letra" se interpreta automáticamente — los acordes quedan alineados al caracter exacto donde los pongas.

### Estructura básica

```
Title: Titulo de la cancion
Artist: Nombre del artista
Genre: rock-nacional
Key: C
Capo: 0
Difficulty: principiante

[Intro]
C    G    Am

[Verso 1]
C            G
Esta es la primera linea
Am           F
Esta es la segunda linea

[Estribillo]
F        C
Estribillo aca
```

### Reglas del formato

- **Header arriba** con `Title:`, `Artist:`, etc. (los únicos obligatorios son `Title` y `Artist`).
- **Secciones entre corchetes**: `[Intro]`, `[Verso 1]`, `[Estribillo]`, `[Puente]`, `[Solo]`, `[Outro]`. Mayúsculas no importan.
- **Líneas de acordes**: se detectan automáticamente porque tienen solo nombres de acordes válidos (A, B, C, D, E, F, G con # o b, sufijos m/m7/maj7/sus4/etc, y barras `/` para slash chords).
- **Líneas de letra**: cualquier otra cosa.
- **Líneas vacías** se mantienen como separadores.

### Ejemplo de slash chord

```
C/G        F
Letra con un slash chord
```

## Formato 2 — JSON (más control)

Si necesitás algo que el formato texto no soporta bien (acordes en posiciones complicadas, secciones especiales, etc.) podés escribir el JSON directamente.

Mirá `cancion-ejemplo.json` para el formato completo.

## Cómo cargar una canción

### Opción A — Script de import (recomendado para varios archivos)

Poné todos tus archivos `.txt` en una carpeta y corré:

```bash
cd backend
npm run import-songs -- ./mis-canciones/
```

El script va a leer cada archivo, parsearlo y subirlo vía API. Te dice cuáles funcionaron y cuáles fallaron.

### Opción B — API directa (canción a canción)

```bash
# 1) Login para obtener el token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acordes-app.com","password":"tu-password"}' \
  | jq -r '.access_token')

# 2) Subir canción
curl -X POST http://localhost:3000/api/v1/songs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @cancion-ejemplo.json
```

### Opción C — Swagger UI (sin línea de comandos)

1. Ir a `http://localhost:3000/api/docs`
2. Click en **POST `/auth/login`** → **Try it out** → poner email/password → ejecutar
3. Copiar el `access_token` de la respuesta
4. Click en el botón **Authorize** (arriba a la derecha) → pegar el token → cerrar
5. Click en **POST `/songs`** → **Try it out** → pegar el JSON → ejecutar

## Importante sobre derechos de autor

Las letras de canciones publicadas tienen derechos de autor. Solo cargá:

- Canciones **tuyas** (composiciones propias)
- Canciones de **dominio público** (música tradicional, anónima, antigua)
- Canciones para las que tengas **autorización expresa** del autor o de la editorial
- O contenido bajo **licencia abierta** (Creative Commons, etc.)

Si planeás abrir la app a la comunidad para que carguen contenido, vas a necesitar:
- Términos y condiciones claros
- Sistema de takedown (DMCA) por reportes
- Posiblemente contratos con sociedades de gestión (SADAIC en Argentina)

Esto se resuelve en una fase posterior, no en el MVP.
