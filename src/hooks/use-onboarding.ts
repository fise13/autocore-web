"use client";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getFirestoreDb } from "@/infrastructure/firebase/client";

export function useOnboarding(uid: string) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const db = useMemo(() => getFirestoreDb(), []);

  useEffect(() => {
    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setCompleted(false);
          return;
        }
        const data = snap.data() as { onboardingCompleted?: boolean };
        setCompleted(data.onboardingCompleted ?? true);
      },
      () => setCompleted(true),
    );

    return () => unsubscribe();
  }, [db, uid]);

  const completeOnboarding = useCallback(async () => {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { onboardingCompleted: true });
    setCompleted(true);
  }, [db, uid]);

  return {
    isLoading: completed === null,
    isCompleted: completed ?? true,
    completeOnboarding,
  };
}
