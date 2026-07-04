// Client-side mirror of the backend's upload allowlist (FileStorageService.ALLOWED_EXTENSIONS,
// application.yml's spring.servlet.multipart.max-file-size: 10MB) - gives the user instant
// feedback instead of a full upload round-trip just to find out the file type/size was rejected.
// This is a UX convenience only, not a security boundary - the backend still enforces both
// independently and remains the real gate.
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateFile(file) {
  if (!file) return 'No file selected';
  const name = file.name || '';
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `File type not allowed. Supported: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File is too large - maximum size is 10 MB';
  }
  return null;
}
