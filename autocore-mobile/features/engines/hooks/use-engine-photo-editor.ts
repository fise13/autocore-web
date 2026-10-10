import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/components/ui';
import { useSession } from '@/hooks/use-session';
import { uploadEnginePhoto } from '@/services/api/motor-photos';
import { motorRepository } from '@/services/firestore/motor-repository';
import { haptics } from '@/theme';
import type { MotorEntity } from '@/types/motor';

import {
  photosRoomLeft,
  withAddedPhotos,
  withMainPhoto,
  withoutPhoto,
} from '../lib/engine-photo-edits';

type PickedPhoto = { uri: string; width?: number; height?: number };

/**
 * Both entry points are action-sheet choices. UIKit silently refuses to present
 * the picker while that sheet is still animating away, so wait it out first.
 */
const SHEET_DISMISS_MS = 450;
const afterSheetDismiss = () => new Promise((resolve) => setTimeout(resolve, SHEET_DISMISS_MS));

/**
 * Add, reorder and remove an engine's photos from the engine card.
 *
 * Uploads go one at a time — a yard on cellular finishes them in order and a
 * failure costs one photo, not the batch. The list is saved once at the end,
 * against the motor as it is *then* (realtime may have moved it meanwhile).
 */
export function useEnginePhotoEditor(motor: MotorEntity | undefined) {
  const { companyId, uid, can } = useSession();
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const latest = useRef(motor);
  useEffect(() => {
    latest.current = motor;
  }, [motor]);

  const sold = Boolean(motor?.soldDate) || motor?.status === 'sold';
  const canEdit = Boolean(motor && uid && companyId && can('inventory_edit') && !sold);
  const photos = motor?.photoUrls ?? [];

  const save = useCallback(
    async (next: (current: string[]) => string[]) => {
      const current = latest.current;
      if (!current || !uid) return;
      await motorRepository.setPhotos(uid, current, next(current.photoUrls ?? []));
    },
    [uid],
  );

  const uploadAll = useCallback(
    async (picked: PickedPhoto[]) => {
      const current = latest.current;
      if (!current || !companyId || picked.length === 0) return;
      const motorId = String(current.localId ?? current.id);
      const urls: string[] = [];
      let failure: string | null = null;
      let failed = 0;
      setUploading({ done: 0, total: picked.length });
      try {
        for (const photo of picked) {
          try {
            urls.push(
              await uploadEnginePhoto({
                companyId,
                motorId,
                localUri: photo.uri,
                width: photo.width,
                height: photo.height,
              }),
            );
          } catch (error) {
            failed += 1;
            failure = error instanceof Error ? error.message : failure;
          }
          setUploading({ done: urls.length + failed, total: picked.length });
        }
        if (failed > 0) {
          haptics.error();
          toast({
            title: failed === 1 ? 'A photo did not upload' : `${failed} photos did not upload`,
            description: failure ?? undefined,
            variant: 'destructive',
          });
        }
        if (urls.length > 0) {
          await save((list) => withAddedPhotos(list, urls));
          haptics.success();
          toast({
            title: urls.length === 1 ? 'Photo added' : `${urls.length} photos added`,
            variant: 'success',
          });
        }
      } catch (error) {
        haptics.error();
        toast({
          title: 'Could not save the photos',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setUploading(null);
      }
    },
    [companyId, save],
  );

  const addFromLibrary = useCallback(async () => {
    const room = photosRoomLeft(latest.current?.photoUrls ?? []);
    if (room === 0) {
      toast({ title: 'This engine already has the maximum number of photos', variant: 'warning' });
      return;
    }
    // No library permission needed: the system photo picker runs out of process
    // and hands back only what was chosen, so asking for full access is friction.
    await afterSheetDismiss();
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: room,
      orderedSelection: true,
      quality: 1,
    });
    if (pick.canceled) return;
    await uploadAll(pick.assets.filter((asset) => asset.uri));
  }, [uploadAll]);

  const takePhoto = useCallback(async () => {
    if (photosRoomLeft(latest.current?.photoUrls ?? []) === 0) {
      toast({ title: 'This engine already has the maximum number of photos', variant: 'warning' });
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast({
        title: 'Camera access is off',
        description: 'Allow camera access in Settings to photograph the engine.',
        variant: 'warning',
      });
      void Linking.openSettings();
      return;
    }
    await afterSheetDismiss();
    const pick = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (pick.canceled || !pick.assets[0]?.uri) return;
    await uploadAll([pick.assets[0]]);
  }, [uploadAll]);

  const makeMain = useCallback(
    async (index: number) => {
      try {
        await save((list) => withMainPhoto(list, index));
        haptics.success();
        toast({ title: 'Main photo set', variant: 'success' });
      } catch (error) {
        toast({
          title: 'Could not change the main photo',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [save],
  );

  const remove = useCallback(
    (index: number) => {
      Alert.alert('Delete this photo?', 'It is removed from the engine for everyone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void save((list) => withoutPhoto(list, index))
              .then(() => toast({ title: 'Photo deleted', variant: 'success' }))
              .catch((error: unknown) =>
                toast({
                  title: 'Could not delete the photo',
                  description: error instanceof Error ? error.message : undefined,
                  variant: 'destructive',
                }),
              );
          },
        },
      ]);
    },
    [save],
  );

  return {
    canEdit,
    photos,
    uploading,
    addFromLibrary,
    takePhoto,
    makeMain,
    remove,
  };
}
