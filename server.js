const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI environment variable is not set.');
    process.exit(1);
}

const client = new MongoClient(MONGO_URI);

const createAuth = require('./auth');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// --- Auth Setup ---
const password = process.env.APP_PASSWORD;
if (!password) {
    console.warn('WARNING: No APP_PASSWORD set. Using default "admin".');
}

// Collections
let membersCollection;
let paymentsCollection;
let expensesCollection;
let tokensCollection; // New: Declare tokensCollection

// --- Database Connection ---
async function connectDb() {
    try {
        await client.connect();
        db = client.db('gpfr_db'); // You can name your database here
        
        membersCollection = db.collection('members');
        paymentsCollection = db.collection('payments');
        expensesCollection = db.collection('expenses');
        tokensCollection = db.collection('tokens'); // New: Initialize tokensCollection
        
        console.log('Successfully connected to MongoDB Atlas');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

const auth = createAuth(password || 'admin', tokensCollection); // New: Initialize auth here

// --- API Endpoints ---

// Login

// Get all data
app.get('/api/data', auth.check, async (req, res) => {
    try {
        const members = await membersCollection.find({}).sort({ id: 1 }).toArray();
        const payments = await paymentsCollection.find({}).sort({ id: 1 }).toArray();
        const expenses = await expensesCollection.find({}).sort({ _id: 1 }).toArray();
        
        // Map _id to id for expenses for frontend compatibility
        const mappedExpenses = expenses.map(e => ({ ...e, id: e._id.toString() }));

        res.json({ members, payments, expenses: mappedExpenses });
    } catch (err) {
        console.error('GET /api/data error:', err);
        res.status(500).json({ message: 'Failed to read data' });
    }
});

// Save all data
app.post('/api/data', auth.check, async (req, res) => {
    const payload = req.body || {};
    const { members = [], payments = [], expenses = [] } = payload;

    try {
        // Use bulk writes for efficiency
        const memberOps = [
            { deleteMany: { filter: {} } },
            ...members.map(m => ({ insertOne: { document: m } }))
        ];
        const paymentOps = [
            { deleteMany: { filter: {} } },
            ...payments.map(p => ({ insertOne: { document: p } }))
        ];
        const expenseOps = [
            { deleteMany: { filter: {} } },
            ...expenses.map(e => ({ insertOne: { document: e } }))
        ];

        if (memberOps.length > 1) await membersCollection.bulkWrite(memberOps, { ordered: false });
        else await membersCollection.deleteMany({});

        if (paymentOps.length > 1) await paymentsCollection.bulkWrite(paymentOps, { ordered: false });
        else await paymentsCollection.deleteMany({});
        
        if (expenseOps.length > 1) await expensesCollection.bulkWrite(expenseOps, { ordered: false });
        else await expensesCollection.deleteMany({});

        res.json({ message: 'Data saved successfully' });
    } catch (err) {
        console.error('POST /api/data error:', err);
        res.status(500).json({ message: 'Failed to save data' });
    }
});

// Export data
app.get('/api/export', auth.check, async (req, res) => {
    try {
        const members = await membersCollection.find({}).toArray();
        const payments = await paymentsCollection.find({}).toArray();
        const expenses = await expensesCollection.find({}).toArray();
        
        const data = { members, payments, expenses };
        const filename = `gpfr-export-${Date.now()}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('GET /api/export error:', err);
        res.status(500).json({ message: 'Failed to export data' });
    }
});


// --- Serve Frontend ---
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- Initialize and Start Server ---
async function start() {
    await connectDb();
    
    const port = parseInt(process.env.PORT || '5000', 10);
    app.listen(port, () => {
        console.log(`
Server ready at: http://localhost:${port}
`);
    });
}

start();