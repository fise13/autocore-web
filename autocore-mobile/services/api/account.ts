import { updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { mobileApi } from '@/services/api/endpoints';
import { mobileUpload } from '@/services/api/mobile-client';
import { getFirebaseAuth, getFirebaseDb } from '@/services/firebase';

type AvatarUploadResult = {
  photoURL: string;
  storage: 'cloud' | 'inline';
};

export async function uploadUserAvatar(uri: string, filename: string, mimeType: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const result = await mobileUpload<AvatarUploadResult>(mobileApi.accountAvatar, formData);
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
