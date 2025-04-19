#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Starting EmpTM setup..."

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed.${NC}"
    echo "Please install Python 3 (e.g., 'sudo apt install python3' on Ubuntu/Kali or 'brew install python3' on macOS)"
    exit 1
else
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}Python 3 found: $PYTHON_VERSION${NC}"
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check for pip
if ! command -v pip &> /dev/null; then
    echo -e "${RED}pip is not installed in the virtual environment.${NC}"
    echo "Installing pip..."
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    python get-pip.py
    rm get-pip.py
else
    PIP_VERSION=$(pip --version | cut -d' ' -f2)
    echo -e "${GREEN}pip found: $PIP_VERSION${NC}"
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip install flask matplotlib networkx boto3 requests reportlab
echo -e "${GREEN}Python dependencies installed.${NC}"

# Check for wkhtmltopdf
if ! command -v wkhtmltopdf &> /dev/null; then
    echo -e "${RED}wkhtmltopdf is not installed.${NC}"
    echo "Installing wkhtmltopdf based on OS version..."

    # Detect OS and version
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_CODENAME  # For Ubuntu/Kali (e.g., focal, kali-rolling)
        VERSION_ID=$VERSION_ID     # For CentOS/RHEL (e.g., 7, 8)
    else
        echo "Cannot determine OS version. Please install wkhtmltopdf manually from https://wkhtmltopdf.org/downloads.html"
        exit 1
    fi

    if [[ "$OS" == "Ubuntu" || "$OS" == "kali" ]]; then
        # Install dependencies (common for Ubuntu and Kali)
        sudo apt update
        sudo apt install -y libxrender1 libfontconfig1 libx11-dev libjpeg62-turbo libxext6 xfonts-75dpi xfonts-base

        if [[ "$OS" == "Ubuntu" ]]; then
            # Map Ubuntu codenames to wkhtmltopdf packages
            case "$VERSION" in
                "bionic") # 18.04
                    WKHTMLTOPDF_URL="https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6-1/wkhtmltox_0.12.6-1.bionic_amd64.deb"
                    ;;
                "focal") # 20.04
                    WKHTMLTOPDF_URL="https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6-1/wkhtmltox_0.12.6-1.focal_amd64.deb"
                    ;;
                "jammy") # 22.04
                    WKHTMLTOPDF_URL="https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2.jammy_amd64.deb"
                    ;;
                *)
                    echo "Unsupported Ubuntu version: $VERSION. Falling back to Focal (20.04) package."
                    WKHTMLTOPDF_URL="https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6-1/wkhtmltox_0.12.6-1.focal_amd64.deb"
                    ;;
            esac
        elif [[ "$OS" == "kali" ]]; then
            # Kali uses rolling releases; use Debian Bullseye package
            echo "Detected Kali Linux. Using Debian Bullseye package for compatibility."
            WKHTMLTOPDF_URL="https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2.bullseye_amd64.deb"
            # Add Debian Bullseye repo temporarily for libssl1.1
            echo "Adding Debian Bullseye repository to install libssl1.1..."
            echo "deb http://deb.debian.org/debian bullseye main" | sudo tee -a /etc/apt/sources.list
            sudo apt update
            sudo apt install -y libssl1.1
            # Remove Bullseye repo to avoid conflicts
            sudo sed -i '/deb http:\/\/deb.debian.org\/debian bullseye main/d' /etc/apt/sources.list
            sudo apt update
        fi

        # Download and install wkhtmltopdf
        echo "Downloading wkhtmltopdf for $OS $VERSION..."
        wget -O wkhtmltox.deb "$WKHTMLTOPDF_URL"
        sudo dpkg -i wkhtmltox.deb
        sudo apt install -f  # Fix any remaining dependencies
        rm wkhtmltox.deb

    elif [[ "$OS" == "centos" || "$OS" == "rhel" ]]; then
        if command -v yum &> /dev/null; then
            # Try installing via yum
            sudo yum install -y wkhtmltopdf
        else
            # Manual install for CentOS/RHEL if yum fails or isn't available
            echo "Yum not found or wkhtmltopdf unavailable. Downloading CentOS 7 package..."
            wget -O wkhtmltox.rpm "https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6-1/wkhtmltox-0.12.6-1.centos7.x86_64.rpm"
            sudo rpm -ivh wkhtmltox.rpm || sudo yum localinstall -y wkhtmltox.rpm
            rm wkhtmltox.rpm
        fi
    else
        echo "Unsupported Linux distribution: $OS. Please install wkhtmltopdf manually from https://wkhtmltopdf.org/downloads.html"
        exit 1
    fi

    # Verify installation
    if command -v wkhtmltopdf &> /dev/null; then
        WKHTMLTOPDF_VERSION=$(wkhtmltopdf --version | cut -d' ' -f2)
        echo -e "${GREEN}wkhtmltopdf installed: $WKHTMLTOPDF_VERSION${NC}"
    else
        echo -e "${RED}wkhtmltopdf installation failed. Please install manually from https://wkhtmltopdf.org/downloads.html${NC}"
        exit 1
    fi
else
    WKHTMLTOPDF_VERSION=$(wkhtmltopdf --version | cut -d' ' -f2)
    echo -e "${GREEN}wkhtmltopdf found: $WKHTMLTOPDF_VERSION${NC}"
fi

# Final instructions
echo -e "${GREEN}Setup completed successfully!${NC}"
echo "Next steps:"
echo "1. Activate the virtual environment:"
echo "   - Run 'source venv/bin/activate'"
echo "2. Place 'joint.min.js' in the 'static/' directory:"
echo "   - Download from https://jointjs.com/ or use a CDN (update index.html accordingly)."
echo "3. Configure AWS credentials for boto3:"
echo "   - Run 'aws configure' and provide your AWS Access Key, Secret Key, and region."
echo "4. Obtain API keys for threat feeds:"
echo "   - AlienVault OTX: Sign up at https://otx.alienvault.com/"
echo "   - VirusTotal: Sign up at https://www.virustotal.com/"
echo "   - Enter keys in the UI under 'Threat Feed Configuration'."
echo "5. Run the tool:"
echo "   - Execute 'python emptm.py' and open http://localhost:5000 in your browser."

exit 0