"use client";

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  PhotoIcon,
  DocumentIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { leaseAPI, LeaseAttachment, LeaseAttachmentCreate } from '@/lib/lease-api';
import { authService } from '@/lib/auth';

interface LeaseAttachmentsProps {
  leaseId: number;
}

const ATTACHMENT_TYPES = [
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'maintenance_request', label: 'Maintenance Request' },
  { value: 'payment_proof', label: 'Payment Proof' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

export default function LeaseAttachments({ leaseId }: LeaseAttachmentsProps) {
  const [attachments, setAttachments] = useState<LeaseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<LeaseAttachment | null>(null);
  const [renameForm, setRenameForm] = useState({
    title: '',
    description: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file_type: 'other',
    is_public: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, [leaseId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      console.log('Fetching attachments for lease:', leaseId);
      
      // Check if user is authenticated
      const token = authService.getAccessToken();
      if (!token) {
        console.warn('No authentication token found');
        toast.error('Please log in to view attachments');
        setAttachments([]);
        return;
      }
      
      const data = await leaseAPI.getLeaseAttachments(leaseId);
      console.log('API response:', data);
      console.log('Response type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      // Handle different response structures
      if (Array.isArray(data)) {
        setAttachments(data);
      } else if (data && Array.isArray(data.results)) {
        setAttachments(data.results);
      } else if (data && Array.isArray(data.data)) {
        setAttachments(data.data);
      } else {
        console.warn('Unexpected API response structure:', data);
        setAttachments([]);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('token')) {
          toast.error('Authentication required. Please log in again.');
        } else if (error.message.includes('404')) {
          toast.error('Lease not found');
        } else {
          toast.error('Failed to load attachments');
        }
      } else {
        toast.error('Failed to load attachments');
      }
      
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedExtensions = [
        'pdf', 'doc', 'docx', 'txt', 'rtf',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
        'xls', 'xlsx', 'csv'
      ];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        toast.error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
      }

      setSelectedFile(file);
      
      // Auto-set title if not provided
      if (!uploadForm.title) {
        setUploadForm(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '') // Remove extension
        }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title.trim()) {
      toast.error('Please select a file and provide a title');
      return;
    }

    try {
      setUploading(true);
      const attachmentData: LeaseAttachmentCreate = {
        lease: leaseId,
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim(),
        file: selectedFile,
        file_type: uploadForm.file_type,
        is_public: uploadForm.is_public,
      };

      await leaseAPI.uploadLeaseAttachment(leaseId, attachmentData);
      toast.success('File uploaded successfully!');
      
      // Reset form and close modal
      setUploadForm({
        title: '',
        description: '',
        file_type: 'other',
        is_public: true,
      });
      setSelectedFile(null);
      setShowUploadModal(false);
      
      // Refresh attachments list
      fetchAttachments();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: LeaseAttachment) => {
    try {
      await leaseAPI.downloadAttachment(attachment);
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (attachmentId: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await leaseAPI.deleteLeaseAttachment(leaseId, attachmentId);
      toast.success('Attachment deleted successfully');
      fetchAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleRename = (attachment: LeaseAttachment) => {
    setSelectedAttachment(attachment);
    setRenameForm({
      title: attachment.title,
      description: attachment.description || '',
    });
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async () => {
    if (!selectedAttachment || !renameForm.title.trim()) {
      toast.error('Please provide a title');
      return;
    }

    try {
      setRenaming(true);
      await leaseAPI.updateLeaseAttachment(leaseId, selectedAttachment.id, {
        title: renameForm.title.trim(),
        description: renameForm.description.trim(),
      });
      toast.success('Attachment renamed successfully!');
      setShowRenameModal(false);
      setSelectedAttachment(null);
      setRenameForm({ title: '', description: '' });
      fetchAttachments();
    } catch (error) {
      console.error('Error renaming attachment:', error);
      toast.error('Failed to rename attachment');
    } finally {
      setRenaming(false);
    }
  };

  const getFileIcon = (attachment: LeaseAttachment) => {
    if (attachment.is_pdf) {
      return <DocumentTextIcon className="h-5 w-5" />;
    } else if (attachment.is_image) {
      return <PhotoIcon className="h-5 w-5" />;
    } else {
      return <DocumentIcon className="h-5 w-5" />;
    }
  };

  const getFileIconColor = (attachment: LeaseAttachment) => {
    if (attachment.is_pdf) {
      return 'bg-red-500/20 text-red-400';
    } else if (attachment.is_image) {
      return 'bg-blue-500/20 text-blue-400';
    } else {
      return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Lease Attachments</h3>
          <div className="animate-pulse bg-white/10 rounded-md w-32 h-8"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 border border-white/20 rounded-lg p-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Lease Attachments</h3>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload File
        </button>
      </div>

      {/* Attachments List */}
      <div className="space-y-4">
        {!Array.isArray(attachments) ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Loading Error</h3>
            <p className="text-muted-foreground/70 mb-4">Unable to load attachments. Please try refreshing the page.</p>
            <button 
              onClick={fetchAttachments}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Retry Loading
            </button>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Attachments</h3>
            <p className="text-muted-foreground/70 mb-4">No files have been uploaded for this lease yet.</p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Upload First File
            </button>
          </div>
        ) : (
          attachments.map((attachment) => (
            <div key={attachment.id} className="bg-white/5 border border-white/20 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getFileIconColor(attachment)}`}>
                    {getFileIcon(attachment)}
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-white">{attachment.title}</h4>
                    <p className="text-sm text-muted-foreground/70">{attachment.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground/70">{attachment.formatted_file_size}</p>
                  <p className="text-xs text-muted-foreground/70">{attachment.file_extension.toUpperCase()}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-muted-foreground/70">
                  <span>Uploaded by {attachment.uploaded_by?.name || 'Unknown'}</span>
                  <span>{new Date(attachment.uploaded_at).toLocaleDateString()}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    attachment.is_public ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {attachment.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleDownload(attachment)}
                    className="inline-flex items-center px-2 py-1 border border-white/20 rounded text-xs text-white bg-white/10 hover:bg-white/20"
                  >
                    <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                    Download
                  </button>
                  <button 
                    onClick={() => window.open(attachment.file_url, '_blank')}
                    className="inline-flex items-center px-2 py-1 border border-white/20 rounded text-xs text-white bg-white/10 hover:bg-white/20"
                  >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    View
                  </button>
                  <button 
                    onClick={() => handleRename(attachment)}
                    className="inline-flex items-center px-2 py-1 border border-white/20 rounded text-xs text-white bg-white/10 hover:bg-white/20"
                  >
                    <PencilIcon className="h-3 w-3 mr-1" />
                    Rename
                  </button>
                  <button 
                    onClick={() => handleDelete(attachment.id)}
                    className="inline-flex items-center px-2 py-1 border border-red-500 rounded text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Attachment</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-white/70 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Select File</label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.xls,.xlsx,.csv"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="text-white">
                        <DocumentTextIcon className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-white/70">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="text-white/70">
                        <DocumentTextIcon className="h-8 w-8 mx-auto mb-2" />
                        <p>Click to select a file</p>
                        <p className="text-xs">PDF, DOC, Images, etc. (max 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
                  placeholder="Enter file title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description (Optional)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
                  placeholder="Enter file description"
                  rows={3}
                />
              </div>

              {/* File Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">File Type</label>
                <select
                  value={uploadForm.file_type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, file_type: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
                >
                  {ATTACHMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Public/Private */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={uploadForm.is_public}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is-public" className="text-sm text-white">
                  Make this file visible to tenants
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !uploadForm.title.trim() || uploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && selectedAttachment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Rename Attachment</h3>
              <button 
                onClick={() => {
                  setShowRenameModal(false);
                  setSelectedAttachment(null);
                  setRenameForm({ title: '', description: '' });
                }}
                className="text-white/70 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current File Info */}
              <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getFileIconColor(selectedAttachment)}`}>
                    {getFileIcon(selectedAttachment)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{selectedAttachment.title}</p>
                    <p className="text-xs text-white/70">{selectedAttachment.file_extension.toUpperCase()} • {selectedAttachment.formatted_file_size}</p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">New Title</label>
                <input
                  type="text"
                  value={renameForm.title}
                  onChange={(e) => setRenameForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
                  placeholder="Enter new title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description (Optional)</label>
                <textarea
                  value={renameForm.description}
                  onChange={(e) => setRenameForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowRenameModal(false);
                    setSelectedAttachment(null);
                    setRenameForm({ title: '', description: '' });
                  }}
                  className="px-4 py-2 text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameSubmit}
                  disabled={!renameForm.title.trim() || renaming}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renaming ? 'Renaming...' : 'Rename'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 