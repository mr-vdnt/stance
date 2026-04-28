import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';
import { Attachment } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface UploadProgress {
  progress: number;
  fileName: string;
}

export const uploadFile = async (
  file: File,
  conversationId: string,
  onProgress?: (progress: number) => void
): Promise<Attachment> => {
  if (!auth.currentUser) throw new Error('Authentication required for file upload');

  const fileId = uuidv4();
  const extension = file.name.split('.').pop();
  const filePath = `conversations/${conversationId}/files/${fileId}.${extension}`;
  const storageRef = ref(storage, filePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        resolve({
          id: fileId,
          name: file.name,
          type: file.type,
          url: downloadURL,
          size: file.size,
          previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/') ? downloadURL : undefined,
        });
      }
    );
  });
};
