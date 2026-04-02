import React, { useState, useEffect } from 'react';
import { auth, db, UserProfile } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { X, UserPlus, Share2, Globe, Lock, Trash2, Check, Copy, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  docType: 'notes' | 'todoLists';
  ownerId: string;
  isPublic: boolean;
  collaboratorIds: string[];
}

const CollaborationModal: React.FC<CollaborationModalProps> = ({
  isOpen,
  onClose,
  docId,
  docType,
  ownerId,
  isPublic,
  collaboratorIds
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = auth.currentUser?.uid === ownerId;

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, collaboratorIds, ownerId]);

  const fetchCollaborators = async () => {
    try {
      // Fetch owner
      const ownerSnap = await getDoc(doc(db, 'users', ownerId));
      if (ownerSnap.exists()) {
        setOwner(ownerSnap.data() as UserProfile);
      }

      // Fetch collaborators
      const collabData: UserProfile[] = [];
      for (const uid of collaboratorIds) {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
          collabData.push(userSnap.data() as UserProfile);
        }
      }
      setCollaborators(collabData);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    }
  };

  const addCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !isOwner) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('User not found. They must have signed in to SyncNote at least once.');
        setLoading(false);
        return;
      }

      const userToAdd = querySnapshot.docs[0].data() as UserProfile;
      
      if (userToAdd.uid === ownerId) {
        setError('You are already the owner.');
        setLoading(false);
        return;
      }

      if (collaboratorIds.includes(userToAdd.uid)) {
        setError('User is already a collaborator.');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, docType, docId), {
        collaborators: arrayUnion(userToAdd.uid)
      });

      setSuccess(true);
      setEmail('');
      fetchCollaborators();
    } catch (err) {
      console.error('Error adding collaborator:', err);
      setError('Failed to add collaborator.');
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (uid: string) => {
    if (!isOwner) return;
    try {
      await updateDoc(doc(db, docType, docId), {
        collaborators: arrayRemove(uid)
      });
      fetchCollaborators();
    } catch (err) {
      console.error('Error removing collaborator:', err);
    }
  };

  const togglePublic = async () => {
    if (!isOwner) return;
    try {
      await updateDoc(doc(db, docType, docId), {
        isPublic: !isPublic
      });
    } catch (err) {
      console.error('Error toggling public:', err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share & Collaborate
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Link Sharing Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Link Access</h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl transition-all duration-300",
                  isPublic ? "bg-primary/10 text-primary scale-110" : "bg-muted text-muted-foreground"
                )}>
                  {isPublic ? <Globe className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight">{isPublic ? 'Anyone with the link' : 'Only invited people'}</p>
                  <p className="text-xs text-muted-foreground font-medium">{isPublic ? 'Can view and edit' : 'Private access only'}</p>
                </div>
              </div>
              {isOwner && (
                <button 
                  onClick={togglePublic}
                  className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
                >
                  Change
                </button>
              )}
            </div>
            <div className="flex gap-2 p-1 bg-muted/20 rounded-xl border border-border/50">
              <input 
                readOnly 
                value={window.location.href}
                className="flex-1 bg-transparent px-3 py-2 text-xs outline-none font-mono text-muted-foreground"
              />
              <button 
                onClick={copyLink}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Add Collaborator Section */}
          {isOwner && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Invite Collaborators</h3>
              <form onSubmit={addCollaborator} className="flex gap-2">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                </div>
                <button 
                  disabled={loading || !email.trim()}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50 hover:shadow-lg transition-all active:scale-95"
                >
                  {loading ? 'Adding...' : 'Invite'}
                </button>
              </form>
              {error && <p className="text-xs text-destructive font-bold flex items-center gap-1"><X className="w-3 h-3" /> {error}</p>}
              {success && <p className="text-xs text-green-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Collaborator added!</p>}
            </div>
          )}

          {/* People with Access Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Who has access</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {/* Owner */}
              {owner && (
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={owner.photoURL} alt={owner.displayName} className="w-10 h-10 rounded-full border-2 border-primary/20" referrerPolicy="no-referrer" />
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full border-2 border-card">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight">{owner.displayName} (You)</p>
                      <p className="text-xs text-muted-foreground font-medium">{owner.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-primary px-2.5 py-1 bg-primary/10 rounded-full tracking-wider">Owner</span>
                </div>
              )}

              {/* Collaborators */}
              {collaborators.map((collab) => (
                <div key={collab.uid} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <img src={collab.photoURL} alt={collab.displayName} className="w-10 h-10 rounded-full border border-border/50" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-bold tracking-tight">{collab.displayName}</p>
                      <p className="text-xs text-muted-foreground font-medium">{collab.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground px-2.5 py-1 bg-muted rounded-full tracking-wider">Editor</span>
                    {isOwner && (
                      <button 
                        onClick={() => removeCollaborator(collab.uid)}
                        className="p-2 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 rounded-full"
                        title="Remove collaborator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CollaborationModal;
