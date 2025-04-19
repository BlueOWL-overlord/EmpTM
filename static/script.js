// Global variables
let selectedOutputPort = null;
let tempLine = null;
let isCtrlPressed = false;
let isHoveringPort = false;
let selectedPort = null;
let mainCanvas = null; // Will be initialized in $(document).ready

$(document).ready(function() {
    console.log("script.js loaded");

    // Initialize Fabric.js canvases
    var stencilCanvas = new fabric.Canvas('stencil-canvas', {
        width: 300,
        height: 2000,
        backgroundColor: '#e0e0e0',
        selection: false
    });

    mainCanvas = new fabric.Canvas('main-canvas', {
        width: 800,
        height: 600,
        backgroundColor: 'transparent',
        defaultCursor: 'default' // Prevent Fabric.js from changing cursor to mover
    });

    // Custom shape class for elements (rectangle with label and ports)
    fabric.ElementWithPorts = fabric.util.createClass(fabric.Group, {
        initialize: function(options) {
            options || (options = {});
            this.labelText = options.labelText || 'Element';
            this.ports = options.ports || [
                { type: 'in', color: '#ff0000', position: { left: -65, top: 0 } },
                { type: 'out', color: '#00ff00', position: { left: 65, top: 0 } }
            ];

            // Rectangle (body)
            var rect = new fabric.Rect({
                width: 130,
                height: 40,
                fill: 'transparent',
                stroke: '#000',
                strokeWidth: 1,
                originX: 'center',
                originY: 'center'
            });

            // Label (text)
            var label = new fabric.Text(this.labelText, {
                fontSize: 12,
                fill: '#000',
                originX: 'center',
                originY: 'center',
                left: 0,
                top: 0,
                selectable: false
            });

            // Create ports dynamically
            var portObjects = this.ports.map((port, index) => new fabric.Circle({
                radius: 6,
                fill: port.color,
                left: port.position.left,
                top: port.position.top,
                originX: 'center',
                originY: 'center',
                selectable: false,
                data: { portIndex: index }
            }));

            // Group the elements together
            this.callSuper('initialize', [rect, label, ...portObjects], {
                left: options.left || 0,
                top: options.top || 0,
                hasControls: true,
                hasBorders: true,
                lockMovementX: options.lockMovementX || false,
                lockMovementY: options.lockMovementY || false,
                data: options.data || {
                    inPort: {
                        protocol: "TCP",
                        portNumber: 0,
                        isEncrypted: false,
                        requiresAuthentication: false
                    },
                    outPort: {
                        protocol: "TCP",
                        portNumber: 0,
                        isEncrypted: false,
                        requiresAuthentication: false
                    },
                    additionalPorts: []
                }
            });

            console.log(`Element created with label: ${this.labelText}`);
        }
    });

    // Load elements from JSON
    $.getJSON('/static/stencil-elements.json', function(stencilElements) {
        console.log(`Total stencil elements loaded: ${stencilElements.length}`);

        // Add elements to the stencil with increased spacing
        stencilElements.forEach((item, index) => {
            console.log(`Adding ${item.label} at position y=${10 + (index * 80)}`);
            var element = new fabric.ElementWithPorts({
                left: 75,
                top: 30 + (index * 80),
                labelText: item.label,
                lockMovementX: true,
                lockMovementY: true,
                data: { 
                    type: item.type, 
                    isEncrypted: false, 
                    implementsAuthenticationScheme: false, 
                    sanitizesInput: false,
                    isPublic: item.type === "AWSS3" || item.type === "AzureBlob" || item.type === "AWSVPC" || item.type === "AzureVNet" ? false : undefined,
                    inPort: {
                        protocol: item.type === "API" || item.type === "WebApp" ? "HTTPS" : "TCP",
                        portNumber: item.type === "API" || item.type === "WebApp" ? 443 : 0,
                        isEncrypted: item.type === "API" || item.type === "WebApp",
                        requiresAuthentication: false
                    },
                    outPort: {
                        protocol: item.type === "API" || item.type === "WebApp" ? "HTTPS" : "TCP",
                        portNumber: item.type === "API" || item.type === "WebApp" ? 443 : 0,
                        isEncrypted: item.type === "API" || item.type === "WebApp",
                        requiresAuthentication: false
                    },
                    additionalPorts: []
                }
            });
            stencilCanvas.add(element);
        });
        console.log(`Total elements added to stencilCanvas: ${stencilCanvas.getObjects().length}`);

        // Add hover effect for stencil elements
        stencilCanvas.on('mouse:over', function(options) {
            if (options.target && options.target instanceof fabric.ElementWithPorts) {
                options.target.item(0).set({ stroke: '#007bff', strokeWidth: 2 });
                stencilCanvas.renderAll();
            }
        });

        stencilCanvas.on('mouse:out', function(options) {
            if (options.target && options.target instanceof fabric.ElementWithPorts) {
                options.target.item(0).set({ stroke: '#000', strokeWidth: 1 });
                stencilCanvas.renderAll();
            }
        });

        // Enable drag-and-drop from stencil to main canvas
        stencilCanvas.on('mouse:down', function(options) {
            if (options.target) {
                var stencilElement = options.target;
                var clone = new fabric.ElementWithPorts({
                    left: 50,
                    top: 50,
                    labelText: stencilElement.labelText,
                    ports: stencilElement.ports,
                    data: stencilElement.data,
                    lockMovementX: false,
                    lockMovementY: false
                });
                mainCanvas.add(clone);
                mainCanvas.setActiveObject(clone);
            }
        });
    }).fail(function() {
        console.error("Failed to load stencil-elements.json");
    });

    // Implement right-click to add ports
    mainCanvas.on('mouse:down', function(options) {
        if (options.button === 3) { // Right-click
            options.e.preventDefault(); // Prevent default context menu
            var target = options.target;
            if (target && target instanceof fabric.ElementWithPorts) {
                // Add a new port
                var newPortPosition = { left: 65, top: (target.ports.length - 1) * 15 };
                var newPortColor = '#0000ff'; // Blue for additional ports
                var newPort = { type: 'additional', color: newPortColor, position: newPortPosition };
                target.ports.push(newPort);
                target.data.additionalPorts.push({
                    protocol: "TCP",
                    portNumber: 0,
                    isEncrypted: false,
                    requiresAuthentication: false
                });

                // Add the new port to the group
                var portObject = new fabric.Circle({
                    radius: 6,
                    fill: newPortColor,
                    left: newPortPosition.left,
                    top: newPortPosition.top,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    data: { portIndex: target.ports.length - 1 }
                });
                target.add(portObject);
                mainCanvas.renderAll();
                console.log(`Added new port to ${target.labelText} at (${newPortPosition.left}, ${newPortPosition.top})`);
            }
            return;
        }

        var pointer = mainCanvas.getPointer(options.e);
        console.log(`Mouse down at (${pointer.x}, ${pointer.y}), Ctrl pressed: ${isCtrlPressed}`);

        // Handle connector creation and port selection (Ctrl + Click)
        if (isCtrlPressed) {
            var target = mainCanvas.findTarget(options.e, false);

            if (target && target instanceof fabric.ElementWithPorts) {
                // Check ports for connection creation or selection
                var ports = target.ports;
                var portPositions = ports.map((port, index) => ({
                    position: getAbsolutePortPosition(target, target.item(index + 2)),
                    type: port.type,
                    index: index
                }));

                var closestPort = portPositions.reduce((closest, current) => {
                    var distance = Math.sqrt(
                        Math.pow(pointer.x - current.position.x, 2) + Math.pow(pointer.y - current.position.y, 2)
                    );
                    if (distance < 25 && (!closest || distance < closest.distance)) {
                        return { ...current, distance };
                    }
                    return closest;
                }, null);

                if (closestPort) {
                    console.log(`Closest port: ${closestPort.type} at (${closestPort.position.x}, ${closestPort.position.y}), distance: ${closestPort.distance}`);
                    // Start a connection
                    if (closestPort.type === 'out' && !selectedOutputPort) {
                        selectedOutputPort = { element: target, pos: closestPort.position };
                        tempLine = new fabric.Line([closestPort.position.x, closestPort.position.y, closestPort.position.x, closestPort.position.y], {
                            stroke: '#333',
                            strokeWidth: 2,
                            selectable: false
                        });
                        mainCanvas.add(tempLine);
                        console.log(`Started connection from ${target.labelText}'s Out port at (${closestPort.position.x}, ${closestPort.position.y})`);
                        return;
                    }

                    // Complete a connection
                    if (selectedOutputPort && (closestPort.type === 'in' || closestPort.type === 'additional')) {
                        var arrow = new fabric.Path(`M ${selectedOutputPort.pos.x} ${selectedOutputPort.pos.y} L ${closestPort.position.x} ${closestPort.position.y} M ${closestPort.position.x - 10} ${closestPort.position.y - 5} L ${closestPort.position.x} ${closestPort.position.y} L ${closestPort.position.x - 10} ${closestPort.position.y + 5}`, {
                            stroke: '#333',
                            strokeWidth: 2,
                            fill: '',
                            selectable: true,
                            data: {
                                source: selectedOutputPort.element,
                                target: target,
                                sourcePort: selectedOutputPort.element.ports.find(p => p.type === 'out'),
                                targetPort: target.ports[closestPort.index],
                                isEncrypted: false,
                                protocol: "HTTP"
                            }
                        });
                        mainCanvas.add(arrow);
                        mainCanvas.remove(tempLine);
                        tempLine = null;
                        selectedOutputPort = null;
                        isCtrlPressed = false;
                        console.log(`Connection created from ${arrow.data.source.labelText} to ${arrow.data.target.labelText}`);
                        mainCanvas.renderAll();
                        return;
                    }

                    // Handle port selection for properties editing
                    if (!selectedOutputPort) {
                        selectedPort = { element: target, portType: closestPort.type === 'in' ? 'inPort' : (closestPort.type === 'out' ? 'outPort' : 'additional'), portIndex: closestPort.index };
                        selectedElement = null;
                        $("#element-props").hide();
                        $("#flow-props").hide();
                        $("#port-props").show();
                        var portData = closestPort.type === 'in' ? target.data.inPort : (closestPort.type === 'out' ? target.data.outPort : target.data.additionalPorts[closestPort.index - 2]);
                        $("#portProtocol").val(portData.protocol).change(function() {
                            portData.protocol = this.value;
                            console.log(`Updated ${selectedPort.portType} protocol to ${this.value}`);
                        });
                        $("#portNumber").val(portData.portNumber).change(function() {
                            portData.portNumber = parseInt(this.value) || 0;
                            console.log(`Updated ${selectedPort.portType} portNumber to ${portData.portNumber}`);
                        });
                        $("#portIsEncrypted").prop("checked", portData.isEncrypted).change(function() {
                            portData.isEncrypted = this.checked;
                            console.log(`Updated ${selectedPort.portType} isEncrypted to ${this.checked}`);
                        });
                        $("#portRequiresAuthentication").prop("checked", portData.requiresAuthentication).change(function() {
                            portData.requiresAuthentication = this.checked;
                            console.log(`Updated ${selectedPort.portType} requiresAuthentication to ${this.checked}`);
                        });
                        console.log(`Selected ${selectedPort.portType} of ${target.labelText} at (${closestPort.position.x}, ${closestPort.position.y})`);
                        return;
                    }
                }
            }

            // Handle connection selection (Ctrl + Click)
            if (target && target instanceof fabric.Path) {
                selectedElement = target;
                selectedPort = null;
                $("#element-props").hide();
                $("#flow-props").show();
                $("#port-props").hide();
                var link = target;
                var linkData = link.data;
                $("#flowIsEncrypted").prop("checked", linkData.isEncrypted).change(function() {
                    linkData.isEncrypted = this.checked;
                });
                $("#protocol").val(linkData.protocol || "HTTP").change(function() {
                    linkData.protocol = this.value;
                });
                console.log(`Selected connection between ${linkData.source.labelText} and ${linkData.target.labelText}`);
                return;
            }

            // If clicking outside a port or connection while in connecting mode, cancel the connection
            if (selectedOutputPort) {
                mainCanvas.remove(tempLine);
                tempLine = null;
                selectedOutputPort = null;
                isCtrlPressed = false;
                mainCanvas.renderAll();
                console.log("Connection cancelled");
            }
            return;
        }

        // Handle element selection and properties (without Ctrl)
        if (options.target && options.target instanceof fabric.ElementWithPorts) {
            selectedElement = options.target;
            selectedPort = null;
            $("#element-props").show();
            $("#flow-props").hide();
            $("#port-props").hide();
            var elementData = selectedElement.data;
            $("#isEncrypted").prop("checked", elementData.isEncrypted).change(function() {
                elementData.isEncrypted = this.checked;
            });
            $("#implementsAuthenticationScheme").prop("checked", elementData.implementsAuthenticationScheme).change(function() {
                elementData.implementsAuthenticationScheme = this.checked;
            });
            $("#sanitizesInput").prop("checked", elementData.sanitizesInput).change(function() {
                elementData.sanitizesInput = this.checked;
            });
            if (elementData.type === "AWSS3" || elementData.type === "AzureBlob" || elementData.type === "AWSVPC" || elementData.type === "AzureVNet") {
                $("#public-label").show().find("#isPublic").prop("checked", elementData.isPublic).change(function() {
                    elementData.isPublic = this.checked;
                });
            } else {
                $("#public-label").hide();
            }
            console.log(`Selected element ${selectedElement.labelText}`);
            return;
        }

        // Clear selection if clicking on the canvas (not an element, port, or connection)
        if (!options.target) {
            selectedElement = null;
            selectedPort = null;
            mainCanvas.discardActiveObject(); // Unselect the active object in Fabric.js
            $("#element-props").hide();
            $("#flow-props").hide();
            $("#port-props").hide();
            mainCanvas.renderAll();
            console.log("Cleared selection by clicking on blank space");
        }
    });

    // Handle mouse hover to change cursor over ports
    mainCanvas.on('mouse:move', function(options) {
        var pointer = mainCanvas.getPointer(options.e);
        var target = mainCanvas.findTarget(options.e, false);

        if (target && target instanceof fabric.ElementWithPorts) {
            var ports = target.ports;
            var portPositions = ports.map((port, index) => ({
                position: getAbsolutePortPosition(target, target.item(index + 2)),
                type: port.type,
                index: index
            }));

            var closestPort = portPositions.reduce((closest, current) => {
                var distance = Math.sqrt(
                    Math.pow(pointer.x - current.position.x, 2) + Math.pow(pointer.y - current.position.y, 2)
                );
                if (distance < 25 && (!closest || distance < closest.distance)) {
                    return { ...current, distance };
                }
                return closest;
            }, null);

            if (closestPort) {
                if (!isHoveringPort) {
                    mainCanvas.hoverCursor = 'pointer';
                    isHoveringPort = true;
                    console.log("Hovering over a port");
                }
                // Temporarily disable dragging while hovering over a port
                target.lockMovementX = true;
                target.lockMovementY = true;
            } else {
                if (isHoveringPort) {
                    mainCanvas.hoverCursor = 'default';
                    isHoveringPort = false;
                    console.log("No longer hovering over a port");
                }
                // Re-enable dragging when not hovering over a port
                target.lockMovementX = false;
                target.lockMovementY = false;
            }
        } else {
            if (isHoveringPort) {
                mainCanvas.hoverCursor = 'default';
                isHoveringPort = false;
                console.log("No longer hovering over a port");
            }
        }

        // Update temp line if connecting
        if (selectedOutputPort && tempLine && isCtrlPressed) {
            var pointer = mainCanvas.getPointer(options.e);
            tempLine.set({ x2: pointer.x, y2: pointer.y });
            mainCanvas.renderAll();
        }
    });

    // Update arrows when an element is moved
    mainCanvas.on('object:moving', function(options) {
        if (options.target && options.target instanceof fabric.ElementWithPorts) {
            updateConnectedArrows(options.target);
        }
    });
});

