// Example JavaScript file for testing the modernization toolset
const express = require('express');
const mysql = require('mysql');

// Potential security issue - hardcoded credentials
const dbConfig = {
  host: 'localhost',
  user: 'admin',
  password: 'password123', // This is a hardcoded secret
  database: 'myapp'
};

// SQL injection vulnerability
function getUserById(userId) {
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  return mysql.query(query);
}

// HTTP instead of HTTPS
const apiUrl = 'http://api.example.com/data';

// Basic Express app
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/user/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
}); 