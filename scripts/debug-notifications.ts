import { readFileSync } from "node:fs";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!path) throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH required");

  if (!getApps().length) {
    const sa = JSON.parse(readFileSync(path, "utf8"));
    initializeApp({ credential: cert(sa) });
  }

  const db = getFirestore();
  const email = process.argv[2] ?? "victhewise@icloud.com";

  const users = await db.collection("users").where("email", "==", email).limit(3).get();
  console.log("users found:", users.size);

  for (const userDoc of users.docs) {
    const data = userDoc.data();
    console.log("\n=== USER ===");
    console.log("UID:", userDoc.id);
    console.log("companyId:", data.companyId);
    console.log("role:", data.role);

    const notifs = await db.collection("notifications").where("userId", "==", userDoc.id).get();
    console.log("notifications:", notifs.size);
    for (const notif of notifs.docs.slice(0, 15)) {
      const item = notif.data();
      console.log(
        ` - [${item.state}] ${item.eventType}: ${item.title} | company=${item.companyId}`,
      );
    }

    const memberships = await db.collection("users").doc(userDoc.id).collection("memberships").get();
    console.log("memberships:", memberships.size);
    for (const membership of memberships.docs) {
      console.log(` - ${membership.id} role=${membership.data().role}`);
    }

    const devices = await db.collection("users").doc(userDoc.id).collection("devices").get();
    console.log("push devices:", devices.size);
    for (const device of devices.docs) {
      const item = device.data();
      const token = String(item.pushToken ?? "");
      console.log(
        ` - ${device.id} platform=${item.platform} token=${token.slice(0, 32)}${token.length > 32 ? "…" : ""}`,
      );
    }

    const owned = await db.collection("companies").where("ownerId", "==", userDoc.id).get();
    console.log("owned companies:", owned.size);
    for (const company of owned.docs) {
      console.log(` - ${company.id}: ${company.data().name}`);
    }
  }

  const total = await db.collection("notifications").count().get();
  console.log("\ntotal notifications in project:", total.data().count);

  const recentInvites = await db
    .collection("invites")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();
  console.log("\nrecent invites:", recentInvites.size);
  for (const invite of recentInvites.docs) {
    const item = invite.data();
    console.log(
      ` - ${invite.id} company=${item.companyId} status=${item.status} email=${item.email ?? "(code)"} code=${item.code}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
