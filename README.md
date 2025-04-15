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
