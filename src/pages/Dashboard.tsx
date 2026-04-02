import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, Note, TodoList } from '../firebase';
import { collection, query, where, onSnapshot, setDoc, serverTimestamp, deleteDoc, doc, or } from 'firebase/firestore';
import { Plus, FileText, CheckSquare, Trash2, Share2, Clock, User as UserIcon, Search, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import CollaboratorAvatars from '../components/CollaboratorAvatars';
import CollaborationModal from '../components/CollaborationModal';

const Dashboard: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, type: 'notes' | 'todoLists', ownerId: string, isPublic: boolean, collaborators: string[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    // Query for notes where user is owner OR collaborator
    const notesQuery = query(
      collection(db, 'notes'),
      or(
        where('ownerId', '==', auth.currentUser.uid),
        where('collaborators', 'array-contains', auth.currentUser.uid)
      )
    );

    // Query for todoLists where user is owner OR collaborator
    const todoQuery = query(
      collection(db, 'todoLists'),
      or(
        where('ownerId', '==', auth.currentUser.uid),
        where('collaborators', 'array-contains', auth.currentUser.uid)
      )
    );

    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      setNotes(notesData);
      setLoading(false);
    });

    const unsubscribeTodo = onSnapshot(todoQuery, (snapshot) => {
      const todoData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TodoList));
      setTodoLists(todoData);
    });

    return () => {
      unsubscribeNotes();
      unsubscribeTodo();
    };
  }, [auth.currentUser]);

  const createNote = async () => {
    if (!auth.currentUser) return;
    const id = uuidv4();
    const newNote = {
      id,
      title: 'Untitled Note',
      content: '',
      ownerId: auth.currentUser.uid,
      collaborators: [],
      isPublic: false,
      lastEditedBy: auth.currentUser.uid,
      lastEditedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'notes', id), newNote);
    navigate(`/note/${id}`);
  };

  const createTodoList = async () => {
    if (!auth.currentUser) return;
    const id = uuidv4();
    const newList = {
      id,
      title: 'Untitled List',
      ownerId: auth.currentUser.uid,
      collaborators: [],
      isPublic: false,
      lastEditedBy: auth.currentUser.uid,
      lastEditedAt: serverTimestamp(),
      items: []
    };
    await setDoc(doc(db, 'todoLists', id), newList);
    navigate(`/todo/${id}`);
  };

  const deleteItem = async (id: string, type: 'note' | 'todo') => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      await deleteDoc(doc(db, type === 'note' ? 'notes' : 'todoLists', id));
    }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTodo = todoLists.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {auth.currentUser?.displayName}</h1>
          <p className="text-muted-foreground">Manage your collaborative notes and tasks.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={createNote} className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
          <button onClick={createTodoList} className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" />
            <span>New List</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search your notes and lists..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <div key={note.id} className="group relative bg-card border rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-1">
            <Link to={`/note/${note.id}`} className="block space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                {note.isPublic && <Share2 className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg line-clamp-1">{note.title || 'Untitled Note'}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {note.content ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) : 'No content yet...'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <CollaboratorAvatars 
                    collaboratorIds={note.collaborators || []} 
                    ownerId={note.ownerId}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedDoc({ id: note.id, type: 'notes', ownerId: note.ownerId, isPublic: note.isPublic, collaborators: note.collaborators || [] });
                    }}
                  />
                  {(note.collaborators?.length > 0 || note.isPublic) && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-1.5 py-0.5 rounded">Shared</span>
                  )}
                </div>
                <div className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{note.lastEditedAt ? formatDistanceToNow(note.lastEditedAt.toDate()) + ' ago' : 'Just now'}</span>
                </div>
              </div>
            </Link>
            <button
              onClick={() => deleteItem(note.id, 'note')}
              className="absolute top-4 right-4 p-2 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {filteredTodo.map((list) => (
          <div key={list.id} className="group relative bg-card border rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-1">
            <Link to={`/todo/${list.id}`} className="block space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-secondary/10 text-secondary-foreground">
                  <CheckSquare className="w-5 h-5" />
                </div>
                {list.isPublic && <Share2 className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg line-clamp-1">{list.title || 'Untitled List'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {list.items.length} tasks • {list.items.filter(i => i.completed).length} completed
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <CollaboratorAvatars 
                    collaboratorIds={list.collaborators || []} 
                    ownerId={list.ownerId}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedDoc({ id: list.id, type: 'todoLists', ownerId: list.ownerId, isPublic: list.isPublic, collaborators: list.collaborators || [] });
                    }}
                  />
                  {(list.collaborators?.length > 0 || list.isPublic) && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-1.5 py-0.5 rounded">Shared</span>
                  )}
                </div>
                <div className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{list.lastEditedAt ? formatDistanceToNow(list.lastEditedAt.toDate()) + ' ago' : 'Just now'}</span>
                </div>
              </div>
            </Link>
            <button
              onClick={() => deleteItem(list.id, 'todo')}
              className="absolute top-4 right-4 p-2 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {filteredNotes.length === 0 && filteredTodo.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Plus className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">No documents yet</h3>
              <p className="text-muted-foreground">Create your first note or to-do list to get started.</p>
            </div>
          </div>
        )}
      </div>
      {/* Modals */}
      {selectedDoc && (
        <CollaborationModal 
          isOpen={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          docId={selectedDoc.id}
          docType={selectedDoc.type}
          ownerId={selectedDoc.ownerId}
          isPublic={selectedDoc.isPublic}
          collaboratorIds={selectedDoc.collaborators}
        />
      )}
    </div>
  );
};

export default Dashboard;
