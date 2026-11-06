import sharp from "sharp";

// Maior lado da imagem final. 1600px cobre o card do catálogo e o destaque da home com folga em telas retina.
export const MAX_IMAGE_SIDE = 1600;
const WEBP_QUALITY = 82;
// Limite de pixels aceitos na entrada, para evitar imagens gigantes que estourem a memória.
const MAX_INPUT_PIXELS = 50_000_000;

export type OptimizedImage = { buffer: Buffer; width: number; height: number };

/**
 * Converte qualquer JPG/PNG/WebP para WebP otimizado:
 * aplica a rotação do EXIF (fotos de celular), limita o maior lado, remove metadados
 * (inclusive localização GPS) e comprime. Retorna null se o arquivo não for uma imagem válida.
 */
export async function optimizeImage(input: Buffer): Promise<OptimizedImage | null> {
  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}
