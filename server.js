
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

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

// API endpoints
app.get('/api/data', (req, res) => {
    res.json({ members, payments, expenses });
});

app.post('/api/data', (req, res) => {
    ({ members, payments, expenses } = req.body);
    res.json({ message: 'Data saved successfully' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
