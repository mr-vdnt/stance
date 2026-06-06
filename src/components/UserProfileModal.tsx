import { useState, useRef, useEffect } from "react";
import { User, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "../lib/firebase";
import { X, Camera, Loader2, Check, Link2, Upload, Globe, ShieldAlert, LogOut, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { dbService } from "../services/dbService";

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
}

export function UserProfileModal({ user, onClose, onLogout }: UserProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [photoURL, setPhotoURL] = useState(user.photoURL || "");
  const [biasThreshold, setBiasThreshold] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPersona = async () => {
      const persona = await dbService.getUserPersona(user.uid);
      if (persona && persona.defaultBiasThreshold !== undefined) {
        setBiasThreshold(persona.defaultBiasThreshold);
      }
    };
    loadPersona();
  }, [user.uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: photoURL
      });

      // Update Custom System Persona
      await dbService.updateUserPersona(user.uid, {
        defaultBiasThreshold: biasThreshold
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      
      // Auto-update profile with new photo
      await updateProfile(user, { photoURL: url });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-[var(--bg-secondary)] dark:bg-[var(--bg-card)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border-color)]"
      >
        <div className="relative p-8">
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button 
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-[var(--text-main)] mb-1">
            {user.isAnonymous ? 'Guest Protocol' : 'User Profile'}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-bold mb-8">
            {user.isAnonymous ? 'Ephemeral Session' : 'Management Module'}
          </p>

          {user.isAnonymous && (
            <div className="mb-8 p-6 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] leading-tight">Secure your data</h3>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                  You are currently using a <span className="text-indigo-500 font-bold uppercase">Guest Session</span>. Register a permanent account to synchronize your chats, generated images, and custom configurations across devices.
                </p>
                <button 
                  onClick={() => {
                    onClose();
                    // This will trigger the upgrade logic in ChatInterface
                    (window as any).triggerUpgrade?.();
                  }}
                  className="w-full py-3.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Link Google Account
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <div className="relative group mb-6">
              <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 shadow-xl relative">
                <div className="w-full h-full rounded-[28px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-zinc-400">
                      {displayName.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-[28px] z-10">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 w-full max-w-[280px]">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all group"
              >
                <Upload className="w-4 h-4 text-zinc-500 group-hover:text-indigo-500 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-indigo-500">Upload File</span>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </button>
              
              <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 group">
                <Globe className="w-4 h-4 text-zinc-500 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Image URL</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 ml-1">Profile Image URL</label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full pl-11 pr-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 ml-1">Display Name</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 ml-1">Email Address</label>
              <input 
                type="text"
                value={user.email || ""}
                disabled
                className="w-full px-5 py-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-transparent text-zinc-400 text-sm font-medium cursor-not-allowed"
              />
            </div>

            <div className="space-y-4 p-5 md:p-6 bg-black/5 dark:bg-white/5 rounded-[2rem] border border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-brand-gold" />
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600 dark:text-zinc-400">Bias Threshold</label>
                </div>
                <span className="text-xs font-black text-indigo-500">{Math.round(biasThreshold * 100)}%</span>
              </div>
              
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={biasThreshold}
                onChange={(e) => setBiasThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-indigo-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              
              <div className="flex items-start gap-2 opacity-50">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <p className="text-[9px] font-medium leading-tight">
                  Defines the sensitivity of the <span className="font-bold">Output Correction Module</span>. Lower values trigger more aggressive debiasing.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium px-1">{error}</p>
            )}

            <button 
              type="submit"
              disabled={isLoading || (displayName === user.displayName && photoURL === user.photoURL)}
              className={cn(
                "w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2",
                isSuccess 
                  ? "bg-emerald-500 text-white" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Updated Successfully
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
