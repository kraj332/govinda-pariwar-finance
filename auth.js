const crypto = require('crypto');
const { ObjectId } = require('mongodb'); // Import ObjectId for database IDs

// Simple password protection middleware
function createAuth(password, tokensCollection) {
    // Create a hash of the password
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Clean up expired tokens every hour
    setInterval(async () => {
        try {
            await tokensCollection.deleteMany({ expiresAt: { $lt: new Date() } });
            console.log('Expired tokens cleaned up.');
        } catch (err) {
            console.error('Error cleaning up expired tokens:', err);
        }
    }, 60 * 60 * 1000); // Every hour

    return {
        // Middleware to check auth
        check: async (req, res, next) => {
            const token = req.headers.authorization?.split(' ')[1] || req.query.token;
            
            if (!token) {
                res.status(401).json({ message: 'Unauthorized: No token provided' });
                return;
            }

            try {
                const storedToken = await tokensCollection.findOne({ token, expiresAt: { $gt: new Date() } });
                if (!storedToken) {
                    res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
                    return;
                }
            } catch (err) {
                console.error('Error checking token:', err);
                res.status(500).json({ message: 'Internal server error during token validation' });
                return;
            }
            
            next();
        },

        // Login endpoint handler
        login: async (req, res) => {
            const { password: input } = req.body;
            
            if (!input || crypto.createHash('sha256').update(input).digest('hex') !== hash) {
                res.status(401).json({ message: 'Invalid password' });
                return;
            }

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token valid for 24 hours

            try {
                await tokensCollection.insertOne({ token, expiresAt });
                res.json({ token });
            } catch (err) {
                console.error('Error storing token:', err);
                res.status(500).json({ message: 'Internal server error during login' });
            }
        }
    };
}

module.exports = createAuth;