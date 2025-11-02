
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
let Database;
let useSqlite = true;
try {
    Database = require('better-sqlite3');
} catch (err) {
    console.warn('better-sqlite3 not available - falling back to file storage. To enable SQLite install build tools and run npm install.');
    useSqlite = false;
}

const app = express();
app.use(express.json());
app.use(cors());

// Files used by server
const DATA_FILE = path.join(__dirname, 'data.json'); // legacy backup/import
const DB_FILE = path.join(__dirname, 'gpfr.db');

if (useSqlite) {
// Initialize SQLite DB and schema
function initDb() {
    const db = new Database(DB_FILE);
    // enable WAL for better concurrency
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY,
            name TEXT,
            flat TEXT,
            fee REAL,
            join_date TEXT,
            photo TEXT
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY,
            memberId INTEGER,
            month TEXT,
            amount REAL,
            method TEXT,
            date TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            category TEXT,
            description TEXT,
            vendor TEXT,
            amount REAL,
            receipt TEXT
        );
    `);

    return db;
}

const db = initDb();

// If DB is empty but a data.json exists, migrate it into SQLite
function migrateFromDataJson() {
    try {
        if (!fs.existsSync(DATA_FILE)) return;
        const count = db.prepare('SELECT COUNT(*) as c FROM members').get().c;
        if (count > 0) return; // already has data

        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const members = Array.isArray(parsed.members) ? parsed.members : [];
        const payments = Array.isArray(parsed.payments) ? parsed.payments : [];
        const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];

        const insertMember = db.prepare('INSERT OR REPLACE INTO members (id, name, flat, fee, join_date, photo) VALUES (@id, @name, @flat, @fee, @join, @photo)');
        const insertPayment = db.prepare('INSERT OR REPLACE INTO payments (id, memberId, month, amount, method, date, notes) VALUES (@id, @memberId, @month, @amount, @method, @date, @notes)');
        const insertExpense = db.prepare('INSERT INTO expenses (date, category, description, vendor, amount, receipt) VALUES (@date, @category, @description, @vendor, @amount, @receipt)');

        const memberTx = db.transaction((rows) => {
            for (const r of rows) insertMember.run({
                id: r.id,
                name: r.name,
                flat: r.flat,
                fee: r.fee,
                join: r.join,
                photo: r.photo || ''
            });
        });

        const paymentTx = db.transaction((rows) => {
            for (const p of rows) insertPayment.run({
                id: p.id,
                memberId: p.memberId,
                month: p.month,
                amount: p.amount,
                method: p.method,
                date: p.date,
                notes: p.notes || ''
            });
        });

        const expenseTx = db.transaction((rows) => {
            for (const e of rows) insertExpense.run({
                date: e.date,
                category: e.category,
                description: e.description,
                vendor: e.vendor,
                amount: e.amount,
                receipt: e.receipt || null
            });
        });

        memberTx(members);
        paymentTx(payments);
        expenseTx(expenses);

        console.log('Migrated data from', DATA_FILE, 'into', DB_FILE);
    } catch (err) {
        console.error('Migration error:', err);
    }
}

migrateFromDataJson();

// Helpers to read entire dataset
function readAllData() {
    // `join` is a SQL keyword, quote the alias so SQLite doesn't error
    const members = db.prepare('SELECT id, name, flat, fee, join_date as "join", photo FROM members ORDER BY id').all();
    const payments = db.prepare('SELECT id, memberId, month, amount, method, date, notes FROM payments ORDER BY id').all();
    const expenses = db.prepare('SELECT id, date, category, description, vendor, amount, receipt FROM expenses ORDER BY id').all();
    return { members, payments, expenses };
}

// API endpoints (same shape as before)
app.get('/api/data', (req, res) => {
    try {
        const data = readAllData();
        res.json(data);
    } catch (err) {
        console.error('GET /api/data error:', err);
        res.status(500).json({ message: 'Failed to read data' });
    }
});

// Export current dataset as JSON (downloadable)
app.get('/api/export', (req, res) => {
    try {
        const data = useSqlite ? readAllData() : { members, payments, expenses };
        const filename = `gpfr-export-${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('GET /api/export error:', err);
        res.status(500).json({ message: 'Failed to export data' });
    }
});

