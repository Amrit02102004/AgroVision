# AgroVision IoT API

This is the backend API for AgroVision, an IoT-based smart farming system. It allows storing, retrieving, and analyzing soil sensor data using PostgreSQL and an external ML model.

## **Setup & Installation**

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/agrovision.git
   cd agrovision
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up the environment variables in a `.env` file:
   ```env
   PORT=3000
   DATABASE_URL=your_postgresql_connection_string
   ```

4. Start the server:
   ```sh
   node index.js
   ```

---

# **API Documentation**

## **1. Serve Dashboard**
### `GET /`
**Description:** Serves the main dashboard HTML page.

**Response:**
- `200 OK` - Returns `dashboard.html`.

---

## **2. Retrieve Sensor Data**
### `GET /api/sensor-data`
**Description:** Fetches sensor data within a given time interval.

**Query Parameters:**
| Parameter  | Type    | Description                                  | Default |
|------------|--------|----------------------------------------------|---------|
| interval   | string | Time range for data retrieval (e.g., '1 day', '1 hour') | '1 day' |

**Example Request:**
```sh
GET /api/sensor-data?interval=1 hour
```

**Response:**
```json
[
  {
    "id": 1,
    "soil_moisture": 45,
    "nitrogen": 78,
    "phosphorus": 56,
    "potassium": 89,
    "soil_pH": 6.5,
    "timestamp": "2025-03-31T12:00:00Z"
  }
]
```

---

## **3. Get Latest Sensor Reading**
### `GET /api/latest-reading`
**Description:** Retrieves the most recent sensor reading.

**Response:**
```json
{
  "id": 1,
  "soil_moisture": 45,
  "nitrogen": 78,
  "phosphorus": 56,
  "potassium": 89,
  "soil_pH": 6.5,
  "timestamp": "2025-03-31T12:00:00Z"
}
```

---

## **4. Send Sensor Data**
### `POST /api/sensor-data`
**Description:** Stores sensor data in the database.

**Request Body:**
```json
{
  "soil_moisture": 45,
  "nitrogen": 78,
  "phosphorus": 56,
  "potassium": 89,
  "soil_pH": 6.5
}
```

> If any field is missing, the server will generate random values.

**Response:**
```json
{
  "success": true,
  "message": "Sensor data stored successfully"
}
```

---

## **5. Predict Crop Using ML Model**
### `POST /api/predict`
**Description:** Calls an external ML API for crop prediction based on sensor data.

**Request Body:** (If empty, fetches latest database values)
```json
{
  "soil_moisture": 45,
  "N": 78,
  "P": 56,
  "K": 89,
  "soil_pH": 6.5,
  "land_size": 10,
  "last_crop": "Wheat",
  "crop": "Rice"
}
```

**Response:** (Example response from ML model)
```json
{
  "recommended_crop": "Maize",
  "confidence": 92.5
}
```

**Errors:**
- `400 Bad Request` if required fields are missing.
- `500 Internal Server Error` if ML API fails.

---

## **6. Clear All Sensor Data**
### `DELETE /api/sensor-data`
**Description:** Deletes all sensor data from the database.

**Response:**
```json
{
  "success": true,
  "message": "All sensor data cleared"
}
```

---

## **7. Database Initialization**
The API automatically initializes the database with the following schema:
```sql
CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  soil_moisture INT,
  nitrogen INT,
  phosphorus INT,
  potassium INT,
  soil_pH FLOAT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## **8. Running with cURL (Examples)**
### **Send Sensor Data:**
```sh
curl -X POST http://localhost:3000/api/sensor-data \
     -H "Content-Type: application/json" \
     -d '{"soil_moisture": 40, "nitrogen": 80, "phosphorus": 60, "potassium": 90, "soil_pH": 6.8}'
```

### **Get Latest Reading:**
```sh
curl -X GET http://localhost:3000/api/latest-reading
```

### **Clear Sensor Data:**
```sh
curl -X DELETE http://localhost:3000/api/sensor-data
```

---

## **9. License**
This project is open-source and available under the MIT License.

---

