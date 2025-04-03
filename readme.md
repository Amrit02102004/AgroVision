# Smart Irrigation System API Documentation

This document provides details for all available API endpoints in the smart irrigation system.

## Table of Contents
- [Sensor Data](#sensor-data)
- [Field Settings](#field-settings)
- [Motor Control](#motor-control)
- [ML Prediction](#ml-prediction)

## Sensor Data

### Get Sensor Data
Retrieves sensor data based on time interval and area name.

**Endpoint:** `GET /api/sensor-data`

**Query Parameters:**
- `interval` (optional): Time interval for data retrieval (default: '1 day')
- `area` (optional): Field area name to filter results

**Response:**
```json
[
  {
    "id": 1,
    "area_name": "field1",
    "soil_moisture": 35,
    "nitrogen": 45,
    "phosphorus": 67,
    "potassium": 23,
    "soil_pH": 6.2,
    "timestamp": "2025-04-03T12:34:56.789Z"
  },
  // Additional records...
]
```

### Get Latest Reading
Retrieves the most recent sensor reading for a specific area.

**Endpoint:** `GET /api/latest-reading`

**Query Parameters:**
- `area` (optional): Field area name

**Response:**
```json
{
  "id": 42,
  "area_name": "field1",
  "soil_moisture": 28,
  "nitrogen": 52,
  "phosphorus": 35,
  "potassium": 48,
  "soil_pH": 6.8,
  "timestamp": "2025-04-03T14:25:12.345Z"
}
```

### Add Sensor Data
Adds new sensor data to the database.

**Endpoint:** `POST /api/sensor-data`

**Request Body:**
```json
{
  "area_name": "field1",       // Optional, defaults to "field1"
  "soil_moisture": 45,         // Optional, random if not provided
  "nitrogen": 67,              // Optional, random if not provided
  "phosphorus": 38,            // Optional, random if not provided
  "potassium": 79,             // Optional, random if not provided
  "soil_pH": 5.6               // Optional, random if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor data stored successfully"
}
```

### Delete All Sensor Data
Removes all sensor data from the database.

**Endpoint:** `DELETE /api/sensor-data`

**Response:**
```json
{
  "success": true,
  "message": "All sensor data cleared"
}
```

## Field Settings

### Get Motor Status
Retrieves the motor status for a specific field.

**Endpoint:** `GET /api/get-motor-status`

**Query Parameters:**
- `field` (optional): Field name (default: 'field1')

**Response:**
```json
{
  "field": "field1",
  "current_moisture": 28,
  "optimal_moisture": 35,
  "mode": "auto",
  "motor_status": true
}
```

### Check Field Settings
Retrieves configuration settings for a specific field.

**Endpoint:** `GET /api/motor-status`

**Query Parameters:**
- `field` (optional): Field name (default: 'field1')

**Response:**
```json
{
  "field": "field1",
  "crop": "Tomatoes",
  "optimal_moisture": 35,
  "mode": "auto",
  "configured": true
}
```

### Update Field Settings
Updates the settings for a specific field.

**Endpoint:** `POST /api/field-settings`

**Request Body:**
```json
{
  "field": "field1",           // Required
  "crop": "Corn",              // Required
  "optimal_moisture": 40,      // Required
  "mode": "auto"               // Optional, defaults to "auto"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Field settings updated",
  "field": "field1",
  "crop": "Corn",
  "optimal_moisture": 40,
  "mode": "auto"
}
```

## Motor Control

### Manual Motor Control
Manually controls the irrigation motor for a specific field.

**Endpoint:** `POST /api/manual-motor`

**Request Body:**
```json
{
  "field": "field1",    // Required
  "status": true        // Required (true to turn on, false to turn off)
}
```

**Response:**
```json
{
  "success": true,
  "field": "field1",
  "motor_status": true,
  "mode": "manual"
}
```

## ML Prediction

### Get Crop Recommendation
Gets predictions based on soil parameters using a machine learning model.

**Endpoint:** `POST /api/predict`

**Request Body:**
```json
{
  "soil_moisture": 35,    // Required
  "N": 45,                // Required (Nitrogen)
  "P": 67,                // Required (Phosphorus)
  "K": 23,                // Required (Potassium)
  "soil_pH": 6.2,         // Required
  "land_size": 10,        // Required (in acres)
  "last_crop": "Wheat",   // Required
  "crop": "Rice"          // Required
}
```

**Note:** If the request body is empty, the system will use the latest sensor data available.

**Response:**
The response structure depends on the ML model's output, but generally includes:
```json
{
  "recommended_crop": "Rice",
  "expected_yield": "85%",
  "fertilizer_recommendation": "Medium nitrogen, low phosphorus",
  "water_requirements": "High"
}
```