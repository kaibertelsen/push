import { messaging, firestore } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // SIKKERHET: verifiser en delt nøkkel eller JWT
  const apiKey = req.headers["x-api-key"];
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { to, topic, title, body, data } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: "Missing title/body" });

  try {
    let tokens = [];

    if (Array.isArray(to) && to.length) {
      tokens = to;
    } else if (typeof to === "string" && firestore) {
      // Praktisk alias: send til alle enheter for userId
      const snap = await firestore.collection("pushTokens")
        .where("userId", "==", to).get();
      tokens = snap.docs.map(d => d.data().token);
    }

    // Vil du sende til topic i stedet? (klient kan subscribe til topic via FCM)
    if (topic) {
      const resp = await messaging.send({
        topic,
        notification: { title, body },
        data: sanitizeData(data),
      });
      return res.json({ ok: true, multicast: false, messageId: resp });
    }

    if (!tokens.length) return res.status(400).json({ error: "No tokens resolved" });

    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: sanitizeData(data),
      android: { priority: "high" },
      apns: {
        payload: { aps: { sound: "default" } },
        headers: { "apns-priority": "10" }
      },
      webpush: {
        headers: { Urgency: "high" },
        // valgfritt: badge/icon/sound
      }
    });

    res.json({
      ok: true,
      multicast: true,
      successCount: resp.successCount,
      failureCount: resp.failureCount,
      responses: resp.responses.map(r => ({ success: r.success, error: r.error?.message }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

function sanitizeData(obj) {
  if (!obj) return undefined;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    // FCM data må være strenger
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}
