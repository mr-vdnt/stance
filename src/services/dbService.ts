import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  doc,
  getDocs,
  deleteDoc,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { OperationType, Message, Conversation } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  async createConversation(title: string, preferredModel: string = "gemini-3-flash-preview", ethicalMode: string = "utilitarian"): Promise<string> {
    const path = 'conversations';
    try {
      const docRef = await addDoc(collection(db, path), {
        userId: auth.currentUser?.uid || 'anonymous',
        title,
        preferredModel,
        ethicalMode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    return '';
  },

  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const trimmedTitle = title.trim();
    const finalTitle = trimmedTitle.length > 0 ? trimmedTitle.slice(0, 100) : "Untitled Session";
    return this.updateConversationMetadata(conversationId, { title: finalTitle });
  },

  async updateConversationMetadata(conversationId: string, metadata: Partial<Conversation>): Promise<void> {
    const path = `conversations/${conversationId}`;
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        ...metadata,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updatePreferredModel(conversationId: string, model: string): Promise<void> {
    return this.updateConversationMetadata(conversationId, { preferredModel: model });
  },

  async addMessage(message: Partial<Message>): Promise<string> {
    const path = 'messages';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...message,
        version: 3,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    return '';
  },

  async updateMessageFeedback(messageId: string, feedback: 'up' | 'down'): Promise<void> {
    const path = `messages/${messageId}`;
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        feedback,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void) {
    const path = 'messages';
    const q = query(
      collection(db, path),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      callback(messages);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async getConversations(userId?: string): Promise<Conversation[]> {
    const path = 'conversations';
    try {
      const uid = userId || auth.currentUser?.uid;
      if (!uid) return [];

      const q = query(
        collection(db, path),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    return [];
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const path = `conversations/${conversationId}`;
    try {
      const batch = writeBatch(db);
      
      // Delete messages
      const messagesQ = query(collection(db, 'messages'), where('conversationId', '==', conversationId));
      const messagesSnapshot = await getDocs(messagesQ);
      messagesSnapshot.docs.forEach((d) => batch.delete(d.ref));
      
      // Delete conversation
      batch.delete(doc(db, 'conversations', conversationId));
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteMessage(messageId: string): Promise<void> {
    const path = `messages/${messageId}`;
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        content: "[METADATA REDACTED]", // Masking content for soft delete
        biasScores: deleteField(),
        originalContent: deleteField(),
        isCorrected: deleteField(),
        attachments: deleteField(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateMessageContent(messageId: string, content: string): Promise<void> {
    const path = `messages/${messageId}`;
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        content,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async hardDeleteMessage(messageId: string, descendantIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Delete the message itself
      batch.delete(doc(db, 'messages', messageId));
      
      // Delete all descendants to maintain strict rollback integrity
      descendantIds.forEach(id => {
        batch.delete(doc(db, 'messages', id));
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
    }
  }
};
