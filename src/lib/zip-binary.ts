/** Cabecera local típica de un archivo en ZIP (no ejecutamos nada del archivo; solo lectura de bytes). */
export function isZipLocalFileHeader(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}
