import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auth, db, TodoList, TodoItem, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
  ChevronLeft, Plus, Trash2, Share2, Users, Clock, 
  CheckCircle2, AlertCircle, GripVertical, MoreVertical, 
  Flag, CheckCircle, Circle, X, CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Reorder, AnimatePresence, motion } from 'motion/react';
import CollaborationModal from '../components/CollaborationModal';
import CollaboratorAvatars from '../components/CollaboratorAvatars';

const TodoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<TodoList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const listDoc = doc(db, 'todoLists', id);
    const unsubscribe = onSnapshot(listDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as TodoList;
        setList(data);
        setLoading(false);
      } else {
        setError('List not found');
        setLoading(false);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `todoLists/${id}`);
      setError('Permission denied or list not found');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, auth.currentUser]);

  const updateList = async (updates: Partial<TodoList>) => {
    if (!id || !auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'todoLists', id), {
        ...updates,
        lastEditedBy: auth.currentUser.uid,
        lastEditedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !list) return;

    const newItem: TodoItem = {
      id: uuidv4(),
      text: newItemText.trim(),
      completed: false,
      priority: newItemPriority
    };

    const updatedItems = [...list.items, newItem];
    await updateList({ items: updatedItems });
    setNewItemText('');
    setNewItemPriority('medium');
  };

  const toggleItem = async (itemId: string) => {
    if (!list) return;
    const updatedItems = list.items.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    await updateList({ items: updatedItems });
  };

  const deleteItem = async (itemId: string) => {
    if (!list) return;
    const updatedItems = list.items.filter(item => item.id !== itemId);
    await updateList({ items: updatedItems });
  };

  const reorderItems = async (newItems: TodoItem[]) => {
    if (!list) return;
    setList({ ...list, items: newItems }); // Optimistic update
    await updateList({ items: newItems });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  if (error) return <div className="text-center py-20 space-y-4"><AlertCircle className="w-12 h-12 text-destructive mx-auto" /><h2 className="text-2xl font-bold">{error}</h2><Link to="/" className="text-primary hover:underline">Back to Dashboard</Link></div>;
  if (!list) return null;

  const completedCount = list.items.filter(i => i.completed).length;
  const progress = list.items.length > 0 ? (completedCount / list.items.length) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-4 sticky top-16 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <input
            type="text"
            value={list.title}
            onChange={(e) => updateList({ title: e.target.value })}
            className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 w-full md:w-auto"
            placeholder="Untitled List"
          />
        </div>
        <div className="flex items-center space-x-2">
          <CollaboratorAvatars 
            collaboratorIds={list.collaborators || []} 
            ownerId={list.ownerId}
            onClick={() => setIsCollabModalOpen(true)}
          />
          <button
            onClick={() => setIsCollabModalOpen(true)}
            className={cn(
              "p-2 rounded-lg transition-colors flex items-center space-x-2 text-sm font-medium",
              list.isPublic ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{list.isPublic ? 'Public' : 'Private'}</span>
          </button>
        </div>
      </div>

      <CollaborationModal 
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        docId={id!}
        docType="todoLists"
        ownerId={list.ownerId}
        isPublic={list.isPublic}
        collaboratorIds={list.collaborators || []}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{completedCount} of {list.items.length} tasks completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <form onSubmit={addItem} className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4 bg-muted/30 rounded-3xl border border-border/50">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-lg px-2"
        />
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <select 
            value={newItemPriority}
            onChange={(e) => setNewItemPriority(e.target.value as any)}
            className="bg-background border border-border/50 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <button 
            type="submit"
            disabled={!newItemText.trim()}
            className="p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-all active:scale-90 shadow-md"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </form>

      <Reorder.Group axis="y" values={list.items} onReorder={reorderItems} className="space-y-3">
        <AnimatePresence initial={false}>
          {list.items.map((item) => (
            <Reorder.Item 
              key={item.id} 
              value={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "group flex items-center space-x-3 p-4 bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow",
                item.completed && "opacity-60"
              )}
            >
              <div className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                <GripVertical className="w-5 h-5" />
              </div>
              <button 
                onClick={() => toggleItem(item.id)}
                className={cn(
                  "p-1 rounded-full transition-colors",
                  item.completed ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
              <div className="flex-1">
                <p className={cn(
                  "text-lg transition-all",
                  item.completed && "line-through text-muted-foreground"
                )}>
                  {item.text}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                    item.priority === 'high' && "bg-destructive/10 text-destructive",
                    item.priority === 'medium' && "bg-amber-500/10 text-amber-600",
                    item.priority === 'low' && "bg-blue-500/10 text-blue-600"
                  )}>
                    {item.priority}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => deleteItem(item.id)}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {list.items.length === 0 && (
        <div className="text-center py-12 space-y-3 opacity-50">
          <CheckSquare className="w-12 h-12 mx-auto" />
          <p>No tasks yet. Add one above!</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-8 border-t">
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>Last edited {list.lastEditedAt ? formatDistanceToNow(list.lastEditedAt.toDate()) + ' ago' : 'Just now'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-3 h-3" />
          <span>{list.collaborators.length + 1} collaborators</span>
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
