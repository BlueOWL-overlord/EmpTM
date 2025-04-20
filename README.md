# EmpTM: Threat Modeling Tool

EmpTM is a web-based Data Flow Diagram (DFD) and threat modeling tool designed to help users create, analyze, and secure system architectures. It allows users to visually construct DFDs, analyze potential threats, and generate detailed reports. The latest version includes an AI-supported analysis feature that leverages OpenAI or Grok to provide a threat model overview and enhanced findings.

## Features
- **Draw DFDs**: Drag and drop elements (e.g., AWS EC2, Web App) and boundaries (e.g., Trust Boundary) to create DFDs.
- **Connect Elements**: Use Ctrl + Click to draw directional arrows representing data flows between elements.
- **Threat Analysis**: Analyze the diagram for potential threats with severity levels, best practices, and mitigation strategies.
- **AI-Supported Analysis**: Optionally enable AI analysis using OpenAI or Grok to generate a threat model overview and enhance findings with additional insights.
- **Save/Load Projects**: Save your work as a JSON file and load it later to continue working.
- **Generate Reports**: Download a PDF report summarizing the DFD, threats, and best practices.
- **Customizable Elements**: Edit labels, sublabels, and properties (e.g., encryption, authentication) for elements, flows, and ports.

## Prerequisites
- Python 3.6+
- Flask
- ReportLab (for PDF generation)
- A modern web browser (e.g., Chrome, Firefox)

## Installation

### 1. Clone the Repository
Clone the EmpTM repository from GitHub to your local machine:
```bash
git clone https://github.com/BlueOWL-overlord/EmpTM.git
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
### 4. Configure Threat Feed API Keys
To use real-time threat feeds, obtain API keys:

AlienVault OTX: Sign up at otx.alienvault.com.
VirusTotal: Sign up at virustotal.com. Enter the keys in the "Threat Feed Configuration" section of the UI.
### 5.Running the Application
#### 6.1 Start the Flask server:
```bash
python3 emptm.py
```
#### 6.2 Open your browser and navigate to:
```bash
http://localhost:5000
```
## Usage

1. **Create a DFD**:
   - Drag elements (e.g., "AWS EC2", "Web App") from the elements panel to the main canvas.
   - Add boundaries (e.g., "Trust Boundary") to group elements.
   - Hold Ctrl and click on ports to connect elements with directional arrows (e.g., "Out" port of "Web App" to "In" port of "API").

2. **Customize Elements**:
   - Click on an element to edit its properties (e.g., encryption, authentication) in the properties panel.
   - Right-click an element to add additional ports.
   - Edit labels and sublabels for elements and boundaries.

3. **Analyze Threats**:
   - Click the "Analyze" button to identify potential threats.
   - Optionally, enable "AI-Supported Analysis" by checking the box and configuring your AI settings (see below).
   - View the threats table with components, reasons, threats, severity, and actions.
   - Add comments, change severity, or mark findings as "False Positive" or "Already Addressed".

4. **AI-Supported Analysis**:
   - In the properties panel, under "AI Settings":
     - Select your AI provider ("OpenAI" or "Grok").
     - Enter your API key (obtain from [platform.openai.com](https://platform.openai.com) for OpenAI or [x.ai/api](https://x.ai/api) for Grok).
     - Click "Save API Settings".
   - Check the "AI-Supported Analysis" box before clicking "Analyze".
   - The AI will generate a threat model overview and enhance each finding with additional insights (e.g., mitigation strategies).

5. **Save and Load Projects**:
   - Click "Save Project" to download a JSON file of your work.
   - Click "Load Project" to upload a previously saved JSON file and continue working.

6. **Download Reports**:
   - After analysis, click "Download Report" to get a PDF summarizing the DFD, threats, and best practices.

## AI-Supported Analysis

EmpTM now supports AI-enhanced threat modeling using OpenAI or Grok. This feature provides:
- **Threat Model Overview**: A summary of key risks and attack vectors based on your DFD.
- **Enhanced Findings**: Additional insights for each threat, including mitigation strategies.

### Setup AI-Supported Analysis
1. Obtain an API key:
   - For OpenAI, sign up at [platform.openai.com](https://platform.openai.com).
   - For Grok, visit [x.ai/api](https://x.ai/api).
2. Configure in EmpTM:
   - In the properties panel, under "AI Settings", select your provider and enter your API key.
   - Save the settings.
3. Enable during analysis:
   - Check the "AI-Supported Analysis" box before clicking "Analyze".

### Notes
- API keys are stored in `localStorage` and not transmitted to the server.
- Ensure you have sufficient API credits, as both OpenAI and Grok may incur costs based on usage.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss improvements.

## License

This project is licensed under the MIT License.
