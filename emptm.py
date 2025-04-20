from flask import Flask, render_template, jsonify, send_file, request
import os
import json
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
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
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
    return response

@app.route('/threat-feed')
def threat_feed():
    response = app.make_response(render_template('threat-feed.html'))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
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

    # Threats Section with Severity Calculation and Summary Table
    c.drawString(100, y_position, "Threats Summary:")
    y_position -= 20

    # Placeholder for threat feed integration
    threats = []

    # Basic threat analysis based on model properties with severity calculation
    for flow in flows:
        if not flow['isEncrypted']:
            base_severity = 3  # Low
            severity = base_severity
            severity += 2  # Unencrypted flow
            if flow['protocol'].upper() != "HTTPS":
                severity += 1  # Insecure protocol
            severity_label = "Low" if severity <= 4 else ("Medium" if severity <= 6 else "High")
            threats.append({
                "component": f"{flow['from']} -> {flow['to']}",
                "reason": f"Unencrypted flow using {flow['protocol']}",
                "threat": "Risk of data interception (MITRE ATT&CK: T1040 Network Sniffing)",
                "severity": severity_label
            })

    for element in elements:
        if element.get('isPublic', False):
            base_severity = 3  # Low
            severity = base_severity
            severity += 2  # Public exposure
            if not element['isEncrypted']:
                severity += 2  # Unencrypted element
            severity_label = "Low" if severity <= 4 else ("Medium" if severity <= 6 else "High")
            threats.append({
                "component": element['label'],
                "reason": "Publicly exposed element",
                "threat": "Potential unauthorized access (MITRE ATT&CK: T1190 Exploit Public-Facing Application)",
                "severity": severity_label
            })
        if not element['isEncrypted']:
            base_severity = 3  # Low
            severity = base_severity
            severity += 2  # Unencrypted element
            severity_label = "Low" if severity <= 4 else ("Medium" if severity <= 6 else "High")
            threats.append({
                "component": element['label'],
                "reason": "Unencrypted element",
                "threat": "Risk of data exposure (MITRE ATT&CK: T1530 Data from Cloud Storage)",
                "severity": severity_label
            })

    # Create a summary table
    if threats:
        table_data = [["Component", "Reason", "Threat", "Severity"]]
        for threat in threats:
            table_data.append([
                threat["component"],
                threat["reason"],
                threat["threat"],
                threat["severity"]
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        # Calculate table width and position
        table_width = 400
        table.wrapOn(c, table_width, 400)
        table.drawOn(c, 100, y_position - len(threats) * 30)

        y_position -= (len(threats) + 2) * 30
    else:
        c.drawString(120, y_position, "No threats identified.")
        y_position -= 20

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