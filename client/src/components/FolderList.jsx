import { useState } from 'react';
import { Folder, FolderPlus, Trash2, ChevronRight, Home, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { foldersAPI } from '../services/api';

/**
 * FolderList
 * Sidebar component for folder navigation and creation.
 */
const FolderList = ({
  folders,
  selectedFolder,
  onSelectFolder,
  onFoldersChange,
  loading,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreating(true);
    try {
      await foldersAPI.create(newFolderName.trim());
      toast.success('Folder created!');
      setNewFolderName('');
      setShowCreate(false);
      onFoldersChange(); // Refresh folder list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this folder? Files will be moved to root.')) return;

    try {
      await foldersAPI.delete(folderId);
      toast.success('Folder deleted');
      if (selectedFolder === folderId) {
        onSelectFolder(null); // Go back to root
      }
      onFoldersChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete folder');
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 glass-card rounded-none border-t-0 border-b-0 border-l-0 p-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">Folders</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-ghost p-1.5"
          title="New Folder"
          id="new-folder-btn"
        >
          {showCreate ? <X className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
        </button>
      </div>

      {/* Create folder form */}
      {showCreate && (
        <form onSubmit={handleCreateFolder} className="mb-4 animate-slide-down">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="input-field text-sm py-2"
              autoFocus
              id="folder-name-input"
            />
            <button
              type="submit"
              disabled={creating || !newFolderName.trim()}
              className="btn-primary text-sm py-2 px-3 whitespace-nowrap"
              id="create-folder-submit"
            >
              {creating ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Folder list */}
      <nav className="flex-1 overflow-y-auto space-y-1">
        {/* All Files (root) */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
            ${selectedFolder === null
              ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
              : 'text-dark-300 hover:bg-dark-800 hover:text-dark-200'
            }`}
          id="all-files-btn"
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          <span className="truncate flex-1 text-left">All Files</span>
        </button>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          folders.map((folder) => (
            <button
              key={folder._id}
              onClick={() => onSelectFolder(folder._id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
                ${selectedFolder === folder._id
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                  : 'text-dark-300 hover:bg-dark-800 hover:text-dark-200'
                }`}
            >
              <Folder className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <span className="text-xs text-dark-500">{folder.fileCount}</span>
              <button
                onClick={(e) => handleDeleteFolder(folder._id, e)}
                className="opacity-0 group-hover:opacity-100 text-dark-500 hover:text-red-400 transition-all p-1"
                title="Delete folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))
        )}

        {!loading && folders.length === 0 && (
          <div className="py-8 text-center">
            <Folder className="w-8 h-8 text-dark-600 mx-auto mb-2" />
            <p className="text-dark-500 text-xs">No folders yet</p>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default FolderList;
