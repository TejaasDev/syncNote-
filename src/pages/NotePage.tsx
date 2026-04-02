import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auth, db, Note, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  ChevronLeft, Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Heading1, Heading2, Heading3, 
  Share2, Users, Clock, Save, CheckCircle2, AlertCircle, MoreVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import CollaborationModal from '../components/CollaborationModal';
import CollaboratorAvatars from '../components/CollaboratorAvatars';

const NotePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (note && auth.currentUser) {
        debouncedSave(editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const noteDoc = doc(db, 'notes', id);
    const unsubscribe = onSnapshot(noteDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Note;
        setNote(data);
        
        // Only update editor content if it's different and not currently being edited by this user
        // This is a simple way to handle basic collaboration without full CRDTs
        if (editor && editor.getHTML() !== data.content && !editor.isFocused) {
          editor.commands.setContent(data.content || '');
        }
        setLoading(false);
      } else {
        setError('Note not found');
        setLoading(false);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `notes/${id}`);
      setError('Permission denied or note not found');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, editor, auth.currentUser]);

  const saveContent = async (content: string) => {
    if (!id || !auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'notes', id), {
        content,
        lastEditedBy: auth.currentUser.uid,
        lastEditedAt: serverTimestamp(),
      });
      setSaving(false);
    } catch (err) {
      console.error('Save error:', err);
      setSaving(false);
    }
  };

  // Simple debounce
  const debouncedSave = useCallback(
    (() => {
      let timeout: any;
      return (content: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => saveContent(content), 1000);
      };
    })(),
    [id]
  );

  const updateTitle = async (title: string) => {
    if (!id || !auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'notes', id), {
        title,
        lastEditedBy: auth.currentUser.uid,
        lastEditedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Title update error:', err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  if (error) return <div className="text-center py-20 space-y-4"><AlertCircle className="w-12 h-12 text-destructive mx-auto" /><h2 className="text-2xl font-bold">{error}</h2><Link to="/" className="text-primary hover:underline">Back to Dashboard</Link></div>;
  if (!note) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-4 sticky top-16 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <input
            type="text"
            value={note.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 w-full md:w-auto"
            placeholder="Untitled Note"
          />
        </div>
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center text-xs text-muted-foreground mr-4">
            {saving ? (
              <span className="flex items-center"><Save className="w-3 h-3 mr-1 animate-pulse" /> Saving...</span>
            ) : (
              <span className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CollaboratorAvatars 
              collaboratorIds={note.collaborators || []} 
              ownerId={note.ownerId}
              onClick={() => setIsCollabModalOpen(true)}
            />
            <button
              onClick={() => setIsCollabModalOpen(true)}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center space-x-2 text-sm font-medium",
                note.isPublic ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
              title={note.isPublic ? "Publicly editable" : "Private"}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{note.isPublic ? 'Public' : 'Private'}</span>
            </button>
          </div>
        </div>
      </div>

      <CollaborationModal 
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        docId={id!}
        docType="notes"
        ownerId={note.ownerId}
        isPublic={note.isPublic}
        collaboratorIds={note.collaborators || []}
      />

      <div className="flex flex-nowrap overflow-x-auto gap-1 p-1 bg-muted/50 rounded-xl sticky top-[116px] z-10 no-scrollbar">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('bold') && "bg-background shadow-sm text-primary")}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('italic') && "bg-background shadow-sm text-primary")}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('underline') && "bg-background shadow-sm text-primary")}
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1 self-center flex-shrink-0" />
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('heading', { level: 1 }) && "bg-background shadow-sm text-primary")}
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('heading', { level: 2 }) && "bg-background shadow-sm text-primary")}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('heading', { level: 3 }) && "bg-background shadow-sm text-primary")}
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1 self-center flex-shrink-0" />
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('bulletList') && "bg-background shadow-sm text-primary")}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={cn("p-2.5 rounded-lg hover:bg-background transition-colors flex-shrink-0", editor?.isActive('orderedList') && "bg-background shadow-sm text-primary")}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] bg-card p-4 sm:p-8 rounded-3xl border shadow-sm">
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-8 border-t">
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>Last edited {note.lastEditedAt ? formatDistanceToNow(note.lastEditedAt.toDate()) + ' ago' : 'Just now'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-3 h-3" />
          <span>{note.collaborators.length + 1} collaborators</span>
        </div>
      </div>
    </div>
  );
};

export default NotePage;
