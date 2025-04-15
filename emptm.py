import json
import csv
import matplotlib.pyplot as plt
import networkx as nx
from flask import Flask, render_template, request, jsonify, send_file
import subprocess
import boto3
import requests

# Element Classes
class Element:
    def __init__(self, name):
        self.name = name
        self.isEncrypted = False
        self.implementsAuthenticationScheme = False
        self.sanitizesInput = False
        self.isPublic = False

class AWSEC2(Element): pass
class AWSS3(Element): pass
class AWSLambda(Element): pass
class AWSRDS(Element): pass
class AWSDynamoDB(Element): pass
class AWSEKS(Element): pass
class AWSECS(Element): pass
class AWSAPIGateway(Element): pass
class AWSSQS(Element): pass
class AWSSNS(Element): pass
class AWSEB(Element): pass
class AWSCloudFront(Element): pass
class AWSALB(Element): pass
class AWSNLB(Element): pass
class AWSWAF(Element): pass
class AWSVPC(Element): pass
class AzureVM(Element): pass
class AzureBlob(Element): pass
class AzureFunction(Element): pass
class AzureSQL(Element): pass
class AzureCosmosDB(Element): pass
class AzureAKS(Element): pass
class AzureContainer(Element): pass
class AzureAppService(Element): pass
class AzureQueue(Element): pass
class AzureEventHub(Element): pass
class AzureLoadBalancer(Element): pass
class AzureFirewall(Element): pass
class AzureVNet(Element): pass
class Firewall(Element): pass
class LoadBalancer(Element): pass
class WebApp(Element): pass
class API(Element): pass

class Dataflow:
    def __init__(self, source, target, label, protocol="HTTP"):
        self.source = source
        self.target = target
        self.label = label
        self.protocol = protocol
        self.isEncrypted = False