// Helper function to get absolute position of a port
function getAbsolutePortPosition(element, port) {
    var matrix = element.calcTransformMatrix();
    var portPos = fabric.util.transformPoint(
        new fabric.Point(port.left, port.top),
        matrix
    );
    return portPos;
}

// Update all arrows connected to a moved element
function updateConnectedArrows(movedElement) {
    mainCanvas.getObjects().forEach(obj => {
        if (obj instanceof fabric.Path && obj.data) {
            var source = obj.data.source;
            var target = obj.data.target;
            if (source === movedElement || target === movedElement) {
                var sourcePort = source.item(source.ports.findIndex(p => p === obj.data.sourcePort) + 2);
                var targetPort = target.item(target.ports.findIndex(p => p === obj.data.targetPort) + 2);
                var sourcePos = getAbsolutePortPosition(source, sourcePort);
                var targetPos = getAbsolutePortPosition(target, targetPort);
                obj.set('path', [
                    ['M', sourcePos.x, sourcePos.y],
                    ['L', targetPos.x, targetPos.y],
                    ['M', targetPos.x - 10, targetPos.y - 5],
                    ['L', targetPos.x, targetPos.y],
                    ['L', targetPos.x - 10, targetPos.y + 5]
                ]);
            }
        }
    });
    mainCanvas.renderAll();
}

