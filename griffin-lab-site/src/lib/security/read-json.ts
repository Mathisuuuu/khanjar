import "server-only";

/**
 * Lit le corps JSON d'une requête sans dépasser `maxBytes` : un corps énorme
 * (envoyé pour saturer la mémoire) est coupé dès la limite, avant d'être analysé.
 * Renvoie `undefined` si le corps est trop gros ou n'est pas du JSON.
 */
export async function readJson(request: Request, maxBytes = 128 * 1024): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes || !request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}
