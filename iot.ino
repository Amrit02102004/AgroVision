#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "One";
const char* password = "12345677";
const char* serverUrl = "https://agro-vision-seven.vercel.app/api/sensor-data";

WiFiClient client;
HTTPClient http;

// Soil Moisture Sensor Pins
const int soilMoisturePin1 = 34;  
const int soilMoisturePin2 = 35;  
const int soilMoisturePin3 = 32;

// Motor Driver Pins
const int Motor1NPIN = 33;
const int Motor1PPIN = 25;
const int Motor2NPIN = 26;
const int Motor2PPIN = 27;

void setup() {
    Serial.begin(9600);
    WiFi.begin(ssid, password);
    
    Serial.print("Connecting to WiFi...");
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print("EE");
    }
    Serial.println("\nConnected to WiFi!");

    // Set motor pins as output
    pinMode(Motor1NPIN, OUTPUT);
    pinMode(Motor1PPIN, OUTPUT);
    pinMode(Motor2NPIN, OUTPUT);
    pinMode(Motor2PPIN, OUTPUT);
}

void loop() {
    if (WiFi.status() == WL_CONNECTED) {
        http.begin(serverUrl);
        http.addHeader("Content-Type", "application/json");

        // Read soil moisture from sensor
        int soilMoisture1 = analogRead(soilMoisturePin1);
        soilMoisture1 = map(soilMoisture1, 0, 4095, 100, 0);
        int soilMoisture2 = analogRead(soilMoisturePin2);
        soilMoisture2 = map(soilMoisture2, 0, 4095, 100, 0);
        int soilMoisture3 = analogRead(soilMoisturePin3);
        soilMoisture3 = map(soilMoisture3, 0, 4095, 100, 0);

        Serial.println("Soil Moisture Readings:");
        Serial.println(soilMoisture1);
        Serial.println(soilMoisture2);
        Serial.println(soilMoisture3);

        // Motor control logic
        if (soilMoisture1 < 30) {
            Serial.println("Motor 1 ON");
            digitalWrite(Motor1NPIN, LOW);
            digitalWrite(Motor1PPIN, HIGH);
        } else {
            digitalWrite(Motor1NPIN, LOW);
            digitalWrite(Motor1PPIN, LOW);
        }

        if (soilMoisture2 < 30) {
            Serial.println("Motor 2 ON");
            digitalWrite(Motor2NPIN, LOW);
            digitalWrite(Motor2PPIN, HIGH);
        } else {
            digitalWrite(Motor2NPIN, LOW);
            digitalWrite(Motor2PPIN, LOW);
        }

        // Generate random nutrient values
        int nitrogen = random(35, 56);
        int phosphorus = random(35, 56);
        int potassium = random(35, 56);
        float soilPh = random(350, 551) / 100.0;

        // Create JSON payload
        String jsonPayload = "{";
        jsonPayload += "\"soil_moisture1\": " + String(soilMoisture1) + ", ";
        jsonPayload += "\"soil_moisture2\": " + String(soilMoisture2) + ", ";
        jsonPayload += "\"soil_moisture3\": " + String(soilMoisture3) + ", ";
        jsonPayload += "\"nitrogen\": " + String(nitrogen) + ", ";
        jsonPayload += "\"phosphorus\": " + String(phosphorus) + ", ";
        jsonPayload += "\"potassium\": " + String(potassium) + ", ";
        jsonPayload += "\"soil_pH\": " + String(soilPh) + "}";

        // Send data to server
        int httpResponseCode = http.POST(jsonPayload);
        Serial.println("Response code: " + String(httpResponseCode));

        if (httpResponseCode > 0) {
            Serial.println("Response: " + http.getString());
        } else {
            Serial.println("Error in sending request");
        }

        http.end();
    } else {
        Serial.println("WiFi not connected!");
    }

    delay(5000);  // Increased delay to prevent rapid requests
}
