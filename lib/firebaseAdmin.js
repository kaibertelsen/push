import admin from "firebase-admin";

let app;
if (!admin.apps.length) {
  const svc = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8")
  );
  app = admin.initializeApp({
    credential: admin.credential.cert(svc),
  });
}
export const messaging = admin.messaging();
export const firestore = admin.firestore?.() ?? null; // valgfritt