// Replace entire DB contents with provided payload (small dataset expected)
app.post('/api/data', (req, res) => {
    const payload = req.body || {};
    const members = Array.isArray(payload.members) ? payload.members : [];
    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];

    try {
        const deleteTx = db.transaction(() => {
            db.prepare('DELETE FROM members').run();
            db.prepare('DELETE FROM payments').run();
            db.prepare('DELETE FROM expenses').run();
        });
        deleteTx();

        const insertMember = db.prepare('INSERT OR REPLACE INTO members (id, name, flat, fee, join_date, photo) VALUES (@id, @name, @flat, @fee, @join, @photo)');
        const insertPayment = db.prepare('INSERT OR REPLACE INTO payments (id, memberId, month, amount, method, date, notes) VALUES (@id, @memberId, @month, @amount, @method, @date, @notes)');
        const insertExpense = db.prepare('INSERT INTO expenses (date, category, description, vendor, amount, receipt) VALUES (@date, @category, @description, @vendor, @amount, @receipt)');

        const memberTx = db.transaction((rows) => {
            for (const r of rows) insertMember.run({
                id: r.id,
                name: r.name,
                flat: r.flat,
                fee: r.fee,
                join: r.join,
                photo: r.photo || ''
            });
        });

        const paymentTx = db.transaction((rows) => {
            for (const p of rows) insertPayment.run({
                id: p.id,
                memberId: p.memberId,
                month: p.month,
                amount: p.amount,
                method: p.method,
                date: p.date,
                notes: p.notes || ''
            });
        });

        const expenseTx = db.transaction((rows) => {
            for (const e of rows) insertExpense.run({
                date: e.date,
                category: e.category,
                description: e.description,
                vendor: e.vendor,
                amount: e.amount,
                receipt: e.receipt || null
            });
        });

        memberTx(members);
        paymentTx(payments);
        expenseTx(expenses);

        // Also write a JSON backup for convenience
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify({ members, payments, expenses }, null, 2));
        } catch (err) {
            console.warn('Could not write data.json backup:', err.message);
        }

        res.json({ message: 'Data saved to SQLite' });
    } catch (err) {
        console.error('POST /api/data error:', err);
        res.status(500).json({ message: 'Failed to save data' });
    }
});

} else {
    // Legacy file-based fallback (keeps previous behavior when better-sqlite3 is not installed)
    let members = [
        {id:1, name:"Harish", flat:"1", fee:1000, join:"2025-04-01", photo:""},
        {id:2, name:"Mallesh", flat:"2", fee:1000, join:"2025-04-01", photo:""},
        {id:3, name:"Sunny", flat:"3", fee:1000, join:"2025-04-01", photo:""},
        {id:4, name:"Vittal Rao", flat:"4", fee:1000, join:"2025-04-01", photo:""},
        {id:5, name:"Ramesh Yadhav", flat:"5", fee:1000, join:"2025-04-01", photo:""},
        {id:6, name:"Swamy", flat:"6", fee:1000, join:"2025-04-01", photo:""},
        {id:7, name:"Rajinikannth", flat:"7", fee:1000, join:"2025-04-01", photo:""},
        {id:8, name:"Rajireddy", flat:"8", fee:1000, join:"2025-04-01", photo:""},
        {id:9, name:"Madhu", flat:"9", fee:1000, join:"2025-04-01", photo:""},
        {id:10, name:"Srinivas Tadwai", flat:"10", fee:1000, join:"2025-04-01", photo:""},
        {id:11, name:"Sridhar", flat:"11", fee:1000, join:"2025-04-01", photo:""},
        {id:12, name:"Ramulu", flat:"12", fee:1000, join:"2025-04-01", photo:""},
        {id:13, name:"Anil", flat:"13", fee:1000, join:"2025-04-01", photo:""},
        {id:14, name:"Suresh Setu", flat:"14", fee:1000, join:"2025-04-01", photo:""},
        {id:15, name:"Shankar", flat:"15", fee:1000, join:"2025-04-01", photo:""},
        {id:16, name:"Srinivas", flat:"16", fee:1000, join:"2025-04-01", photo:""},
        {id:17, name:"Krishnamohan", flat:"17", fee:1000, join:"2025-04-01", photo:""},
        {id:18, name:"Anjil Reddy", flat:"18", fee:1000, join:"2025-04-01", photo:""},
        {id:19, name:"SathyaNarayaanRao", flat:"19", fee:1000, join:"2025-04-01", photo:""},
        {id:20, name:"Bhaskar Reddy", flat:"20", fee:1000, join:"2025-04-01", photo:""},
        {id:21, name:"Avinesh", flat:"21", fee:1000, join:"2025-04-01", photo:""},
        {id:22, name:"Saikumar", flat:"22", fee:1000, join:"2025-04-01", photo:""},
        {id:23, name:"Arjun Rao", flat:"23", fee:1000, join:"2025-04-01", photo:""},
        {id:24, name:"K Suresh", flat:"24", fee:1000, join:"2025-04-01", photo:""},
        {id:25, name:"Exsize Sridhar BALL", flat:"25", fee:1000, join:"2025-04-01", photo:""},
        {id:26, name:"Sai Naresh", flat:"26", fee:1000, join:"2025-04-01", photo:""},
        {id:27, name:"Rajeshwari Madam", flat:"27", fee:1000, join:"2025-04-01", photo:""},
        {id:28, name:"Sardhar", flat:"28", fee:1000, join:"2025-04-01", photo:""},
        {id:29, name:"Purshotam sharma", flat:"29", fee:1000, join:"2025-04-01", photo:""},
        {id:30, name:"Thota Ramulu", flat:"30", fee:1000, join:"2025-04-01", photo:""},
        {id:31, name:"Mallava", flat:"31", fee:1000, join:"2025-04-01", photo:""},
        {id:32, name:"Manohar sir", flat:"32", fee:1000, join:"2025-04-01", photo:""}
    ];

    let payments = [
        {id:1, memberId:2, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:2, memberId:3, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:3, memberId:5, month:"2025-04", amount:2000, method:"Cash", date:"2025-04-15", notes:"Advance payment"},
        {id:4, memberId:7, month:"2025-04", amount:1000, method:"UPI", date:"2025-04-15", notes:""},
        {id:5, memberId:8, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:6, memberId:9, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:7, memberId:10, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:8, memberId:11, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:9, memberId:12, month:"2025-04", amount:2500, method:"Bank Transfer", date:"2025-04-15", notes:"Multiple months"},
        {id:10, memberId:13, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:11, memberId:16, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:12, memberId:17, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:13, memberId:18, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:14, memberId:19, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:15, memberId:20, month:"2025-04", amount:2000, method:"Cash", date:"2025-04-15", notes:"Advance payment"},
        {id:16, memberId:21, month:"2025-04", amount:1500, method:"Cash", date:"2025-04-15", notes:"Partial payment"},
        {id:17, memberId:22, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:18, memberId:25, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:19, memberId:26, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:20, memberId:27, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:21, memberId:28, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:22, memberId:30, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:23, memberId:31, month:"2025-04", amount:1000, method:"Cash", date:"2025-04-15", notes:""},
        {id:24, memberId:2, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:25, memberId:7, month:"2025-05", amount:2500, method:"Bank Transfer", date:"2025-05-15", notes:"Multiple months"},
        {id:26, memberId:8, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:27, memberId:9, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:28, memberId:11, month:"2025-05", amount:2500, method:"Bank Transfer", date:"2025-05-15", notes:"Multiple months"},
        {id:29, memberId:13, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:30, memberId:14, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:31, memberId:16, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:32, memberId:17, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:33, memberId:18, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:34, memberId:19, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:35, memberId:26, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:36, memberId:27, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:37, memberId:28, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:38, memberId:29, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""},
        {id:39, memberId:31, month:"2025-05", amount:1000, method:"Cash", date:"2025-05-15", notes:""}
    ];

    let expenses = [];

    // Try to load persisted data from disk (data.json). If present, use it to initialize state.
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.members)) members = parsed.members;
            if (Array.isArray(parsed.payments)) payments = parsed.payments;
            if (Array.isArray(parsed.expenses)) expenses = parsed.expenses;
            console.log('Loaded data from', DATA_FILE);
        } else {
            // persist initial seed to disk so deployments start with the same data
            fs.writeFileSync(DATA_FILE, JSON.stringify({ members, payments, expenses }, null, 2));
            console.log('Wrote initial data to', DATA_FILE);
        }
    } catch (err) {
        console.error('Error reading/writing data file:', err);
    }

    // API endpoints
    app.get('/api/data', (req, res) => {
        res.json({ members, payments, expenses });
    });

    app.post('/api/data', (req, res) => {
        ({ members, payments, expenses } = req.body);
        // persist to disk
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify({ members, payments, expenses }, null, 2));
        } catch (err) {
            console.error('Error saving data to file:', err);
            return res.status(500).json({ message: 'Failed to save data' });
        }
        res.json({ message: 'Data saved successfully' });
    });

}

// Serve frontend static files (index.html etc.) from project root
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
