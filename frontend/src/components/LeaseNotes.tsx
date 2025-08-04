'use client';

import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { LeaseAPI, LeaseNote, LeaseNoteCreate } from '@/lib/lease-api';

interface LeaseNotesProps {
  leaseId: number;
}

const NOTE_TYPES = [
  { value: 'general', label: 'General', color: 'bg-blue-400' },
  { value: 'important', label: 'Important', color: 'bg-red-400' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-yellow-400' },
  { value: 'payment', label: 'Payment', color: 'bg-green-400' },
  { value: 'inspection', label: 'Inspection', color: 'bg-purple-400' },
  { value: 'renewal', label: 'Renewal', color: 'bg-indigo-400' },
  { value: 'termination', label: 'Termination', color: 'bg-gray-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' },
];

export default function LeaseNotes({ leaseId }: LeaseNotesProps) {
  const [notes, setNotes] = useState<LeaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState<LeaseNote | null>(null);
  const [formData, setFormData] = useState<LeaseNoteCreate>({
    title: '',
    content: '',
    note_type: 'general',
  });

  const leaseAPI = new LeaseAPI();

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const fetchedNotes = await leaseAPI.getLeaseNotes(leaseId);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [leaseId]);

  const handleAddNote = () => {
    setFormData({
      title: '',
      content: '',
      note_type: 'general',
    });
    setShowAddModal(true);
  };

  const handleEditNote = (note: LeaseNote) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      note_type: note.note_type,
    });
    setShowEditModal(true);
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await leaseAPI.deleteLeaseNote(leaseId, noteId);
      toast.success('Note deleted successfully');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (showEditModal && editingNote) {
        await leaseAPI.updateLeaseNote(leaseId, editingNote.id, formData);
        toast.success('Note updated successfully');
        setShowEditModal(false);
        setEditingNote(null);
      } else {
        await leaseAPI.createLeaseNote(leaseId, formData);
        toast.success('Note added successfully');
        setShowAddModal(false);
      }
      
      setFormData({
        title: '',
        content: '',
        note_type: 'general',
      });
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const getNoteTypeColor = (noteType: string) => {
    const type = NOTE_TYPES.find(t => t.value === noteType);
    return type?.color || 'bg-gray-400';
  };

  const getNoteTypeLabel = (noteType: string) => {
    const type = NOTE_TYPES.find(t => t.value === noteType);
    return type?.label || 'Other';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Lease Notes</h3>
          <button 
            onClick={handleAddNote}
            className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Note
          </button>
        </div>
        <div className="text-center text-muted-foreground">
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Lease Notes</h3>
        <button 
          onClick={handleAddNote}
          className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Note
        </button>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No notes yet. Add your first note to get started.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-white/5 border border-white/20 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getNoteTypeColor(note.note_type)}`}></div>
                  <h4 className="text-md font-medium text-white">{note.title}</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditNote(note)}
                    className="text-muted-foreground hover:text-white"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/80 mb-3">{note.content}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${getNoteTypeColor(note.note_type)} text-white`}>
                    {getNoteTypeLabel(note.note_type)}
                  </span>
                  {note.created_by && (
                    <span>By {note.created_by.name}</span>
                  )}
                </div>
                <span>{formatDate(note.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Note</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="Enter note title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Type
                </label>
                <select
                  name="note_type"
                  value={formData.note_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  {NOTE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Content *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="Enter note content"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Add Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {showEditModal && editingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Note</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingNote(null);
                }}
                className="text-muted-foreground hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="Enter note title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Type
                </label>
                <select
                  name="note_type"
                  value={formData.note_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  {NOTE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Content *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="Enter note content"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingNote(null);
                  }}
                  className="px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Update Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 