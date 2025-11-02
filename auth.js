const crypto = require('crypto');

// Simple password protection middleware
function createAuth(password) {
    // Create a hash of the password
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Store the token for 24 hours
    const tokens = new Set();
    setInterval(() => tokens.clear(), 24 * 60 * 60 * 1000);

    return {
        // Middleware to check auth
        check: (req, res, next) => {
            const token = req.headers.authorization?.split(' ')[1] || req.query.token;
            
            if (!token || !tokens.has(token)) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            
            next();
        },

        // Login endpoint handler
        login: (req, res) => {
            const { password: input } = req.body;
            
            if (!input || crypto.createHash('sha256').update(input).digest('hex') !== hash) {
                res.status(401).json({ message: 'Invalid password' });
                return;
            }

            const token = crypto.randomBytes(32).toString('hex');
            tokens.add(token);
            res.json({ token });
        }
    };
}

module.exports = createAuth;