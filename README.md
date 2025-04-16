# EmpTM: Threat Modeling Tool

EmpTM is a web-based threat modeling tool that allows users to create Data Flow Diagrams (DFDs) and analyze potential security threats using real-time threat feeds. It supports AWS and Azure components, includes a stencil for dragging elements onto a canvas, and provides features like port connectors, flow direction arrows, and element deletion.

## Features
- **Interactive DFD Creation**: Drag and drop elements from a stencil to create DFDs.
- **Real-Time Threat Feeds**: Configure feeds (e.g., AlienVault OTX, VirusTotal, MITRE ATT&CK) to fetch threat intelligence.
- **Ports and Flow Direction**: Elements have input ("In") and output ("Out") ports with labels, and links show directional arrows.
- **Delete Functionality**: Select an element on the canvas and press the Delete key to remove it.
- **Icons for Elements**: Each element in the stencil has an associated icon for better visual recognition.
- **Guided Setup**: A wizard to help new users create a basic DFD.
- **Threat Analysis**: Generate PDF and CSV reports with identified threats and recommendations.

## Prerequisites
Before installing EmpTM, ensure you have the following installed:
- **Python 3.6+**: Required to run the Flask application.
- **pip**: Python package manager to install dependencies.
- **wkhtmltopdf**: Used to generate PDF reports. Installation varies by operating system.
- **Internet Connection**: Required to load JointJS and icons via CDN (optional if hosting locally).

## Installation

### 1. Clone the Repository
Clone the EmpTM repository from GitHub to your local machine:
```bash
git clone https://github.com/<your-username>/EmpTM.git
cd EmpTM
```
### 2. Set Up a Virtual Environment (Recommended)
Create and activate a Python virtual environment to manage dependencies:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```
### 3 installation Steps

#### 3.1 Install Python Dependencies
Install the required Python packages using pip:
```bash
pip install flask matplotlib networkx boto3 requests
```
#### 3.2 Install wkhtmltopdf
wkhtmltopdf is required to generate PDF reports. Installation depends on your operating system:
```bash
sudo apt update
# Install dependencies for wkhtmltopdf
sudo apt install -y libxrender1 libfontconfig1 libx11-dev libjpeg62-turbo libxext6 xfonts-75dpi xfonts-base
# Add Debian Bullseye repository for libssl1.1 (needed for Kali)
echo "deb http://deb.debian.org/debian bullseye main" | sudo tee -a /etc/apt/sources.list
sudo apt update
sudo apt install -y libssl1.1
# Download and install wkhtmltopdf
wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2.bullseye_amd64.deb
sudo dpkg -i wkhtmltox_0.12.6.1-2.bullseye_amd64.deb
sudo apt install -f
# Remove the Bullseye repository to avoid conflicts
sudo sed -i '/deb http:\/\/deb.debian.org\/debian bullseye main/d' /etc/apt/sources.list
sudo apt update
# Verify installation
wkhtmltopdf --version
```
#### Through setup.sh
Simply run the setup.sh to install all dependencies specified in 3.1 and 3.2 .
```bash
./setup.sh
```
### 4. (Optional) Host Icons Locally
The project uses Icons8 URLs for element icons by default. If you encounter 404 errors or prefer to host icons locally:

#### 4.1 Create a directory for icons:
```bash
mkdir -p static/icons
```
#### 4.2 Download icons (example for a few elements):
```bash
wget -O static/icons/amazon-ec2.png https://img.icons8.com/fluency/48/amazon-ec2.png
wget -O static/icons/amazon-s3.png https://img.icons8.com/fluency/48/amazon-s3.png
```
#### 4.3 Update the iconMap in static/script.js to use local paths:
```bash
const iconMap = {
    "AWSEC2": "/static/icons/amazon-ec2.png",
    "AWSS3": "/static/icons/amazon-s3.png",
    // Update other entries accordingly
};
```
Note: Add more icons as needed
### 5. Configure AWS Credentials (Optional)
If using the "Auto-Generate from AWS" feature:
```bash
aws configure
```
### 6. Configure Threat Feed API Keys
To use real-time threat feeds, obtain API keys:

AlienVault OTX: Sign up at otx.alienvault.com.
VirusTotal: Sign up at virustotal.com. Enter the keys in the "Threat Feed Configuration" section of the UI.
### 7.Running the Application
#### 7.1 Start the Flask server:
```bash
python3 emptm.py
```
#### 7.2 Open your browser and navigate to:
```bash
http://localhost:5000
```
