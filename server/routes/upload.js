const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../public/uploads');
console.log(`[Upload Route] Uploads will be saved to: ${uploadDir}`);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for Disk Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate temp filename first - we'll rename after upload when req.body is available
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'temp-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Require userId for organization/tracking purposes
        const userId = req.body.userId || req.headers['x-user-id'];
        if (!userId) {
            // Clean up uploaded file
            const tempPath = path.join(uploadDir, req.file.filename);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            return res.status(400).json({ error: 'userId is required for uploads' });
        }

        // Validate file type (images only)
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            // Clean up uploaded file
            const tempPath = path.join(uploadDir, req.file.filename);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            return res.status(400).json({ error: 'Only image files are allowed' });
        }

        // Use slug if provided, otherwise generate a random prefix
        const slug = req.body.slug;
        const prefix = slug || `org-${Math.random().toString(36).substring(2, 10)}`;

        // Organization Subfolder Logic
        // Use userId (preferred) or slug to organize files
        console.log('[Upload Debug] Request Body:', req.body);
        const folderId = req.body.userId || req.body.id || req.body.slug || 'misc';
        console.log('[Upload Debug] Determined Folder ID:', folderId);

        // Sanitize to safe characters only
        const subfolder = String(folderId).replace(/[^a-zA-Z0-9-_]/g, '');
        console.log('[Upload Debug] Target Subfolder:', subfolder);

        const targetDir = path.join(uploadDir, subfolder);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const ext = path.extname(req.file.filename);
        const newFilename = `${prefix}-${Date.now()}${ext}`;
        const oldPath = path.join(uploadDir, req.file.filename);
        const newPath = path.join(targetDir, newFilename);

        fs.renameSync(oldPath, newPath);

        // Generate Public URL
        // dynamically determine the base URL from the request
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        const fileUrl = `${baseUrl}/uploads/${subfolder}/${newFilename}`;

        console.log('Local Upload Success:', fileUrl);
        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

