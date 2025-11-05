const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI environment variable is not set.');
    process.exit(1);
}

const client = new MongoClient(MONGO_URI);

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(cors());

// Collections
let membersCollection;
let paymentsCollection;
let expensesCollection;
let metaCollection;

// --- Connect to Database ---
async function connectDb() {
    try {
        await client.connect();
        const db = client.db('gpfr_db');

        membersCollection = db.collection('members');
        paymentsCollection = db.collection('payments');
        expensesCollection = db.collection('expenses');
        metaCollection = db.collection('meta');

        console.log('✅ Connected to MongoDB Atlas');
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err);
        process.exit(1);
    }
}

// --- GET DATA ---
app.get('/api/data', async (req, res) => {
    try {
        const members = await membersCollection.find({}).toArray();
        const payments = await paymentsCollection.find({}).toArray();
        const expenses = await expensesCollection.find({}).toArray();

        const meta = await metaCollection.findOne({ key: 'ids' }) || {
            nextMemberId: 1,
            nextPaymentId: 1
        };

        res.json({
            members,
            payments,
            expenses,
            nextMemberId: meta.nextMemberId,
            nextPaymentId: meta.nextPaymentId
        });

    } catch (err) {
        console.error('GET /api/data error:', err);
        res.status(500).json({ message: 'Failed to load data' });
    }
});

// --- SAVE DATA ---
app.post('/api/data', async (req, res) => {
    const { members = [], payments = [], expenses = [], nextMemberId = 1, nextPaymentId = 1 } = req.body || {};

    try {
        await membersCollection.deleteMany({});
        await paymentsCollection.deleteMany({});
        await expensesCollection.deleteMany({});

        if (members.length) await membersCollection.insertMany(members);
        if (payments.length) await paymentsCollection.insertMany(payments);
        if (expenses.length) await expensesCollection.insertMany(expenses);

        await metaCollection.updateOne(
            { key: 'ids' },
            { $set: { nextMemberId, nextPaymentId } },
            { upsert: true }
        );

        res.json({ message: '✅ Data saved successfully' });

    } catch (err) {
        console.error('POST /api/data error:', err);
        res.status(500).json({ message: 'Failed to save data' });
    }
});

// --- EXPORT JSON ---
app.get('/api/export', async (req, res) => {
    try {
        const members = await membersCollection.find({}).toArray();
        const payments = await paymentsCollection.find({}).toArray();
        const expenses = await expensesCollection.find({}).toArray();

        const filename = `gpfr-export-${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify({ members, payments, expenses }, null, 2));

    } catch (err) {
        console.error('GET /api/export error:', err);
        res.status(500).json({ message: 'Failed to export data' });
    }
});

// --- Serve Frontend (index.html in same folder) ---
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start Server ---
async function start() {
    await connectDb();
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`✅ Server running on port ${port}`));
}

start();
