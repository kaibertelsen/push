import { firestore } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // TODO: Bytt til JWT/verifisering av klient (for eksempel din egen API-nøkkel i header)
  const { userId, deviceId, platform, token } = req.body || {};
  if (!firestore) return res.status(500).json({ error: "Firestore not configured on server" });
  if (!userId || !deviceId || !platform || !token) {
    return res.status(400).json({ error: "Missing fields: userId, deviceId, platform, token" });
  }

  await firestore
    .collection("pushTokens")
    .doc(`${userId}_${deviceId}`)
    .set({ userId, deviceId, platform, token, updatedAt: Date.now() });

  res.json({ ok: true });
}
