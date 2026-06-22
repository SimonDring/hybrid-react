/**
 * avatarUpload — turn a picked image file into the user's avatar.
 *
 * Downscales + centre-crops the photo to a small square JPEG, then:
 *   - signed in with Supabase → uploads to the 'avatars' Storage bucket (under
 *     the user's own uid folder, enforced by RLS) and returns the public URL;
 *   - otherwise (local/preview, or any upload error) → returns a data URL so the
 *     photo still works offline.
 *
 * The caller saves the returned URL to profile.avatar.url via the store's
 * updateProfile action (→ SyncService → cache). Both an https URL and a data URL
 * render the same way in <img src>.
 */

import { supabase } from './supabaseClient.js';

const SIZE = 256;          // final square size in px — small, crisp, cheap to store
const QUALITY = 0.85;

// Decode the file, centre-crop to a square and scale to SIZE → { blob, dataUrl }.
function toSquareJpeg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
      canvas.toBlob(
        (blob) => resolve({ blob: blob || dataUrlToBlob(dataUrl), dataUrl }),
        'image/jpeg',
        QUALITY
      );
    };
    img.onerror = () => reject(new Error("That image couldn't be read. Try another."));
    img.src = URL.createObjectURL(file);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function processAvatar(file, userId) {
  const { blob, dataUrl } = await toSquareJpeg(file);

  if (supabase && userId) {
    try {
      const path = `${userId}/avatar_${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        if (data && data.publicUrl) return data.publicUrl;
      } else {
        console.warn('[avatar] storage upload failed, using local image:', error.message);
      }
    } catch (e) {
      console.warn('[avatar] storage upload threw, using local image:', e.message);
    }
  }

  // Local-only / preview / upload failed → keep a local copy so it still shows.
  return dataUrl;
}

export default { processAvatar };
