const path = require('path');
// Load root .env (Firebase) and local .env (Mongo)
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Root .env
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Server .env

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
// Trust proxy (required for correct protocol detection behind Load Balancers/Coolify)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static uploads
// Serve static uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'public/uploads');
console.log(`[Storage] Serving uploads from: ${uploadDir}`);
app.use('/uploads', express.static(uploadDir));

const userRoutes = require('./routes/users');
const sponsorshipRoutes = require('./routes/sponsorships');
const campaignRoutes = require('./routes/campaigns');
const uploadRoutes = require('./routes/upload');

// Routes
app.use('/api/users', userRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/packages', require('./routes/packages'));
app.use('/api/upload', uploadRoutes);
const systemRoutes = require('./routes/system');
const contactRoutes = require('./routes/contact');
const waitlistRoutes = require('./routes/waitlist');

// Routes
app.use('/api/users', userRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/packages', require('./routes/packages'));
app.use('/api/upload', uploadRoutes);
app.use('/api/contact', require('./routes/contact'));
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/payments/stripe', require('./routes/payments/stripe'));
app.use('/api/payments/square', require('./routes/payments/square'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/auth/github', require('./routes/auth/github'));
app.use('/api/email', require('./routes/email'));

app.get('/', (req, res) => {
    res.send('Fundraisr API is running');
});


// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fundraisr')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
