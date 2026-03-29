import {
  FileText, Image, FileSpreadsheet, File, FileArchive,
  FileCode, Presentation, Film, Music
} from 'lucide-react';

/**
 * FileIcon
 * Returns an appropriate icon + color based on MIME type.
 */
const FileIcon = ({ mimeType, size = 24, className = '' }) => {
  const getIconConfig = () => {
    if (!mimeType) return { Icon: File, color: 'text-dark-400' };

    if (mimeType.startsWith('image/')) {
      return { Icon: Image, color: 'text-emerald-400' };
    }
    if (mimeType === 'application/pdf') {
      return { Icon: FileText, color: 'text-red-400' };
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return { Icon: FileText, color: 'text-blue-400' };
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
      return { Icon: FileSpreadsheet, color: 'text-green-400' };
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return { Icon: Presentation, color: 'text-orange-400' };
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return { Icon: FileArchive, color: 'text-amber-400' };
    }
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml')) {
      return { Icon: FileCode, color: 'text-cyan-400' };
    }
    if (mimeType.startsWith('video/')) {
      return { Icon: Film, color: 'text-purple-400' };
    }
    if (mimeType.startsWith('audio/')) {
      return { Icon: Music, color: 'text-pink-400' };
    }
    if (mimeType === 'text/plain') {
      return { Icon: FileText, color: 'text-dark-300' };
    }

    return { Icon: File, color: 'text-dark-400' };
  };

  const { Icon, color } = getIconConfig();

  return (
    <div className={`${color} ${className}`}>
      <Icon size={size} />
    </div>
  );
};

export default FileIcon;
