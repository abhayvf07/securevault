import { useState } from 'react';
import {
  Download, Trash2, Edit3, Share2, MoreVertical,
  Check, X, Copy, Clock, Lock, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import FileIcon from './FileIcon';
import { filesAPI, shareAPI } from '../services/api';

/**
 * FileCard
 * Displays file info with action buttons (download, rename, delete, share).
 * Includes inline rename, and a share modal with options.
 */
const FileCard = ({ file, onFileChange }) => {
  const [showActions, setShowActions] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.originalName);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    expiryHours: '',
    password: '',
    downloadLimit: '',
  });
  const [shareResult, setShareResult] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ─── Actions ───
  const handleDownload = async () => {
    try {
      await filesAPI.download(file._id, file.originalName);
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed');
    }
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${file.originalName}"?`)) return;
    try {
      await filesAPI.delete(file._id);
      toast.success('File deleted');
      onFileChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
    setShowActions(false);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === file.originalName) {
      setIsRenaming(false);
      return;
    }
    try {
      await filesAPI.rename(file._id, newName.trim());
      toast.success('File renamed');
      onFileChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
    }
    setIsRenaming(false);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const options = {};
      if (shareOptions.expiryHours) options.expiryHours = Number(shareOptions.expiryHours);
      if (shareOptions.password) options.password = shareOptions.password;
      if (shareOptions.downloadLimit) options.downloadLimit = Number(shareOptions.downloadLimit);

      const res = await shareAPI.create(file._id, options);
      setShareResult(res.data.data);
      toast.success('Share link created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareResult.shareUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <>
      <div className="glass-card-hover p-4 animate-fade-in">
        <div className="flex items-start gap-3">
          {/* File Icon */}
          <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0">
            <FileIcon mimeType={file.mimeType} size={20} />
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  className="input-field text-sm py-1.5"
                  autoFocus
                />
                <button onClick={handleRename} className="btn-ghost p-1 text-emerald-400">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsRenaming(false)} className="btn-ghost p-1 text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h3 className="text-sm font-medium text-dark-200 truncate" title={file.originalName}>
                {file.originalName}
              </h3>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-dark-500">{formatSize(file.size)}</span>
              <span className="text-xs text-dark-600">•</span>
              <span className="text-xs text-dark-500">{formatDate(file.createdAt)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleDownload} className="btn-ghost p-1.5" title="Download">
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setIsRenaming(true); setNewName(file.originalName); }}
              className="btn-ghost p-1.5"
              title="Rename"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowShareModal(true); setShareResult(null); }}
              className="btn-ghost p-1.5 hover:text-primary-400"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} className="btn-ghost p-1.5 hover:text-red-400" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-dark-100">Share File</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="btn-ghost p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-dark-400 mb-4 truncate">
              {file.originalName}
            </p>

            {!shareResult ? (
              <>
                {/* Share Options */}
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
                      <Clock className="w-4 h-4" /> Expiry (hours)
                    </label>
                    <input
                      type="number"
                      placeholder="No expiry"
                      value={shareOptions.expiryHours}
                      onChange={(e) => setShareOptions({ ...shareOptions, expiryHours: e.target.value })}
                      className="input-field text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
                      <Lock className="w-4 h-4" /> Password (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="No password"
                      value={shareOptions.password}
                      onChange={(e) => setShareOptions({ ...shareOptions, password: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
                      <Hash className="w-4 h-4" /> Download limit
                    </label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={shareOptions.downloadLimit}
                      onChange={(e) => setShareOptions({ ...shareOptions, downloadLimit: e.target.value })}
                      className="input-field text-sm"
                      min="1"
                    />
                  </div>
                </div>

                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  id="create-share-btn"
                >
                  {isSharing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Create Share Link
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Share Result */
              <div className="space-y-4">
                <div className="bg-dark-800 rounded-lg p-3">
                  <p className="text-xs text-dark-500 mb-1">Share URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-primary-400 flex-1 truncate">
                      {shareResult.shareUrl}
                    </code>
                    <button onClick={copyShareLink} className="btn-ghost p-1.5 text-primary-400">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {shareResult.expiryDate && (
                    <span className="badge-amber flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {new Date(shareResult.expiryDate).toLocaleString()}
                    </span>
                  )}
                  {shareResult.hasPassword && (
                    <span className="badge-primary flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Password protected
                    </span>
                  )}
                  {shareResult.downloadLimit && (
                    <span className="badge-green flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {shareResult.downloadLimit} downloads
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setShowShareModal(false)}
                  className="btn-secondary w-full"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FileCard;
