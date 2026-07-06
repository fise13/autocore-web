/**
 * One-shot notification seed for a company (bypasses server-only imports).
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./...json npx tsx scripts/seed-notifications-now.ts <companyId> [ownerUid]
 */
import { readFileSync } from "node:fs";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function init() {
  if (getApps().length) return;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!path) throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH required");
  initializeApp({ credential: cert(JSON.parse(readFileSync(path, "utf8"))) });
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  employee: "Сотрудник",
  mechanic: "Механик",
  accountant: "Бухгалтер",
  diagnostician: "Диагност",
};

async function createNotification(
  db: FirebaseFirestore.Firestore,
  params: Record<string, unknown>,
): Promise<string> {
  const ref = db.collection("notifications").doc();
  const payload: Record<string, unknown> = {
    id: ref.id,
    state: "unread",
    deepLink: "autocoremobile://profile/team",
    channelsDelivered: ["inbox", "push"],
    createdAt: new Date().toISOString(),
    ...params,
  };
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }
  await ref.set(payload);
  return ref.id;
}

async function main() {
  init();
  const db = getFirestore();
  const companyId = process.argv[2];
  if (!companyId) throw new Error("companyId required");

  const companySnap = await db.collection("companies").doc(companyId).get();
  if (!companySnap.exists) throw new Error("company not found");
  const companyName = String(companySnap.data()?.name ?? "Компания");
  const ownerId = String(companySnap.data()?.ownerId ?? process.argv[3] ?? "");

  const employeesSnap = await db
    .collection("companies")
    .doc(companyId)
    .collection("employees")
    .where("isActive", "==", true)
    .get();

  let created = 0;

  for (const employeeDoc of employeesSnap.docs) {
    if (employeeDoc.id === ownerId) continue;
    const data = employeeDoc.data();
    const displayName =
      String(data.fullName ?? "").trim() || String(data.email ?? "").trim() || "Сотрудник";
    const roleLabel = ROLE_LABELS[String(data.role ?? "employee")] ?? String(data.role ?? "employee");

    const id = await createNotification(db, {
      userId: ownerId,
      companyId,
      eventType: "employee.joined_by_invite",
      category: "team",
      priority: "high",
      title: "Новый сотрудник",
      body: `${displayName} присоединился к команде`,
      aggregateType: "employee",
      aggregateId: employeeDoc.id,
      actorUserId: employeeDoc.id,
      actorName: displayName,
      eventId: `seed:joined:${employeeDoc.id}`,
      });
    console.log("created joined notification:", id, displayName);
    created += 1;
  }

  const invitesSnap = await db
    .collection("invites")
    .where("companyId", "==", companyId)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data();
    const email = String(invite.email ?? "").trim();
    const code = String(invite.code ?? "");
    const roleLabel = ROLE_LABELS[String(invite.role ?? "employee")] ?? "Сотрудник";
    const summary = email
      ? `Приглашение отправлено на ${email}`
      : `Создан код приглашения ${code}`;

    const id = await createNotification(db, {
      userId: ownerId,
      companyId,
      eventType: "employee.invited",
      category: "team",
      priority: "medium",
      title: "Приглашение в команду",
      body: summary,
      aggregateType: "invite",
      aggregateId: inviteDoc.id,
      actorUserId: ownerId,
      eventId: `seed:invited:${inviteDoc.id}`,
    });
    console.log("created invite notification:", id, summary);
    created += 1;
  }

  if (ownerId) {
    await db
      .collection("users")
      .doc(ownerId)
      .collection("memberships")
      .doc(companyId)
      .set(
        {
          companyId,
          role: "owner",
          name: companyName,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      );
    console.log("recorded owner membership");
  }

  const count = await db.collection("notifications").where("userId", "==", ownerId).count().get();
  console.log(`\nDone. created=${created}, owner notifications now=${count.data().count}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
