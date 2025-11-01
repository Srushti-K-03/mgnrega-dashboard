from flask import Flask, render_template, jsonify
import requests

app = Flask(__name__)

API_URL = "https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722"
API_KEY = "579b464db66ec23bdd0000017db5bab055a343b15df2c38b479e0215"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/districts/<state>')
def get_districts(state):
    params = {
        "api-key": API_KEY,
        "format": "json",
        "limit": 1000,
        "filters[state_name]": state.upper()
    }
    response = requests.get(API_URL, params=params)
    data = response.json()
    if "records" not in data:
        return jsonify({"error": "No records found"}), 500
    return jsonify(data["records"])

# ✅ New route for frontend JS
@app.route('/get_data', methods=['GET', 'POST'])
def get_data():
    # Always fetch Karnataka data
    state = "KARNATAKA"
    params = {
        "api-key": API_KEY,
        "format": "json",
        "limit": 1000,
        "filters[state_name]": state
    }
    response = requests.get(API_URL, params=params)
    data = response.json()
    if "records" not in data:
        return jsonify({"error": "No records found"}), 500
    return jsonify({"records": data["records"], "source": "MGNREGA API"})

if __name__ == '__main__':
    app.run(debug=True)
