// index.js
import dotenv from 'dotenv';
import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Configuration
dotenv.config();
const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Database initialization
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id SERIAL PRIMARY KEY,
        soil_moisture INT,
        nitrogen INT,
        phosphorus INT,
        potassium INT,
        soil_pH FLOAT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on startup
initDB();

// Route: Serve the main dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API: Get sensor data
app.get('/api/sensor-data', async (req, res) => {
  try {
    const timeInterval = req.query.interval || '1 day';
    const result = await pool.query(
      `SELECT * FROM sensor_data 
       WHERE timestamp >= NOW() - INTERVAL '${timeInterval}' 
       ORDER BY timestamp DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sensor data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Get latest sensor reading
app.get('/api/latest-reading', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1'
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error fetching latest reading:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Receive sensor data
app.post('/api/sensor-data', async (req, res) => {
  let { soil_moisture, nitrogen, phosphorus, potassium, soil_pH } = req.body;
  
  // If no data provided, insert dummy data
  if (!soil_moisture || !nitrogen || !phosphorus || !potassium || !soil_pH) {
    soil_moisture = Math.floor(Math.random() * 50) + 10;
    nitrogen = Math.floor(Math.random() * 100);
    phosphorus = Math.floor(Math.random() * 100);
    potassium = Math.floor(Math.random() * 100);
    soil_pH = (Math.random() * 3 + 5).toFixed(1);
  }

  try {
    await pool.query(
      'INSERT INTO sensor_data (soil_moisture, nitrogen, phosphorus, potassium, soil_pH) VALUES ($1, $2, $3, $4, $5)',
      [soil_moisture, nitrogen, phosphorus, potassium, soil_pH]
    );
    res.json({ success: true, message: 'Sensor data stored successfully' });
  } catch (err) {
    console.error('Error storing sensor data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Get predictions based on sensor data
app.post('/api/predict', async (req, res) => {
  try {
    const latestData = await pool.query(
      'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1'
    );
    
    if (latestData.rows.length === 0) {
      return res.status(404).json({ error: 'No sensor data available' });
    }
    
    const { soil_moisture, nitrogen, phosphorus, potassium, soil_pH } = latestData.rows[0];

    // Note: You might need to adjust your ML API parameters based on the simplified schema
    const response = await axios.post('https://manny1313-my-ml-api.hf.space/predict', {
      soil_moisture,
      N: nitrogen,
      P: phosphorus,
      K: potassium,
      soil_pH,
      // You might need to provide defaults for these or modify your ML API
      land_size: 10,
      last_crop: 'Unknown',
      crop: 'Unknown',
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error getting prediction:', err);
    res.status(500).json({ error: 'Prediction service error' });
  }
});

// API: Clear all sensor data
app.delete('/api/sensor-data', async (req, res) => {
  try {
    await pool.query('DELETE FROM sensor_data');
    res.json({ success: true, message: 'All sensor data cleared' });
  } catch (err) {
    console.error('Error clearing sensor data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});