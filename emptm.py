from flask import Flask, render_template, jsonify, send_file, request
import os
import json
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime

app = Flask(__name__)

# Path to store threat feed configuration
CONFIG_FILE = 'threat-feed-config.json'

@app.route('/')
def index():
    response = app.make_response(render_template('index.html'))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@app.route('/threat-feed')
def threat_feed():
    response = app.make_response(render_template('threat-feed.html'))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@app.route('/save-threat-feed-config', methods=['POST'])
def save_threat_feed_config():
    config = request.get_json()
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
        return jsonify({"status": "success", "message": "Configuration saved"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/load-threat-feed-config')
def load_threat_feed_config():
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
            return jsonify(config)
        else:
            return jsonify({})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    # Get the data from the request
    data = request.get_json()
    elements = data.get('elements', [])
    flows = data.get('flows', [])
    feed_config = data.get('feedConfig', {})

    # Generate a unique filename using timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    pdf_filename = f'report_{timestamp}.pdf'
    pdf_path = os.path.join('static', pdf_filename)

    # Generate PDF report
    c = canvas.Canvas(pdf_path, pagesize=letter)
    c.setFont("Helvetica", 12)

    # Title
    c.drawString(100, 750, "EmpTM Analysis Report")
    c.drawString(100, 730, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    c.drawString(100, 710, f"Feed Source: {feed_config.get('source', 'N/A')}")

    # Elements Section
    c.drawString(100, 680, "Elements:")
    y_position = 660
    for element in elements:
        line = f"{element['label']} (Type: {element['type']}, Encrypted: {element['isEncrypted']})"
        c.drawString(120, y_position, line)
        y_position -= 20
        if y_position < 100:
            c.showPage()
            c.setFont("Helvetica", 12)
            y_position = 750

    # Flows Section
    c.drawString(100, y_position, "Flows:")
    y_position -= 20
    for flow in flows:
        line = f"{flow['from']} -> {flow['to']} (Protocol: {flow['protocol']}, Encrypted: {flow['isEncrypted']})"
        c.drawString(120, y_position, line)
        y_position -= 20
        if y_position < 100:
            c.showPage()
            c.setFont("Helvetica", 12)
            y_position = 750

    c.save()

    # Return the filenames in the response
    return jsonify({'report': pdf_filename, 'csv': ''})  # CSV not implemented for now

@app.route('/download/<file_type>')
def download(file_type):
    # Serve the file
    file_path = os.path.join('static', file_type)
    if not os.path.exists(file_path):
        return "File not found", 404

    response = send_file(file_path, as_attachment=True)
    
    # Clean up the file after serving
    try:
        os.remove(file_path)
        print(f"Deleted file: {file_path}")
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")

    return response

if __name__ == '__main__':
    app.run(debug=True, port=5000)