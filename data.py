import requests
import random
import time

URL = "http://localhost:3000/guitar"

for _ in range(30):
    data = {
        "soil_moisture": random.randint(10, 50),
        "N": random.randint(40, 60),
        "P": random.randint(20, 40),
        "K": random.randint(30, 50),
        "soil_pH": round(random.uniform(5.5, 7.5), 1),
        "land_size": 10,
        "last_crop": "Onion",
        "crop": random.choice(["Sesamum", "Wheat", "Rice", "Maize", "Barley"])
    }
    
    response = requests.post(URL, json=data)
    print(f"Sent data: {data}, Response: {response.status_code}, {response.text}")
    time.sleep(1)  # Delay to simulate real-time data entry
