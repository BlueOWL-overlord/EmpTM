from flask import Flask, render_template, jsonify, send_file
import os

app = Flask(__name__)

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

@app.route('/analyze', methods=['POST'])
def analyze():
    # Placeholder for analysis logic
    return jsonify({'report': 'report.pdf', 'csv': 'report.csv'})

@app.route('/auto_aws')
def auto_aws():
    # Placeholder for auto AWS logic
    return jsonify({'report': 'aws_report.pdf', 'csv': 'aws_report.csv'})

@app.route('/download/<file_type>')
def download(file_type):
    # Placeholder for file download logic
    return send_file(f'static/{file_type}', as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, port=5000)