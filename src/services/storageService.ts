import { ref, uploadBytesResumable, getDownloadURL, uploadBytes, uploadString } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';
import { Attachment } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Set a shorter retry time to fail faster and provide better feedback if network is blocked
storage.maxUploadRetryTime = 10000; // 10 seconds

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
  const extension = file.name.split('.').pop() || 'bin';
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
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            id: fileId,
            name: file.name,
            type: file.type,
            url: downloadURL,
            size: file.size,
            previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/') ? downloadURL : undefined,
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};

export const uploadBase64Image = async (
  base64Data: string,
  conversationId: string,
  fileName: string = 'generated-image.png'
): Promise<Attachment> => {
  if (!auth.currentUser) throw new Error('Authentication required for file upload');

  try {
    // Determine format and data
    const parts = base64Data.split(',');
    if (parts.length < 2) throw new Error('Invalid base64 data');
    
    // Extract the content type from the header (e.g., "data:image/png;base64")
    const metadataMatch = parts[0].match(/data:(.*?);base64/);
    const mimeString = metadataMatch ? metadataMatch[1] : 'image/png';
    const base64Content = parts[1];

    const fileId = uuidv4();
    const filePath = `conversations/${conversationId}/ai-generated/${fileId}.png`;
    const storageRef = ref(storage, filePath);

    console.log(`Starting upload to: ${filePath} using uploadString`);
    
    // Using uploadString with 'base64' format is often more reliable
    await uploadString(storageRef, base64Content, 'base64', {
      contentType: mimeString
    });
    
    console.log('Upload successful, getting download URL...');
    const downloadURL = await getDownloadURL(storageRef);

    // To get the actual size, we'd need to decode it back, but let's estimate
    const size = Math.round((base64Content.length * 3) / 4);

    return {
      id: fileId,
      name: fileName,
      type: mimeString,
      url: downloadURL,
      size: size,
      previewUrl: downloadURL,
    };
  } catch (error) {
    console.error('Error in uploadBase64Image:', error);
    throw error;
  }
};
