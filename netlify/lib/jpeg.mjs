import piexif from "piexifjs";

/** Dimensions réelles lues dans l'en-tête SOF du JPEG (et non dans une métadonnée). */
export function jpegSize(buf) {
  if (!buf || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

export function looksLikeJpeg(buf) {
  return buf.length > 1000 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

/**
 * Ajoute les métadonnées de copyright (EXIF). L'insertion est vérifiée :
 * si les dimensions réelles ou la structure du fichier changent, on garde
 * l'image d'origine intacte plutôt que de risquer un fichier corrompu.
 */
export function tagJpeg(buf) {
  try {
    const exif = {
      "0th": {
        [piexif.ImageIFD.Copyright]: "APY Musique - Amaury Plecety",
        [piexif.ImageIFD.Artist]: "APY Musique",
        [piexif.ImageIFD.ImageDescription]: "APY Musique - atelier de vente et reparation d'instruments, Bourg-Achard",
      },
      Exif: {}, GPS: {}, "1st": {}, thumbnail: null,
    };
    const inserted = Buffer.from(piexif.insert(piexif.dump(exif), buf.toString("binary")), "binary");
    const before = jpegSize(buf);
    const after = jpegSize(inserted);
    if (before && after && before.width === after.width && before.height === after.height && looksLikeJpeg(inserted)) {
      return { data: inserted, tagged: true };
    }
  } catch (e) { /* on retombe sur l'original */ }
  return { data: buf, tagged: false };
}
