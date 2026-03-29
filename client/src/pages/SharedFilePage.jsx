import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shareAPI } from '../services/api';
import {
  Shield, Download, Lock, Clock, AlertTriangle,
  FileText, Loader2, ArrowLeft, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import FileIcon from '../components/FileIcon';

/**
 * SharedFilePage
 * Public page for accessing shared files.
 * Handles password-protected links and expiry status.
 */
const SharedFilePage = () => {
  const { token } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Fetch shared file info
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await shareAPI.getInfo(token);
        setFileInfo(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Link is invalid or has expired');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await shareAPI.download(
        token,
        fileInfo.fileName,
        fileInfo.hasPassword ? password : null
      );
      toast.success('Download started!');
    } catch (err) {
      const message = err.response?.data?.message || 'Download failed';
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-dark-950">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-primary-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* Back to app link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to SecureVault
        </Link>

        <div className="glass-card p-8 glow animate-scale-in">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-dark-400 text-sm">Loading shared file...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-200 mb-1">Link Unavailable</h3>
                <p className="text-dark-400 text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-dark-100 mb-1">Shared File</h3>
                <p className="text-dark-400 text-sm">Someone shared a file with you</p>
              </div>

              {/* File Info */}
              <div className="bg-dark-800/60 rounded-xl p-5 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                    <FileIcon mimeType={fileInfo.mimeType} size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-dark-200 font-medium truncate">{fileInfo.fileName}</h4>
                    <p className="text-dark-500 text-sm">{formatSize(fileInfo.fileSize)}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {fileInfo.expiryDate && (
                    <span className="badge-amber flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {new Date(fileInfo.expiryDate).toLocaleDateString()}
                    </span>
                  )}
                  {fileInfo.hasPassword && (
                    <span className="badge-primary flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Password required
                    </span>
                  )}
                  {fileInfo.downloadsRemaining !== null && (
                    <span className="badge-green flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {fileInfo.downloadsRemaining} downloads left
                    </span>
                  )}
                </div>
              </div>

              {/* Password input if required */}
              {fileInfo.hasPassword && (
                <div className="mb-5">
                  <label className="flex items-center gap-2 text-sm text-dark-300 mb-1.5">
                    <Lock className="w-4 h-4" /> Enter password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password to access file"
                    className="input-field"
                    id="share-password-input"
                  />
                </div>
              )}

              {/* Download button */}
              <button
                onClick={handleDownload}
                disabled={downloading || (fileInfo.hasPassword && !password)}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                id="download-shared-btn"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download File
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedFilePage;
