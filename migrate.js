const { MongoClient } = require('mongodb');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Your MongoDB connection string. 
// It's recommended to use an environment variable for this in production.
const MONGO_URI = process.env.MONGO_URI;
const DATA_FILE = path.join(__dirname, 'data.json');

async function migrate() {
    if (!MONGO_URI) {
        console.error('ERROR: MONGO_URI environment variable is not set.');
        console.log('Please run the script like this:');
        console.log('MONGO_URI="your_connection_string" node migrate.js');
        process.exit(1);
    }

    console.log('Starting migration...');
    const client = new MongoClient(MONGO_URI);

    try {
        // --- Connect to the database ---
        await client.connect();
        const db = client.db('gpfr_db');
        console.log('Successfully connected to MongoDB.');

        // --- Read local data file ---
        if (!fs.existsSync(DATA_FILE)) {
            throw new Error(`Data file not found at ${DATA_FILE}`);
        }
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);
        const { members = [], payments = [], expenses = [] } = data;
        console.log(`Found ${members.length} members, ${payments.length} payments, and ${expenses.length} expenses in data.json.`);

        // --- Get collections ---
        const membersCollection = db.collection('members');
        const paymentsCollection = db.collection('payments');
        const expensesCollection = db.collection('expenses');

        // --- Clear existing data in collections ---
        console.log('Clearing existing data from collections...');
        await membersCollection.deleteMany({});
        await paymentsCollection.deleteMany({});
        await expensesCollection.deleteMany({});

        // --- Insert new data ---
        console.log('Inserting new data...');
        if (members.length > 0) {
            await membersCollection.insertMany(members);
        }
        if (payments.length > 0) {
            await paymentsCollection.insertMany(payments);
        }
        if (expenses.length > 0) {
            await expensesCollection.insertMany(expenses);
        }

        console.log('\n✅ Migration successful!');
        console.log('Your data has been uploaded to the MongoDB Atlas database.');
        console.log('You can now refresh your deployed application to see the data.');

    } catch (err) {
        console.error('\n❌ An error occurred during migration:', err);
    } finally {
        // --- Close the connection ---
        await client.close();
        console.log('\nConnection to MongoDB closed.');
    }
}

migrate();
