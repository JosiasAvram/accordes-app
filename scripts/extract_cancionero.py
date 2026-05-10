"""
Extrae canciones de un cancionero .docx y genera archivos .txt
en el formato que entiende el script `npm run import-songs`.

Uso:
    pip install docx2txt
    python scripts/extract_cancionero.py "C:/ruta/al/Cancionero CD.docx" ./canciones-out/

Despues:
    npm run import-songs -- ./canciones-out/

Este script usa docx2txt en vez de python-docx porque maneja mejor los
hyperlinks internos / bookmarks que tiene el cancionero (anchors "Inicio").
"""

import os
import re
import sys
import unicodedata
from pathlib import Path

try:
    import docx2txt
except ImportError:
    print("Falta docx2txt. Instalalo con:")
    print("  pip install docx2txt")
    sys.exit(1)


# Header de cancion: "Inicio Inicio 1) Titulo - Artista" o variantes
SONG_HEADER = re.compile(
    r"^(?:Inicio\s*)+(\d+)\)\s*(.+?)\s*[-–]\s*(.+?)\s*$"
)

# Linea que es solo la palabra "Inicio" (link de navegacion)
NAV_LINE = re.compile(r"^\s*Inicio\s*$", re.IGNORECASE)


def slugify(text: str) -> str:
    """Convierte texto a nombre de archivo seguro."""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    return text[:80]


def extract_songs(docx_path: str):
    """Generador que yield dict {idx, title, artist, lines}."""
    raw = docx2txt.process(docx_path)
    # docx2txt usa \n y a veces \t
    lines = raw.replace("\r\n", "\n").split("\n")

    current_song = None

    for line in lines:
        text = line.rstrip()

        m = SONG_HEADER.match(text)
        if m:
            # Cerramos la anterior si habia
            if current_song is not None:
                yield current_song

            current_song = {
                "idx": int(m.group(1)),
                "title": m.group(2).strip(),
                "artist": m.group(3).strip(),
                "lines": [],
            }
            continue

        if current_song is not None:
            # Saltar lineas que son solo "Inicio" (navegacion)
            if NAV_LINE.match(text):
                continue
            current_song["lines"].append(text)

    if current_song is not None:
        yield current_song


def render_song_txt(song: dict) -> str:
    """Convierte el dict del song al formato txt esperado por import-songs."""
    title = song["title"].replace("\n", " ").strip()
    artist = song["artist"].replace("\n", " ").strip()

    out = []
    out.append(f"Title: {title}")
    out.append(f"Artist: {artist}")
    out.append("Key: C")
    out.append("Difficulty: intermedio")
    out.append("")
    out.append("[Verso]")

    # Comprimimos lineas vacias multiples a una sola
    prev_empty = False
    for line in song["lines"]:
        is_empty = (line.strip() == "")
        if is_empty and prev_empty:
            continue
        out.append(line.rstrip())
        prev_empty = is_empty

    return "\n".join(out) + "\n"


def main():
    if len(sys.argv) < 3:
        print("Uso: python extract_cancionero.py <archivo.docx> <carpeta-salida>")
        sys.exit(1)

    docx_path = sys.argv[1]
    output_dir = Path(sys.argv[2])

    if not os.path.exists(docx_path):
        print(f"No existe el archivo: {docx_path}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    seen_filenames = set()

    for song in extract_songs(docx_path):
        slug_title = slugify(song["title"])
        slug_artist = slugify(song["artist"])
        filename = f"{song['idx']:03d}-{slug_title}-{slug_artist}.txt"

        # Por si hay duplicados de slug
        suffix = 2
        while filename in seen_filenames:
            filename = f"{song['idx']:03d}-{slug_title}-{slug_artist}-{suffix}.txt"
            suffix += 1
        seen_filenames.add(filename)

        filepath = output_dir / filename
        filepath.write_text(render_song_txt(song), encoding="utf-8")
        count += 1
        print(f"OK  {filename}")

    print(f"\nTotal: {count} canciones extraidas a {output_dir.resolve()}")
    print(f"\nProximo paso:")
    print(f"   cd C:/dev/App_Notas/backend")
    print(f"   npm run import-songs -- {output_dir.resolve()}")


if __name__ == "__main__":
    main()
