const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
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

        // Use slug if provided, otherwise generate a random prefix (not userId for security)
        const slug = req.body.slug;
        const prefix = slug || `org-${Math.random().toString(36).substring(2, 10)}`;
        const ext = path.extname(req.file.filename);
        const newFilename = `${prefix}-${Date.now()}${ext}`;
        const oldPath = path.join(uploadDir, req.file.filename);
        const newPath = path.join(uploadDir, newFilename);

        fs.renameSync(oldPath, newPath);

        // Generate Public URL
        // Generate Public URL
        // dynamically determine the base URL from the request
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        const fileUrl = `${baseUrl}/uploads/${newFilename}`;

        console.log('Local Upload Success:', fileUrl);
        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

