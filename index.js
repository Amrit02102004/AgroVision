import dotenv from 'dotenv';
import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();
const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id SERIAL PRIMARY KEY,
        area_name VARCHAR(50),
        soil_moisture INT,
        humidity FLOAT,
        temperature FLOAT,
        nitrogen INT,
        phosphorus INT,
        potassium INT,
        soil_pH FLOAT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS field_settings (
        id SERIAL PRIMARY KEY,
        field_name VARCHAR(50) UNIQUE,
        crop_name VARCHAR(50),
        optimal_moisture INT,
        optimal_humidity FLOAT,
        optimal_temperature FLOAT,
        mode VARCHAR(10) DEFAULT 'auto',
        motor_status BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initDB();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/sensor-data', async (req, res) => {
  try {
    const timeInterval = req.query.interval || '1 day';
    const areaName = req.query.area;
    
    let query = `SELECT * FROM sensor_data WHERE timestamp >= NOW() - INTERVAL '${timeInterval}'`;
    
    if (areaName) {
      query += ` AND area_name = '${areaName}'`;
    }
    
    query += ` ORDER BY timestamp DESC`;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sensor data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/latest-reading', async (req, res) => {
  try {
    const areaName = req.query.area;
    let query = 'SELECT * FROM sensor_data';
    
    if (areaName) {
      query += ` WHERE area_name = '${areaName}'`;
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 1';
    
    const result = await pool.query(query);
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error fetching latest reading:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/sensor-data', async (req, res) => {
  let { area_name, soil_moisture, humidity, temperature, nitrogen, phosphorus, potassium, soil_pH } = req.body;
  
  area_name = area_name || 'field1';
  
  if (!soil_moisture || !humidity || !temperature || !nitrogen || !phosphorus || !potassium || !soil_pH) {
    soil_moisture = Math.floor(Math.random() * 50) + 10;
    humidity = (Math.random() * 60 + 30).toFixed(1);
    temperature = (Math.random() * 30 + 10).toFixed(1);
    nitrogen = Math.floor(Math.random() * 100);
    phosphorus = Math.floor(Math.random() * 100);
    potassium = Math.floor(Math.random() * 100);
    soil_pH = (Math.random() * 3 + 5).toFixed(1);
  }

  try {
    await pool.query(
      'INSERT INTO sensor_data (area_name, soil_moisture, humidity, temperature, nitrogen, phosphorus, potassium, soil_pH) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [area_name, soil_moisture, humidity, temperature, nitrogen, phosphorus, potassium, soil_pH]
    );
    res.json({ success: true, message: 'Sensor data stored successfully' });
  } catch (err) {
    console.error('Error storing sensor data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/predict', async (req, res) => {
  try {
    let data;
    
    if (Object.keys(req.body).length > 0) {
      data = req.body;
    } else {
      const latestData = await pool.query(
        'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1'
      );
      
      if (latestData.rows.length === 0) {
        return res.status(404).json({ error: 'No sensor data available' });
      }
      
      data = {
        soil_moisture: latestData.rows[0].soil_moisture,
        N: latestData.rows[0].nitrogen,
        P: latestData.rows[0].phosphorus,
        K: latestData.rows[0].potassium,
        soil_pH: latestData.rows[0].soil_pH,
        land_size: 10,
        last_crop: 'Unknown',
        crop: 'Unknown'
      };
    }
    
    const requiredFields = ['soil_moisture', 'N', 'P', 'K', 'soil_pH', 'land_size', 'last_crop', 'crop'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing: missingFields
      });
    }
    
    console.log("ML API Request:", data);
    
    const response = await axios.post('https://manny1313-my-ml-api.hf.space/predict', data);
    
    res.json(response.data);
  } catch (err) {
    console.error('Error getting prediction:', err);
    if (err.response) {
      console.error('Response data:', err.response.data);
      console.error('Response status:', err.response.status);
    }
    res.status(500).json({ error: 'Prediction service error', details: err.message });
  }
});

app.delete('/api/sensor-data', async (req, res) => {
  try {
    await pool.query('DELETE FROM sensor_data');
    res.json({ success: true, message: 'All sensor data cleared' });
  } catch (err) {
    console.error('Error clearing sensor data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get current motor status from ESP32
app.get('/api/get-motor-status', async (req, res) => {
  try {
    const fieldName = req.query.field || 'field1';
    
    // Check if field exists in settings
    const fieldCheck = await pool.query(
      'SELECT * FROM field_settings WHERE field_name = $1',
      [fieldName]
    );
    
    if (fieldCheck.rows.length === 0) {
      // Create default settings if field doesn't exist
      await pool.query(
        'INSERT INTO field_settings (field_name, crop_name, optimal_moisture, optimal_humidity, optimal_temperature, mode, motor_status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [fieldName, 'Unknown', 30, 60.0, 25.0, 'auto', false]
      );
    }
    
    // Get latest sensor data for the field
    const latestData = await pool.query(
      'SELECT * FROM sensor_data WHERE area_name = $1 ORDER BY timestamp DESC LIMIT 1',
      [fieldName]
    );
    
    // Get field settings
    const fieldSettings = await pool.query(
      'SELECT * FROM field_settings WHERE field_name = $1',
      [fieldName]
    );
    
    const settings = fieldSettings.rows[0];
    const sensorData = latestData.rows[0] || { soil_moisture: 0, humidity: 0, temperature: 0 };
    
    // Determine motor status based on mode
    let motorStatus = settings.motor_status;
    if (settings.mode === 'auto' && sensorData.soil_moisture < settings.optimal_moisture) {
      motorStatus = true;
      
      // Update motor status in database
      await pool.query(
        'UPDATE field_settings SET motor_status = $1 WHERE field_name = $2',
        [motorStatus, fieldName]
      );
    }
    
    res.json({
      field: fieldName,
      current_moisture: sensorData.soil_moisture,
      current_humidity: sensorData.humidity,
      current_temperature: sensorData.temperature,
      optimal_moisture: settings.optimal_moisture,
      optimal_humidity: settings.optimal_humidity,
      optimal_temperature: settings.optimal_temperature,
      mode: settings.mode,
      motor_status: motorStatus
    });
  } catch (err) {
    console.error('Error getting motor status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check field settings
app.get('/api/motor-status', async (req, res) => {
  try {
    const fieldName = req.query.field || 'field1';
    
    const result = await pool.query(
      'SELECT field_name, crop_name, optimal_moisture, optimal_humidity, optimal_temperature, mode FROM field_settings WHERE field_name = $1',
      [fieldName]
    );
    
    if (result.rows.length === 0) {
      return res.json({ 
        field: fieldName,
        configured: false,
        message: 'Field not configured' 
      });
    }
    
    res.json({
      field: result.rows[0].field_name,
      crop: result.rows[0].crop_name,
      optimal_moisture: result.rows[0].optimal_moisture,
      optimal_humidity: result.rows[0].optimal_humidity,
      optimal_temperature: result.rows[0].optimal_temperature,
      mode: result.rows[0].mode,
      configured: result.rows[0].crop_name !== 'Unknown'
    });
  } catch (err) {
    console.error('Error checking field settings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Manual motor control
app.post('/api/manual-motor', async (req, res) => {
  try {
    const { field, status } = req.body;
    
    if (!field) {
      return res.status(400).json({ error: 'Field name is required' });
    }
    
    if (status === undefined) {
      return res.status(400).json({ error: 'Motor status is required' });
    }
    
    // Update field settings
    await pool.query(
      'UPDATE field_settings SET motor_status = $1, mode = $2 WHERE field_name = $3',
      [status, 'manual', field]
    );
    
    res.json({ 
      success: true, 
      field: field, 
      motor_status: status, 
      mode: 'manual' 
    });
  } catch (err) {
    console.error('Error controlling motor:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add crop settings route
app.post('/api/field-settings', async (req, res) => {
  try {
    const { field, crop, optimal_moisture, optimal_humidity, optimal_temperature, mode } = req.body;
    
    if (!field || !crop || !optimal_moisture || !optimal_humidity || !optimal_temperature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if field exists
    const fieldCheck = await pool.query(
      'SELECT * FROM field_settings WHERE field_name = $1',
      [field]
    );
    
    if (fieldCheck.rows.length === 0) {
      // Create new field settings
      await pool.query(
        'INSERT INTO field_settings (field_name, crop_name, optimal_moisture, optimal_humidity, optimal_temperature, mode) VALUES ($1, $2, $3, $4, $5, $6)',
        [field, crop, optimal_moisture, optimal_humidity, optimal_temperature, mode || 'auto']
      );
    } else {
      // Update existing field settings
      await pool.query(
        'UPDATE field_settings SET crop_name = $1, optimal_moisture = $2, optimal_humidity = $3, optimal_temperature = $4, mode = $5 WHERE field_name = $6',
        [crop, optimal_moisture, optimal_humidity, optimal_temperature, mode || 'auto', field]
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Field settings updated',
      field: field,
      crop: crop,
      optimal_moisture: optimal_moisture,
      optimal_humidity: optimal_humidity,
      optimal_temperature: optimal_temperature,
      mode: mode || 'auto'
    });
  } catch (err) {
    console.error('Error updating field settings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// New API endpoint to get environmental conditions
app.get('/api/environmental-data', async (req, res) => {
  try {
    const fieldName = req.query.field || 'field1';
    const timeInterval = req.query.interval || '1 day';
    
    const query = `
      SELECT 
        soil_moisture, 
        humidity, 
        temperature, 
        timestamp 
      FROM 
        sensor_data 
      WHERE 
        area_name = $1 AND 
        timestamp >= NOW() - INTERVAL '${timeInterval}'
      ORDER BY 
        timestamp DESC
    `;
    
    const result = await pool.query(query, [fieldName]);
    
    res.json({
      field: fieldName,
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching environmental data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});