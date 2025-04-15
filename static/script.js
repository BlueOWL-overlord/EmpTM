$(document).ready(function() {
    console.log("script.js loaded");

    // Main canvas for the DFD
    var canvasElement = document.getElementById("canvas");
    if (!canvasElement) {
        console.error("Canvas element not found in the DOM");
    } else {
        console.log("Canvas element found:", canvasElement);
    }

    var graph = new joint.dia.Graph();
    var paper;
    try {
        paper = new joint.dia.Paper({
            el: canvasElement,
            width: 800,
            height: 600,
            model: graph,
            gridSize: 10,
            linkPinning: false
        });
        console.log("Main canvas initialized:", paper);
    } catch (error) {
        console.error("Failed to initialize canvas:", error);
        $("#canvas-fallback").show();
    }

    // Stencil canvas for elements
    var stencilGraph = new joint.dia.Graph();
    var stencilPaper = new joint.dia.Paper({
        el: document.getElementById("stencil-canvas"),
        width: 150,
        height: 2000,
        model: stencilGraph,
        interactive: false
    });
    console.log("Stencil canvas initialized");

    // Define a custom element with ports, labels, and icons
    joint.shapes.custom = joint.shapes.custom || {};
    joint.shapes.custom.ElementWithPorts = joint.shapes.standard.Rectangle.extend({
        markup: [
            '<g class="rotatable">',
            '<g class="scalable">',
            '<rect class="body"/>',
            '<image class="icon"/>',
            '</g>',
            '<text class="label"/>',
            '</g>'
        ].join(''),
        defaults: joint.util.deepSupplement({
            type: 'custom.ElementWithPorts',
            size: { width: 130, height: 40 },
            attrs: {
                '.body': { fill: '#e0e0e0', stroke: '#000', 'stroke-width': 1 },
                '.icon': { 
                    width: 24, 
                    height: 24, 
                    'ref-x': 5, 
                    'ref-y': 8, 
                    'x-alignment': 'left', 
                    'y-alignment': 'middle',
                    preserveAspectRatio: 'xMidYMid meet'
                },
                '.label': { 
                    'font-size': 12, 
                    fill: '#000', 
                    'ref-y': 0.5, 
                    'ref-x': 35,
                    'text-anchor': 'left', 
                    'y-alignment': 'middle',
                    text: ''
                }
            },
            ports: {
                groups: {
                    'in': {
                        position: 'left',
                        attrs: { circle: { fill: '#ff0000', r: 6 } },
                        label: { 
                            position: 'left', 
                            markup: '<text fill="black" font-size="10">In</text>' 
                        }
                    },
                    'out': {
                        position: 'right',
                        attrs: { circle: { fill: '#00ff00', r: 6 } },
                        label: { 
                            position: 'right', 
                            markup: '<text fill="black" font-size="10">Out</text>' 
                        }
                    }
                },
                items: [
                    { group: 'in', id: 'in1' },
                    { group: 'out', id: 'out1' }
                ]
            }
        }, joint.shapes.standard.Rectangle.prototype.defaults)
    });

    // Map element types to icon URLs (using correct Icons8 URLs)
    const iconMap = {
        "AWSEC2": "https://img.icons8.com/fluency/48/amazon-ec2.png",
        "AWSS3": "https://img.icons8.com/fluency/48/amazon-s3.png",
        "AWSLambda": "https://img.icons8.com/fluency/48/aws-lambda.png",
        "AWSRDS": "https://img.icons8.com/fluency/48/amazon-rds.png",
        "AWSDynamoDB": "https://img.icons8.com/fluency/48/amazon-dynamodb.png",
        "AWSEKS": "https://img.icons8.com/fluency/48/amazon-eks.png",
        "AWSECS": "https://img.icons8.com/fluency/48/amazon-ecs.png",
        "AWSAPIGateway": "https://img.icons8.com/fluency/48/amazon-api-gateway.png",
        "AWSSQS": "https://img.icons8.com/fluency/48/amazon-sqs.png",
        "AWSSNS": "https://img.icons8.com/fluency/48/amazon-sns.png",
        "AWSEB": "https://img.icons8.com/fluency/48/amazon-elastic-beanstalk.png",
        "AWSCloudFront": "https://img.icons8.com/fluency/48/amazon-cloudfront.png",
        "AWSALB": "https://img.icons8.com/fluency/48/amazon-alb.png",
        "AWSNLB": "https://img.icons8.com/fluency/48/amazon-nlb.png",
        "AWSWAF": "https://img.icons8.com/fluency/48/amazon-waf.png",
        "AWSVPC": "https://img.icons8.com/fluency/48/amazon-vpc.png",
        "AzureVM": "https://img.icons8.com/fluency/48/virtual-machine.png",
        "AzureBlob": "https://img.icons8.com/fluency/48/azure-blob-storage.png",
        "AzureFunction": "https://img.icons8.com/fluency/48/azure-functions.png",
        "AzureSQL": "https://img.icons8.com/fluency/48/azure-sql-database.png",
        "AzureCosmosDB": "https://img.icons8.com/fluency/48/azure-cosmos-db.png",
        "AzureAKS": "https://img.icons8.com/fluency/48/azure-kubernetes-service.png",
        "AzureContainer": "https://img.icons8.com/fluency/48/azure-container-instances.png",
        "AzureAppService": "https://img.icons8.com/fluency/48/azure-app-service.png",
        "AzureQueue": "https://img.icons8.com/fluency/48/azure-queue-storage.png",
        "AzureEventHub": "https://img.icons8.com/fluency/48/azure-event-hubs.png",
        "AzureLoadBalancer": "https://img.icons8.com/fluency/48/azure-load-balancer.png",
        "AzureFirewall": "https://img.icons8.com/fluency/48/azure-firewall.png",
        "AzureVNet": "https://img.icons8.com/fluency/48/azure-virtual-network.png",
        "Firewall": "https://img.icons8.com/fluency/48/firewall.png",
        "LoadBalancer": "https://img.icons8.com/fluency/48/load-balancer.png",
        "WebApp": "https://img.icons8.com/fluency/48/web.png",
        "API": "https://img.icons8.com/fluency/48/api.png"
    };

    // List of elements for the stencil
    var stencilElements = [
        { type: "AWSEC2", label: "AWS EC2" },
        { type: "AWSS3", label: "AWS S3" },
        { type: "AWSLambda", label: "AWS Lambda" },
        { type: "AWSRDS", label: "AWS RDS" },
        { type: "AWSDynamoDB", label: "AWS DynamoDB" },
        { type: "AWSEKS", label: "AWS EKS" },
        { type: "AWSECS", label: "AWS ECS" },
        { type: "AWSAPIGateway", label: "AWS API Gateway" },
        { type: "AWSSQS", label: "AWS SQS" },
        { type: "AWSSNS", label: "AWS SNS" },
        { type: "AWSEB", label: "AWS Elastic Beanstalk" },
        { type: "AWSCloudFront", label: "AWS CloudFront" },
        { type: "AWSALB", label: "AWS ALB" },
        { type: "AWSNLB", label: "AWS NLB" },
        { type: "AWSWAF", label: "AWS WAF" },
        { type: "AWSVPC", label: "AWS VPC" },
        { type: "AzureVM", label: "Azure VM" },
        { type: "AzureBlob", label: "Azure Blob" },
        { type: "AzureFunction", label: "Azure Function" },
        { type: "AzureSQL", label: "Azure SQL" },
        { type: "AzureCosmosDB", label: "Azure Cosmos DB" },
        { type: "AzureAKS", label: "Azure AKS" },
        { type: "AzureContainer", label: "Azure Container" },
        { type: "AzureAppService", label: "Azure App Service" },
        { type: "AzureQueue", label: "Azure Queue" },
        { type: "AzureEventHub", label: "Azure Event Hub" },
        { type: "AzureLoadBalancer", label: "Azure LB" },
        { type: "AzureFirewall", label: "Azure Firewall" },
        { type: "AzureVNet", label: "Azure VNet" },
        { type: "Firewall", label: "Firewall" },
        { type: "LoadBalancer", label: "Load Balancer" },
        { type: "WebApp", label: "Web App" },
        { type: "API", label: "API" }
    ];
    console.log(`Total stencil elements: ${stencilElements.length}`);

    // Add elements to the stencil
    stencilElements.forEach((item, index) => {
        console.log(`Adding ${item.label} at position y=${10 + (index * 60)}`);
        var element = new joint.shapes.custom.ElementWithPorts({
            position: { x: 10, y: 10 + (index * 60) },
            attrs: { 
                label: { text: item.label },
                icon: { 'xlink:href': iconMap[item.type] || 'https://img.icons8.com/fluency/48/cube.png' } // Fallback icon
            },
            data: { 
                type: item.type, 
                isEncrypted: false, 
                implementsAuthenticationScheme: false, 
                sanitizesInput: false, 
                isPublic: item.type === "AWSS3" || item.type === "AzureBlob" || item.type === "AWSVPC" || item.type === "AzureVNet" ? false : undefined 
            }
        });
        element.attr('label/text', item.label);
        element.attr('icon/xlink:href', iconMap[item.type] || 'https://img.icons8.com/fluency/48/cube.png');
        stencilGraph.addCell(element);
    });
    console.log(`Total elements added to stencilGraph: ${stencilGraph.getElements().length}`);

    // Enable drag-and-drop from stencil to main canvas
    stencilPaper.on('cell:pointerdown', function(cellView, evt, x, y) {
        console.log(`Dragging element: ${cellView.model.attributes.attrs.label.text}`);
        var cell = cellView.model;
        if (!cell.isLink()) {
            var clone = new joint.shapes.custom.ElementWithPorts({
                position: { x: 50, y: 50 },
                attrs: { 
                    label: { text: cell.attributes.attrs.label.text },
                    icon: { 'xlink:href': cell.attributes.attrs.icon['xlink:href'] }
                },
                data: cell.attributes.data
            });
            clone.attr('label/text', cell.attributes.attrs.label.text);
            clone.attr('icon/xlink:href', cell.attributes.attrs.icon['xlink:href']);
            graph.addCell(clone);
        }
    });

    // Add delete functionality for elements on the canvas
    let selectedElement = null;

    paper.on('element:pointerclick', function(cellView) {
        selectedElement = cellView.model; // Track the selected element
        $("#element-props").show();
        $("#flow-props").hide();
        var cell = cellView.model;
        $("#isEncrypted").prop("checked", cell.attributes.data.isEncrypted).change(function() {
            cell.attributes.data.isEncrypted = this.checked;
        });
        $("#implementsAuthenticationScheme").prop("checked", cell.attributes.data.implementsAuthenticationScheme).change(function() {
            cell.attributes.data.implementsAuthenticationScheme = this.checked;
        });
        $("#sanitizesInput").prop("checked", cell.attributes.data.sanitizesInput).change(function() {
            cell.attributes.data.sanitizesInput = this.checked;
        });
        if (cell.attributes.data.type === "AWSS3" || cell.attributes.data.type === "AzureBlob" || cell.attributes.data.type === "AWSVPC" || cell.attributes.data.type === "AzureVNet") {
            $("#public-label").show().find("#isPublic").prop("checked", cell.attributes.data.isPublic).change(function() {
                cell.attributes.data.isPublic = this.checked;
            });
        } else {
            $("#public-label").hide();
        }
    });

    // Clear selection when clicking on the blank canvas
    paper.on('blank:pointerclick', function() {
        selectedElement = null;
        $("#element-props").hide();
        $("#flow-props").hide();
    });

    // Listen for the Delete key to remove the selected element
    $(document).on('keydown', function(event) {
        if ((event.keyCode === 46 || event.key === 'Delete') && selectedElement && !selectedElement.isLink()) { // Delete key
            console.log("Deleting element:", selectedElement.attributes.attrs.label.text);
            selectedElement.remove(); // Remove the element from the graph
            selectedElement = null; // Clear the selection
            $("#element-props").hide(); // Hide properties panel
        }
    });

    // Handle link creation and selection on the main canvas
    paper.on("link:pointerclick", function(cellView) {
        selectedElement = null; // Clear element selection when a link is clicked
        $("#element-props").hide();
        $("#flow-props").show();
        var cell = cellView.model;
        $("#flowIsEncrypted").prop("checked", cell.attributes.data?.isEncrypted || false).change(function() {
            cell.attributes.data = cell.attributes.data || {};
            cell.attributes.data.isEncrypted = this.checked;
        });
        $("#protocol").val(cell.attributes.data?.protocol || "HTTP").change(function() {
            cell.attributes.data = cell.attributes.data || {};
            cell.attributes.data.protocol = this.value;
            cell.label(0, { text: this.value });
        });
    });

    paper.on("link:connect", function(linkView) {
        console.log("Link connected");
        var link = linkView.model;
        link.label(0, { text: "HTTP" });
        link.attributes.data = { isEncrypted: false, protocol: "HTTP" };
        link.attr({
            '.connection': { stroke: '#333', 'stroke-width': 2 },
            '.marker-target': { fill: '#333', d: 'M 10 0 L 0 5 L 10 10 z' }
        });
    });

    // Threat Feed Config
    $("#feed-source").change(function() {
        if ($(this).val() === "custom") {
            $("#custom-url-label").show();
        } else {
            $("#custom-url-label").hide();
        }
    });

    function saveFeedConfig() {
        alert("Threat feed configuration saved!");
    }

    function analyze() {
        var elements = graph.getElements().map(e => ({
            type: e.attributes.data.type,
            label: e.attributes.attrs.label.text,
            isEncrypted: e.attributes.data.isEncrypted,
            implementsAuthenticationScheme: e.attributes.data.implementsAuthenticationScheme,
            sanitizesInput: e.attributes.data.sanitizesInput,
            isPublic: e.attributes.data.isPublic
        }));
        var flows = graph.getLinks().map(l => ({
            from: graph.getCell(l.attributes.source.id).attributes.attrs.label.text,
            to: graph.getCell(l.attributes.target.id).attributes.attrs.label.text,
            label: l.attributes.labels[0].text,
            protocol: l.attributes.data.protocol,
            isEncrypted: l.attributes.data.isEncrypted
        }));
        var feedConfig = {
            source: $("#feed-source").val(),
            apiKey: $("#feed-api-key").val(),
            customUrl: $("#feed-source").val() === "custom" ? $("#feed-custom-url").val() : null
        };

        $.ajax({
            url: "/analyze",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ name: "Custom System", elements: elements, flows: flows, feedConfig: feedConfig }),
            success: function(response) {
                window.location.href = `/download/pdf`;
                alert("Download PDF or CSV from the links: " + response.report + " | " + response.csv);
            },
            error: function(xhr, status, error) {
                alert("Analysis failed: " + error);
            }
        });
    }

    function autoAWS() {
        $.get("/auto_aws", function(response) {
            window.location.href = `/download/pdf`;
            alert("AWS auto-generated model created. Download PDF or CSV: " + response.report + " | " + response.csv);
        });
    }

    function startWizard() {
        alert("Wizard Step 1: Add a Web App");
        var webApp = new joint.shapes.custom.ElementWithPorts({
            position: { x: 300, y: 100 },
            attrs: { 
                label: { text: "Web App" },
                icon: { 'xlink:href': iconMap["WebApp"] }
            },
            data: { type: "WebApp", isEncrypted: false, implementsAuthenticationScheme: false, sanitizesInput: false }
        });
        webApp.attr('label/text', "Web App");
        webApp.attr('icon/xlink:href', iconMap["WebApp"]);
        graph.addCell(webApp);
        setTimeout(() => {
            alert("Wizard Step 2: Add an API and connect it");
            var api = new joint.shapes.custom.ElementWithPorts({
                position: { x: 500, y: 100 },
                attrs: { 
                    label: { text: "API" },
                    icon: { 'xlink:href': iconMap["API"] }
                },
                data: { type: "API", isEncrypted: false, implementsAuthenticationScheme: false, sanitizesInput: false }
            });
            api.attr('label/text', "API");
            api.attr('icon/xlink:href', iconMap["API"]);
            graph.addCell(api);
            var link = new joint.shapes.standard.Link({
                source: { id: webApp.id, port: 'out1' },
                target: { id: api.id, port: 'in1' },
                labels: [{ text: "HTTPS" }],
                data: { isEncrypted: true, protocol: "HTTPS" }
            });
            link.attr({
                '.connection': { stroke: '#333', 'stroke-width': 2 },
                '.marker-target': { fill: '#333', d: 'M 10 0 L 0 5 L 10 10 z' }
            });
            graph.addCell(link);
            alert("Wizard Complete! Modify properties and click Analyze.");
        }, 1000);
    }

    // Expose functions to global scope
    window.saveFeedConfig = saveFeedConfig;
    window.analyze = analyze;
    window.autoAWS = autoAWS;
    window.startWizard = startWizard;
});
