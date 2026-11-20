/**
 * Exécuté une fois au démarrage du serveur : ouvre la base et applique les
 * migrations avant la première requête (et signale tout de suite une base
 * injoignable dans les journaux).
 */
export async function register() {
  // condition écrite ainsi pour que Next.js retire ce code de la version « edge »
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("@/lib/db");
    await getDb();
    console.log("Base de données prête.");
  }
}
