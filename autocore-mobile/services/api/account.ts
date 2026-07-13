import { updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { createLocalFileFormData } from '@/lib/network/mobile-form-data';
import { mobileApi } from '@/services/api/endpoints';
import { mobileUpload } from '@/services/api/mobile-client';
import { getFirebaseAuth, getFirebaseDb } from '@/services/firebase';

type AvatarUploadResult = {
  photoURL: string;
  storage: 'cloud' | 'inline';
};

export async function uploadUserAvatar(uri: string): Promise<string> {
  const result = await mobileUpload<AvatarUploadResult>(
    mobileApi.accountAvatar,
    createLocalFileFormData('file', uri),
  );
  const photoURL = result.photoURL?.trim();
  if (!photoURL) {
    throw new Error('Не удалось получить ссылку на фото');
  }

  const user = getFirebaseAuth().currentUser;
  if (user) {
    await updateProfile(user, { photoURL });
    await setDoc(
      doc(getFirebaseDb(), 'users', user.uid),
      {
        photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return photoURL;
}