# Threat Modeling Engine
class EmpTM:
    def __init__(self, name, feed_config=None):
        self.name = name
        self.elements = []
        self.dataflows = []
        self.rules = self.load_rules()
        self.feed_config = feed_config or {"source": "otx", "apiKey": "your-otx-api-key-here"}
        self.threat_feed = self.load_threat_feed()

    def load_rules(self):
        with open("rules.json", "r") as f:
            return json.load(f)

    def load_threat_feed(self):
        source = self.feed_config["source"]
        api_key = self.feed_config.get("apiKey")
        custom_url = self.feed_config.get("customUrl")
        threats = []

        try:
            if source == "otx":
                url = "https://otx.alienvault.com/api/v1/pulses/subscribed"
                headers = {"X-OTX-API-KEY": api_key}
                response = requests.get(url, headers=headers)
                if response.status_code == 200:
                    pulses = response.json()["results"]
                    for pulse in pulses[:5]:
                        for indicator in pulse.get("indicators", []):
                            threats.append({
                                "target": self.map_indicator_to_target(indicator["type"]),
                                "condition": "True",
                                "description": f"OTX Threat: {pulse['name']} - {indicator['indicator']}",
                                "recommendation": pulse.get("description", "Mitigate based on indicator"),
                                "severity": "High",
                                "stride": "Unknown"
                            })
            elif source == "virustotal":
                url = "https://www.virustotal.com/api/v3/intelligence/search"
                headers = {"x-apikey": api_key}
                params = {"query": "type:malware"}
                response = requests.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()["data"]
                    for item in data[:5]:
                        threats.append({
                            "target": "AWSS3",
                            "condition": "True",
                            "description": f"VirusTotal Threat: {item['attributes']['last_analysis_stats']['malicious']} detections",
                            "recommendation": "Scan and remove malicious files",
                            "severity": "High",
                            "stride": "Tampering"
                        })
            elif source == "mitre":
                url = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()["objects"]
                    for obj in data[:5]:
                        if obj["type"] == "attack-pattern":
                            threats.append({
                                "target": "WebApp",
                                "condition": "True",
                                "description": f"MITRE ATT&CK: {obj['name']} ({obj['external_references'][0]['external_id']})",
                                "recommendation": obj.get("description", "Mitigate per ATT&CK guidance"),
                                "severity": "Medium",
                                "stride": "Unknown"
                            })
            elif source == "custom" and custom_url:
                response = requests.get(custom_url, headers={"Authorization": f"Bearer {api_key}"} if api_key else {})
                if response.status_code == 200:
                    data = response.json()
                    for item in data[:5]:
                        threats.append({
                            "target": "Dataflow",
                            "condition": "True",
                            "description": item.get("description", "Custom threat"),
                            "recommendation": item.get("recommendation", "Custom mitigation"),
                            "severity": item.get("severity", "High"),
                            "stride": "Unknown"
                        })
            else:
                print(f"Invalid feed source: {source}")
            return threats
        except Exception as e:
            print(f"Error fetching threat feed {source}: {e}")
            return []

    def map_indicator_to_target(self, indicator_type):
        mapping = {
            "IPv4": "AWSEC2",
            "URL": "WebApp",
            "domain": "API",
            "FileHash-SHA256": "AWSS3"
        }
        return mapping.get(indicator_type, "Dataflow")

    def add_element(self, element):
        self.elements.append(element)

    def add_dataflow(self, dataflow):
        self.dataflows.append(dataflow)

    def analyze(self):
        findings = []
        for rule in self.rules + self.threat_feed:
            for element in self.elements + self.dataflows:
                if rule["target"] == element.__class__.__name__:
                    if eval(rule["condition"], {"element": element}):
                        findings.append({
                            "element": element.name,
                            "threat": rule["description"],
                            "recommendation": rule["recommendation"],
                            "severity": rule["severity"],
                            "stride": rule["stride"]
                        })
        return findings

    def generate_dfd(self):
        G = nx.DiGraph()
        for e in self.elements:
            G.add_node(e.name, type=e.__class__.__name__)
        for df in self.dataflows:
            G.add_edge(df.source.name, df.target.name, label=df.label)
        
        pos = nx.spring_layout(G)
        plt.figure(figsize=(14, 10))
        nx.draw(G, pos, with_labels=True, node_color="lightblue", node_size=2000, font_size=10)
        edge_labels = nx.get_edge_attributes(G, "label")
        nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)
        plt.savefig("dfd.png")
        plt.close()

    def generate_report(self, findings):
        with open("report.html", "w") as f:
            f.write(f"""
                <html>
                <head><title>EmpTM Report</title></head>
                <body>
                    <h1>EmpTM Report: {self.name}</h1>
                    <h2>Summary</h2>
                    <p>Total Threats: {len(findings)}</p>
                    <p>High Severity: {len([f for f in findings if f['severity'] == 'High'])}</p>
                    <p>Medium Severity: {len([f for f in findings if f['severity'] == 'Medium'])}</p>
                    <p>Low Severity: {len([f for f in findings if f['severity'] == 'Low'])}</p>
                    <h2>Threats and Recommendations</h2>
                    <ul>
            """)
            for finding in sorted(findings, key=lambda x: x["severity"], reverse=True):
                f.write(f"""
                    <li><b>Element:</b> {finding['element']}<br>
                        <b>Threat:</b> {finding['threat']} ({finding['stride']})<br>
                        <b>Severity:</b> {finding['severity']}<br>
                        <b>Recommendation:</b> {finding['recommendation']}</li>
                """)
            f.write("""
                    </ul>
                    <img src='dfd.png' alt='DFD'>
                </body>
                </html>
            """)
        subprocess.run(["wkhtmltopdf", "report.html", "report.pdf"])

        with open("report.csv", "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["element", "threat", "stride", "severity", "recommendation"])
            writer.writeheader()
            writer.writerows(findings)

    @staticmethod
    def from_aws():
        tm = EmpTM("AWS Auto-Generated Model")
        ec2_client = boto3.client("ec2")
        instances = ec2_client.describe_instances()["Reservations"]
        for res in instances:
            for inst in res["Instances"]:
                e = AWSEC2(f"EC2-{inst['InstanceId']}")
                e.isEncrypted = inst.get("EbsOptimized", False)
                tm.add_element(e)
        return tm

# Flask Web Interface
app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    tm = EmpTM(data.get("name", "Custom System"), data.get("feedConfig"))

    for elem in data["elements"]:
        elem_type = elem["type"]
        e = globals()[elem_type](elem["label"])
        e.isEncrypted = elem.get("isEncrypted", False)
        e.implementsAuthenticationScheme = elem.get("implementsAuthenticationScheme", False)
        e.sanitizesInput = elem.get("sanitizesInput", False)
        e.isPublic = elem.get("isPublic", False)
        tm.add_element(e)

    for flow in data["flows"]:
        source = next(e for e in tm.elements if e.name == flow["from"])
        target = next(e for e in tm.elements if e.name == flow["to"])
        df = Dataflow(source, target, flow["label"], flow["protocol"])
        df.isEncrypted = flow.get("isEncrypted", False)
        tm.add_dataflow(df)

    findings = tm.analyze()
    tm.generate_dfd()
    tm.generate_report(findings)
    return jsonify({"status": "success", "report": "report.pdf", "csv": "report.csv"})

@app.route("/auto_aws", methods=["GET"])
def auto_aws():
    tm = EmpTM.from_aws()
    findings = tm.analyze()
    tm.generate_dfd()
    tm.generate_report(findings)
    return jsonify({"status": "success", "report": "report.pdf", "csv": "report.csv"})

@app.route("/download/<filetype>")
def download(filetype):
    if filetype == "pdf":
        return send_file("report.pdf", as_attachment=True)
    elif filetype == "csv":
        return send_file("report.csv", as_attachment=True)
    return "Invalid file type", 400

if __name__ == "__main__":
    app.run(debug=True)
