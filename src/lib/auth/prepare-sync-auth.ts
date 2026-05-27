import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { ensureRbacBootstrap } from "@/infrastructure/firestore/rbac-bootstrap";

export async function prepareSyncAuth(uid: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || user.uid !== uid) return;

  await ensureRbacBootstrap(uid);
  await user.getIdToken(true);
}
