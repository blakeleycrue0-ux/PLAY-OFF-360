/**
 * Lector de CSV conforme a RFC 4180: comillas, comillas escapadas duplicadas y
 * saltos de línea dentro de un campo.
 *
 * Se implementa aquí en vez de traer una dependencia porque el proyecto lee
 * exactamente dos ficheros y el formato está fijado por la fuente.
 */
export function parseCsv(text: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? '';

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    switch (char) {
      case '"':
        inQuotes = true;
        break;
      case ',':
        row.push(field);
        field = '';
        break;
      case '\r':
        break;
      case '\n':
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        break;
      default:
        field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Convierte un CSV con cabecera en registros indexados por nombre de columna. */
export function parseCsvRecords(text: string): readonly Readonly<Record<string, string>>[] {
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  if (header === undefined) return [];

  return body
    .filter((row) => row.length >= header.length - 1)
    .map((row) => {
      const record: Record<string, string> = {};
      header.forEach((column, index) => {
        record[column] = row[index] ?? '';
      });
      return record;
    });
}
