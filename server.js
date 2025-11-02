const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const createAuth = require('./auth');

const app = express();
app.use(express.json());
app.use(cors());

// Auth setup
const password = process.env.APP_PASSWORD;
if (!password) {
    console.warn('WARNING: No APP_PASSWORD set. Access will be open.');
}
const auth = createAuth(password || 'admin'); // Fallback for local dev


// Database setup
const DB_FILE = path.join(__dirname, 'gpfr.db');
const DATA_FILE = path.join(__dirname, 'data.json');

// Create database connection
const db = new sqlite3.Database(DB_FILE);

// Promisify database methods we need
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Initialize database schema
async function initDb() {
    await dbRun(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY,
        name TEXT,
        flat TEXT,
        fee REAL,
        join_date TEXT,
        photo TEXT
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY,
        memberId INTEGER,
        month TEXT,
        amount REAL,
        method TEXT,
        date TEXT,
        notes TEXT
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        category TEXT,
        description TEXT,
        vendor TEXT,
        amount REAL,
        receipt TEXT
    )`);
}

// Migrate data from JSON if needed
async function migrateFromDataJson() {
    try {
        if (!fs.existsSync(DATA_FILE)) return;
        
        const count = await dbGet('SELECT COUNT(*) as count FROM members');
        if (count && count.count > 0) return;

        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const members = Array.isArray(parsed.members) ? parsed.members : [];
        const payments = Array.isArray(parsed.payments) ? parsed.payments : [];
        const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];

        await dbRun('BEGIN TRANSACTION');
        
        try {
            for (const r of members) {
                await dbRun(
                    'INSERT INTO members (id, name, flat, fee, join_date, photo) VALUES (?, ?, ?, ?, ?, ?)',
                    [r.id, r.name, r.flat, r.fee, r.join, r.photo || '']
                );
            }

            for (const p of payments) {
                await dbRun(
                    'INSERT INTO payments (id, memberId, month, amount, method, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.memberId, p.month, p.amount, p.method, p.date, p.notes || '']
                );
            }

            for (const e of expenses) {
                await dbRun(
                    'INSERT INTO expenses (date, category, description, vendor, amount, receipt) VALUES (?, ?, ?, ?, ?, ?)',
                    [e.date, e.category, e.description, e.vendor, e.amount, e.receipt || null]
                );
            }

            await dbRun('COMMIT');
            console.log('Migrated data from', DATA_FILE, 'into', DB_FILE);
        } catch (err) {
            await dbRun('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Migration error:', err);
    }
}

// Read all data from database
async function readAllData() {
    const members = await dbAll('SELECT id, name, flat, fee, join_date as "join", photo FROM members ORDER BY id');
    const payments = await dbAll('SELECT id, memberId, month, amount, method, date, notes FROM payments ORDER BY id');
    const expenses = await dbAll('SELECT id, date, category, description, vendor, amount, receipt FROM expenses ORDER BY id');
    return { members, payments, expenses };
}

// API endpoints
app.post('/api/login', auth.login);
app.get('/api/data', auth.check, async (req, res) => {
    try {
        const data = await readAllData();
        res.json(data);
    } catch (err) {
        console.error('GET /api/data error:', err);
        res.status(500).json({ message: 'Failed to read data' });
    }
});

app.post('/api/data', auth.check, async (req, res) => {
    const payload = req.body || {};
    const members = Array.isArray(payload.members) ? payload.members : [];
    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];

    try {
        await dbRun('BEGIN TRANSACTION');

        try {
            await dbRun('DELETE FROM members');
            await dbRun('DELETE FROM payments');
            await dbRun('DELETE FROM expenses');

            for (const r of members) {
                await dbRun(
                    'INSERT INTO members (id, name, flat, fee, join_date, photo) VALUES (?, ?, ?, ?, ?, ?)',
                    [r.id, r.name, r.flat, r.fee, r.join, r.photo || '']
                );
            }

            for (const p of payments) {
                await dbRun(
                    'INSERT INTO payments (id, memberId, month, amount, method, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.memberId, p.month, p.amount, p.method, p.date, p.notes || '']
                );
            }

            for (const e of expenses) {
                await dbRun(
                    'INSERT INTO expenses (date, category, description, vendor, amount, receipt) VALUES (?, ?, ?, ?, ?, ?)',
                    [e.date, e.category, e.description, e.vendor, e.amount, e.receipt || null]
                );
            }

            await dbRun('COMMIT');

            // Write backup
            try {
                fs.writeFileSync(DATA_FILE, JSON.stringify({ members, payments, expenses }, null, 2));
            } catch (err) {
                console.warn('Could not write data.json backup:', err.message);
            }

            res.json({ message: 'Data saved successfully' });
        } catch (err) {
            await dbRun('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('POST /api/data error:', err);
        res.status(500).json({ message: 'Failed to save data' });
    }
});

// Export endpoint
app.get('/api/export', auth.check, async (req, res) => {
    try {
        const data = await readAllData();
        const filename = `gpfr-export-${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('GET /api/export error:', err);
        res.status(500).json({ message: 'Failed to export data' });
    }
});

// Serve frontend
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize and start
async function start() {
    try {
        await initDb();
        await migrateFromDataJson();
        
        const port = parseInt(process.env.PORT || '5000', 10);
        app.listen(port, () => {
            console.log(`\nServer ready at:`);
            console.log(`  http://localhost:${port}`);
            console.log(`\nOpen this URL in your browser to use the app\n`);
        });
    } catch (err) {
        console.error('Startup error:', err);
        process.exit(1);
    }
}

start();
