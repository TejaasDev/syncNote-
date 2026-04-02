import React, { useEffect, useState } from 'react';
import { db, UserProfile } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { User as UserIcon } from 'lucide-react';

interface CollaboratorAvatarsProps {
  collaboratorIds: string[];
  ownerId: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  max?: number;
}

const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  collaboratorIds,
  ownerId,
  className,
  onClick,
  max = 3
}) => {
  const [avatars, setAvatars] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchAvatars = async () => {
      const allIds = [ownerId, ...collaboratorIds];
      const fetchedAvatars: UserProfile[] = [];
      
      // Only fetch up to max + 1 to save on reads
      for (const uid of allIds.slice(0, max + 1)) {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            fetchedAvatars.push(userSnap.data() as UserProfile);
          }
        } catch (err) {
          console.error('Error fetching avatar:', err);
        }
      }
      setAvatars(fetchedAvatars);
    };

    fetchAvatars();
  }, [collaboratorIds, ownerId, max]);

  if (avatars.length === 0) return null;

  return (
    <div 
      className={cn("flex -space-x-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity", className)}
      onClick={onClick}
    >
      {avatars.slice(0, max).map((user, i) => (
        <div 
          key={user.uid} 
          className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-muted overflow-hidden"
          title={user.displayName}
        >
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName} 
              className="h-full w-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
              <UserIcon className="h-3 w-3" />
            </div>
          )}
        </div>
      ))}
      {avatars.length > max && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[10px] font-bold">
          +{avatars.length - max}
        </div>
      )}
    </div>
  );
};

export default CollaboratorAvatars;