// Add delete functionality for elements, connections, and ports on the main canvas
let selectedElement = null;
$(document).on('keydown', function(event) {
    if ((event.keyCode === 46 || event.key === 'Delete') && selectedElement) {
        if (selectedElement instanceof fabric.ElementWithPorts) {
            console.log("Deleting element:", selectedElement.labelText);
            // Remove any arrows connected to this element
            mainCanvas.getObjects().forEach(obj => {
                if (obj instanceof fabric.Path && obj.data && (obj.data.source === selectedElement || obj.data.target === selectedElement)) {
                    mainCanvas.remove(obj);
                }
            });
            mainCanvas.remove(selectedElement);
        } else if (selectedElement instanceof fabric.Path) {
            console.log("Deleting connection between", selectedElement.data.source.labelText, "and", selectedElement.data.target.labelText);
            mainCanvas.remove(selectedElement);
        }
        selectedElement = null;
        selectedPort = null;
        $("#element-props").hide();
        $("#flow-props").hide();
        $("#port-props").hide();
        mainCanvas.renderAll();
    }
});

// Threat Feed Config (moved to separate page, handled in threat-feed.html)

function saveFeedConfig() {
    alert("Threat feed configuration saved!");
}

function analyze() {
    var elements = mainCanvas.getObjects().filter(obj => obj instanceof fabric.ElementWithPorts).map(e => ({
        type: e.data.type,
        label: e.labelText,
        isEncrypted: e.data.isEncrypted,
        implementsAuthenticationScheme: e.data.implementsAuthenticationScheme,
        sanitizesInput: e.data.sanitizesInput,
        isPublic: e.data.isPublic,
        inPort: e.data.inPort,
        outPort: e.data.outPort,
        additionalPorts: e.data.additionalPorts
    }));
    var flows = mainCanvas.getObjects().filter(obj => obj instanceof fabric.Path).map(l => ({
        from: l.data.source.labelText,
        to: l.data.target.labelText,
        label: l.data.protocol,
        protocol: l.data.protocol,
        isEncrypted: l.data.isEncrypted
    }));
    var feedConfig = {
        source: $("#feed-source").val() || "otx",
        apiKey: $("#feed-api-key").val() || "",
        customUrl: $("#feed-source").val() === "custom" ? ($("#feed-custom-url").val() || "") : null
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
    var webApp = new fabric.ElementWithPorts({
        left: 300,
        top: 100,
        labelText: "Web App",
        data: { 
            type: "WebApp", 
            isEncrypted: false, 
            implementsAuthenticationScheme: false, 
            sanitizesInput: false,
            inPort: { protocol: "HTTPS", portNumber: 443, isEncrypted: true, requiresAuthentication: false },
            outPort: { protocol: "HTTPS", portNumber: 443, isEncrypted: true, requiresAuthentication: false },
            additionalPorts: []
        }
    });
    mainCanvas.add(webApp);

    setTimeout(() => {
        alert("Wizard Step 2: Add an API and connect it");
        var api = new fabric.ElementWithPorts({
            left: 500,
            top: 100,
            labelText: "API",
            data: { 
                type: "API", 
                isEncrypted: false, 
                implementsAuthenticationScheme: false, 
                sanitizesInput: false,
                inPort: { protocol: "HTTPS", portNumber: 443, isEncrypted: true, requiresAuthentication: false },
                outPort: { protocol: "HTTPS", portNumber: 443, isEncrypted: true, requiresAuthentication: false },
                additionalPorts: []
            }
        });
        mainCanvas.add(api);

        // Draw an arrow from Web App's output to API's input
        var webAppOutPort = webApp.ports.find(p => p.type === 'out');
        var apiInPort = api.ports.find(p => p.type === 'in');
        var webAppOutPortPos = getAbsolutePortPosition(webApp, webApp.item(webApp.ports.findIndex(p => p.type === 'out') + 2));
        var apiInPortPos = getAbsolutePortPosition(api, api.item(api.ports.findIndex(p => p.type === 'in') + 2));
        var arrow = new fabric.Path(`M ${webAppOutPortPos.x} ${webAppOutPortPos.y} L ${apiInPortPos.x} ${apiInPortPos.y} M ${apiInPortPos.x - 10} ${apiInPortPos.y - 5} L ${apiInPortPos.x} ${apiInPortPos.y} L ${apiInPortPos.x - 10} ${apiInPortPos.y + 5}`, {
            stroke: '#333',
            strokeWidth: 2,
            fill: '',
            selectable: true,
            data: {
                source: webApp,
                target: api,
                sourcePort: webAppOutPort,
                targetPort: apiInPort,
                isEncrypted: true,
                protocol: "HTTPS"
            }
        });
        mainCanvas.add(arrow);
        alert("Wizard Complete! Modify properties and click Analyze.");
    }, 1000);
}

// Expose functions to global scope
window.saveFeedConfig = saveFeedConfig;
window.analyze = analyze;
window.autoAWS = autoAWS;
window.startWizard = startWizard;

// Track Ctrl key state
$(document).on('keydown', function(event) {
    if (event.key === 'Control') {
        isCtrlPressed = true;
        console.log("Ctrl key pressed");
    }
});

$(document).on('keyup', function(event) {
    if (event.key === 'Control') {
        isCtrlPressed = false;
        if (tempLine) {
            mainCanvas.remove(tempLine);
            tempLine = null;
            selectedOutputPort = null;
            mainCanvas.renderAll();
        }
        console.log("Ctrl key released");
    }
});