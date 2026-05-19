import sharp from "sharp";

type PlanUser = { id: string; isPro: boolean };

const MAX_WIDTH = 2000;
const MAX_HEIGHT = 3000;

export async function watermarkImage(
  buffer: Buffer,
  _user: PlanUser
): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    // Solo redimensionar si supera los límites
    if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
      return buffer;
    }

    // Redimensionar manteniendo proporción, sin upscaling
    const resized = await image
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    return resized;
  } catch {
    // Si sharp falla por cualquier motivo, devolver el buffer original
    return buffer;
  }
}
