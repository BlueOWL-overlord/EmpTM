// Global variables
let selectedOutputPort = null;
let tempLine = null;
let isCtrlPressed = false;
let isHoveringPort = false;
let selectedPort = null;
let mainCanvas = null; // Will be initialized in $(document).ready
let selectedElement = null;
let projectData = null; // Store project data for saving/loading
let aiSettings = { provider: 'openai', apiKey: '' }; // Store AI provider and API key

$(document).ready(function() {
    console.log("script.js loaded");

    // Load AI settings from localStorage if available
    const savedAiSettings = localStorage.getItem('aiSettings');
    if (savedAiSettings) {
        aiSettings = JSON.parse(savedAiSettings);
        $('#ai-provider').val(aiSettings.provider);
        $('#ai-api-key').val(aiSettings.apiKey);
    }

    // Initialize Fabric.js canvases
    var stencilCanvas = new fabric.Canvas('stencil-canvas', {
        width: 300,
        height: 2000, // Will be adjusted dynamically
        backgroundColor: '#e0e0e0',
        selection: false
    });

    mainCanvas = new fabric.Canvas('main-canvas', {
        width: 800,
        height: 600,
        backgroundColor: 'transparent',
        defaultCursor: 'default' // Prevent Fabric.js from changing cursor to mover
    });

    // Custom shape class for regular elements (rectangle with label, sublabel, and ports)
    fabric.ElementWithPorts = fabric.util.createClass(fabric.Group, {
        initialize: function(options) {
            options || (options = {});
            this.labelText = options.labelText || 'Element';
            this.sublabelText = options.sublabelText || ''; // Customizable sublabel
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
                top: -5,
                selectable: false
            });

            // Sublabel (text, below the label)
            var sublabel = new fabric.Text(this.sublabelText, {
                fontSize: 10,
                fill: '#555',
                originX: 'center',
                originY: 'center',
                left: 0,
                top: 10,
                selectable: false
            });

            // Create ports dynamically, ensuring each port has a corresponding fabric.Circle
            var portObjects = this.ports.map((port, index) => {
                if (!port.position || typeof port.position.left !== 'number' || typeof port.position.top !== 'number') {
                    console.warn(`Invalid port position for port ${index} in element ${this.labelText}, using default`);
                    port.position = { left: port.type === 'in' ? -65 : 65, top: 0 };
                }
                return new fabric.Circle({
                    radius: 6,
                    fill: port.color || (port.type === 'in' ? '#ff0000' : port.type === 'out' ? '#00ff00' : '#0000ff'),
                    left: port.position.left,
                    top: port.position.top,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    data: { portIndex: index }
                });
            });

            // Group the elements together
            this.callSuper('initialize', [rect, label, sublabel, ...portObjects], {
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
                },
                zIndex: 1 // Higher z-index for elements
            });

            console.log(`Element created with label: ${this.labelText}, sublabel: ${this.sublabelText}, ports: ${this.ports.length}`);
        },

        // Method to update label
        setLabel: function(newLabel) {
            this.labelText = newLabel || 'Element'; // Fallback to 'Element' if undefined
            this.item(1).set({ text: this.labelText }); // Item 1 is the label text
            if (this.canvas) this.canvas.renderAll();
        },

        // Method to update sublabel
        setSublabel: function(newSublabel) {
            this.sublabelText = newSublabel || ''; // Fallback to empty string if undefined
            this.item(2).set({ text: this.sublabelText }); // Item 2 is the sublabel text
            if (this.canvas) this.canvas.renderAll();
        },

        // Method to convert to JSON for saving
        toJSON: function() {
            return {
                type: 'ElementWithPorts',
                left: this.left,
                top: this.top,
                labelText: this.labelText,
                sublabelText: this.sublabelText,
                ports: this.ports,
                data: this.data,
                lockMovementX: this.lockMovementX,
                lockMovementY: this.lockMovementY,
                zIndex: this.zIndex
            };
        }
    });

    // Custom shape class for boundaries (single dashed rectangle with text overlays)
    fabric.Boundary = fabric.util.createClass(fabric.Rect, {
        initialize: function(options) {
            options || (options = {});
            this.labelText = options.labelText || 'Boundary';
            this.sublabelText = options.sublabelText || ''; // Customizable sublabel
            this.isInStencil = options.isInStencil || false; // Flag to indicate if in stencil-canvas

            // Dashed rectangle (boundary)
            this.callSuper('initialize', {
                left: options.left || 0,
                top: options.top || 0,
                width: options.width || 200,
                height: options.height || 150,
                fill: this.isInStencil ? 'rgba(255,0,0,0.01)' : 'rgba(0,0,0,0)', // Low opacity fill for stencil to ensure click detection
                stroke: '#ff0000', // Red dashed line like Microsoft TMT
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                evented: true, // Allow events
                hasControls: true,
                hasBorders: true,
                selectable: true,
                lockMovementX: options.lockMovementX || false,
                lockMovementY: options.lockMovementY || false,
                zIndex: 0 // Lower z-index for boundaries
            });

            console.log(`Boundary created with label: ${this.labelText}, sublabel: ${this.sublabelText}`);
        },

        // Custom rendering to add label and sublabel
        _render: function(ctx) {
            this.callSuper('_render', ctx);

            // Draw label (top-left corner)
            ctx.font = '12px Helvetica';
            ctx.fillStyle = '#ff0000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(this.labelText || 'Boundary', -this.width / 2, -this.height / 2 - 15);

            // Draw sublabel (below the label)
            ctx.font = '10px Helvetica';
            ctx.fillStyle = '#ff5555';
            ctx.fillText(this.sublabelText || '', -this.width / 2, -this.height / 2);
        },

        // Override containsPoint to customize selection behavior
        containsPoint: function(point) {
            if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
                console.error(`Invalid point in containsPoint for ${this.labelText}:`, point);
                return false;
            }

            var x = point.x - this.left;
            var y = point.y - this.top;
            var halfWidth = this.width / 2;
            var halfHeight = this.height / 2;

            // If in stencil-canvas, allow selection anywhere within bounds
            if (this.isInStencil) {
                return Math.abs(x) <= halfWidth && Math.abs(y) <= halfHeight;
            }

            // If in main-canvas, only select near the border
            var borderThickness = 10; // Thickness of the border area for selection
            var nearBorder = (
                (Math.abs(x) >= halfWidth - borderThickness && Math.abs(x) <= halfWidth) ||
                (Math.abs(y) >= halfHeight - borderThickness && Math.abs(y) <= halfHeight)
            ) && (
                Math.abs(x) <= halfWidth && Math.abs(y) <= halfHeight
            );

            return nearBorder;
        },

        // Method to update label
        setLabel: function(newLabel) {
            this.labelText = newLabel || 'Boundary'; // Fallback to 'Boundary' if undefined
            if (this.canvas) this.canvas.renderAll();
        },

        // Method to update sublabel
        setSublabel: function(newSublabel) {
            this.sublabelText = newSublabel || ''; // Fallback to empty string if undefined
            if (this.canvas) this.canvas.renderAll();
        },

        // Method to convert to JSON for saving
        toJSON: function() {
            return {
                type: 'Boundary',
                left: this.left,
                top: this.top,
                width: this.width,
                height: this.height,
                labelText: this.labelText,
                sublabelText: this.sublabelText,
                lockMovementX: this.lockMovementX,
                lockMovementY: this.lockMovementY,
                isInStencil: this.isInStencil,
                zIndex: this.zIndex
            };
        }
    });

    // Load elements from JSON
    $.getJSON('/static/stencil-elements.json', function(stencilElements) {
        console.log(`Total stencil elements loaded: ${stencilElements.length}`);

        // Dynamically set canvas height based on number of elements
        const elementHeight = 80; // Height per element (including spacing)
        const canvasHeight = stencilElements.length * elementHeight + 30; // Add buffer
        stencilCanvas.setHeight(canvasHeight);
        console.log(`Set stencil canvas height to ${canvasHeight}px`);

        // Add elements to the stencil with increased spacing
        stencilElements.forEach((item, index) => {
            console.log(`Adding ${item.label} at position y=${10 + (index * elementHeight)}`);
            try {
                if (item.isBoundary) {
                    // Create a boundary
                    var boundary = new fabric.Boundary({
                        left: 75,
                        top: 30 + (index * elementHeight),
                        width: 130,
                        height: 40,
                        labelText: item.label,
                        sublabelText: `Custom ${item.label}`, // Default sublabel
                        lockMovementX: true,
                        lockMovementY: true,
                        isInStencil: true // Indicate this boundary is in the stencil-canvas
                    });
                    stencilCanvas.add(boundary);
                    console.log(`Added boundary: ${item.label}`);
                } else {
                    // Create a regular element
                    var element = new fabric.ElementWithPorts({
                        left: 75,
                        top: 30 + (index * elementHeight),
                        labelText: item.label,
                        sublabelText: `Custom ${item.label}`, // Default sublabel
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
                    console.log(`Added element: ${item.label}`);
                }
            } catch (error) {
                console.error(`Error adding ${item.label}:`, error);
            }
        });
        console.log(`Total elements added to stencilCanvas: ${stencilCanvas.getObjects().length}`);

        // Force re-render of the canvas
        stencilCanvas.renderAll();
        console.log("Stencil canvas rendered");

        // Add hover effect for stencil elements and boundaries
        stencilCanvas.on('mouse:over', function(options) {
            if (options.target) {
                if (options.target instanceof fabric.ElementWithPorts) {
                    options.target.item(0).set({ stroke: '#007bff', strokeWidth: 2 });
                } else if (options.target instanceof fabric.Boundary) {
                    options.target.set({ stroke: '#ff5555', strokeWidth: 3 });
                }
                stencilCanvas.renderAll();
            }
        });

        stencilCanvas.on('mouse:out', function(options) {
            if (options.target) {
                if (options.target instanceof fabric.ElementWithPorts) {
                    options.target.item(0).set({ stroke: '#000', strokeWidth: 1 });
                } else if (options.target instanceof fabric.Boundary) {
                    options.target.set({ stroke: '#ff0000', strokeWidth: 2 });
                }
                stencilCanvas.renderAll();
            }
        });

        // Enable drag-and-drop from stencil to main canvas
        stencilCanvas.on('mouse:down', function(options) {
            if (options.target) {
                if (options.target instanceof fabric.ElementWithPorts) {
                    var stencilElement = options.target;
                    var clone = new fabric.ElementWithPorts({
                        left: 50,
                        top: 50,
                        labelText: stencilElement.labelText, // Use the stencil element's label
                        sublabelText: stencilElement.sublabelText, // Use the stencil element's sublabel
                        ports: stencilElement.ports,
                        data: stencilElement.data,
                        lockMovementX: false,
                        lockMovementY: false
                    });
                    mainCanvas.add(clone);
                    mainCanvas.setActiveObject(clone);
                } else if (options.target instanceof fabric.Boundary) {
                    var stencilBoundary = options.target;
                    var clone = new fabric.Boundary({
                        left: 50,
                        top: 50,
                        width: 200,
                        height: 150,
                        labelText: stencilBoundary.labelText,
                        sublabelText: stencilBoundary.sublabelText,
                        lockMovementX: false,
                        lockMovementY: false,
                        isInStencil: false // This boundary is now on the main canvas
                    });
                    mainCanvas.add(clone);
                    mainCanvas.setActiveObject(clone);
                    console.log(`Dragged boundary ${stencilBoundary.labelText} to main canvas`);
                }
            }
        });
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Failed to load stencil-elements.json:", textStatus, errorThrown);
        console.error("jqXHR:", jqXHR);
    });

    // Implement right-click to add ports (only for elements, not boundaries)
    mainCanvas.on('mouse:down', function(options) {
        if (options.button === 3) { // Right-click
            options.e.preventDefault(); // Prevent default context menu
            var target = options.target;
            if (target && target instanceof fabric.ElementWithPorts) { // Only for elements
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
                    position: getAbsolutePortPosition(target, target.item(index + 3)), // Adjust index due to sublabel
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
                        $("#boundary-props").hide();
                        $("#threats-section").hide();
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
                $("#boundary-props").hide();
                $("#threats-section").hide();
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

        // Handle element or boundary selection and properties (without Ctrl)
        // Prioritize elements over boundaries by checking all targets at the click position
        var targets = mainCanvas.getObjects().filter(obj => {
            return obj.containsPoint(pointer) && (obj instanceof fabric.ElementWithPorts || obj instanceof fabric.Boundary);
        }).sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Sort by zIndex, highest first

        var target = targets[0]; // Get the topmost object (elements have higher zIndex)

        if (target && target instanceof fabric.ElementWithPorts) {
            selectedElement = target;
            selectedPort = null;
            $("#element-props").show();
            $("#flow-props").hide();
            $("#port-props").hide();
            $("#boundary-props").hide();
            $("#threats-section").hide();
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
            // Add sublabel input field
            $("#sublabel-label").show().find("#sublabel").val(selectedElement.sublabelText).off('change').change(function() {
                selectedElement.setSublabel(this.value);
                console.log(`Updated sublabel for ${selectedElement.labelText} to ${this.value}`);
            });
            console.log(`Selected element ${selectedElement.labelText}`);
            mainCanvas.setActiveObject(selectedElement);
            return;
        }

        if (target && target instanceof fabric.Boundary) {
            selectedElement = target;
            selectedPort = null;
            $("#element-props").hide();
            $("#flow-props").hide();
            $("#port-props").hide();
            $("#boundary-props").show();
            $("#threats-section").hide();
            // Add boundary label and sublabel input fields
            $("#boundary-label").val(selectedElement.labelText).off('change').change(function() {
                selectedElement.setLabel(this.value);
                console.log(`Updated label for boundary to ${this.value}`);
            });
            $("#boundary-sublabel").val(selectedElement.sublabelText).off('change').change(function() {
                selectedElement.setSublabel(this.value);
                console.log(`Updated sublabel for boundary to ${this.value}`);
            });
            console.log(`Selected boundary ${selectedElement.labelText}`);
            mainCanvas.setActiveObject(selectedElement);
            return;
        }

        // Clear selection if clicking on the canvas (not an element, port, or connection)
        if (!target) {
            selectedElement = null;
            selectedPort = null;
            mainCanvas.discardActiveObject(); // Unselect the active object in Fabric.js
            $("#element-props").hide();
            $("#flow-props").hide();
            $("#port-props").hide();
            $("#boundary-props").hide();
            $("#threats-section").show();
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
                position: getAbsolutePortPosition(target, target.item(index + 3)), // Adjust index due to sublabel
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
    if (!port || typeof port.left !== 'number' || typeof port.top !== 'number') {
        console.error('Invalid port object:', port);
        return { x: 0, y: 0 }; // Fallback position to avoid crashing
    }
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
                var sourcePort = source.item(source.ports.findIndex(p => p === obj.data.sourcePort) + 3); // Adjust index due to sublabel
                var targetPort = target.item(target.ports.findIndex(p => p === obj.data.targetPort) + 3); // Adjust index due to sublabel
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

// Add delete functionality for elements, boundaries, and connections on the main canvas
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
        } else if (selectedElement instanceof fabric.Boundary) {
            console.log("Deleting boundary:", selectedElement.labelText);
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
        $("#boundary-props").hide();
        $("#threats-section").show();
        mainCanvas.renderAll();
    }
});

// Save AI settings to localStorage
function saveApiSettings() {
    aiSettings.provider = $('#ai-provider').val();
    aiSettings.apiKey = $('#ai-api-key').val();
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
    alert("AI settings saved!");
}

// Function to call AI API for threat model overview and findings enhancement
async function enhanceWithAI(elements, flows, threats) {
    if (!aiSettings.apiKey) {
        alert("Please configure your AI API key in the settings.");
        return { overview: "", enhancedThreats: threats };
    }

    // Prepare the prompt for the AI
    const elementsDescription = elements.map(e => `${e.label} (Type: ${e.type}, Encrypted: ${e.isEncrypted})`).join("\n");
    const flowsDescription = flows.map(f => `${f.from} -> ${f.to} (Protocol: ${f.protocol}, Encrypted: ${f.isEncrypted})`).join("\n");
    const threatsDescription = threats.map(t => `Component: ${t.component}, Reason: ${t.reason}, Threat: ${t.threat}, Severity: ${t.severity}`).join("\n");

    const prompt = `
You are a cybersecurity expert tasked with preparing a threat model overview and enhancing threat findings for a system architecture. Below is the system description:

**Elements:**
${elementsDescription}

**Flows:**
${flowsDescription}

**Initial Threats Identified:**
${threatsDescription}

### Tasks:
1. **Threat Model Overview**: Provide a concise overview of the threat model, highlighting key risks and potential attack vectors based on the elements and flows.
2. **Enhanced Findings**: For each threat, enhance the description by adding potential mitigation strategies and any additional insights that could help in understanding or addressing the threat.

### Output Format:
- **Overview**: A paragraph summarizing the threat model.
- **Enhanced Threats**: A list of threats with their original details plus an "Enhanced Description" field containing your insights and mitigations.
`;

    try {
        let response;
        if (aiSettings.provider === 'openai') {
            // OpenAI API call
            response = await $.ajax({
                url: 'https://api.openai.com/v1/chat/completions',
                type: 'POST',
                headers: {
                    'Authorization': `Bearer ${aiSettings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: 'You are a cybersecurity expert.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });

            const aiResponse = response.choices[0].message.content;
            const [overviewSection, threatsSection] = aiResponse.split('### Enhanced Threats');
            const overview = overviewSection.replace('### Overview', '').trim();
            const enhancedThreatsLines = threatsSection.trim().split('\n').filter(line => line.trim());
            const enhancedThreats = threats.map((threat, index) => {
                const enhancedDesc = enhancedThreatsLines[index] || '';
                return { ...threat, enhancedDescription: enhancedDesc };
            });

            return { overview, enhancedThreats };
        } else if (aiSettings.provider === 'grok') {
            // Grok API call
            response = await $.ajax({
                url: 'https://api.x.ai/v1/chat/completions',
                type: 'POST',
                headers: {
                    'Authorization': `Bearer ${aiSettings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    model: 'grok-3',
                    messages: [
                        { role: 'system', content: 'You are a cybersecurity expert.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });

            const aiResponse = response.choices[0].message.content;
            const [overviewSection, threatsSection] = aiResponse.split('### Enhanced Threats');
            const overview = overviewSection.replace('### Overview', '').trim();
            const enhancedThreatsLines = threatsSection.trim().split('\n').filter(line => line.trim());
            const enhancedThreats = threats.map((threat, index) => {
                const enhancedDesc = enhancedThreatsLines[index] || '';
                return { ...threat, enhancedDescription: enhancedDesc };
            });

            return { overview, enhancedThreats };
        }
    } catch (error) {
        console.error("Error calling AI API:", error);
        alert("Failed to enhance threat model with AI: " + (error.responseJSON?.error?.message || error.message));
        return { overview: "", enhancedThreats: threats };
    }
}

function analyze() {
    var elements = mainCanvas.getObjects().filter(obj => obj instanceof fabric.ElementWithPorts).map(e => ({
        type: e.data.type,
        label: e.labelText,
        sublabel: e.sublabelText,
        isEncrypted: e.data.isEncrypted,
        implementsAuthenticationScheme: e.data.implementsAuthenticationScheme,
        sanitizesInput: e.data.sanitizesInput,
        isPublic: e.data.isPublic,
        inPort: e.data.inPort,
        outPort: e.data.outPort,
        additionalPorts: e.data.additionalPorts,
        left: e.left,
        top: e.top
    }));
    var flows = mainCanvas.getObjects().filter(obj => obj instanceof fabric.Path).map(l => ({
        from: l.data.source.labelText,
        to: l.data.target.labelText,
        label: l.data.protocol,
        protocol: l.data.protocol,
        isEncrypted: l.data.isEncrypted
    }));
    var boundaries = mainCanvas.getObjects().filter(obj => obj instanceof fabric.Boundary).map(b => ({
        type: 'Boundary',
        left: b.left,
        top: b.top,
        width: b.width,
        height: b.height,
        labelText: b.labelText,
        sublabelText: b.sublabelText,
        lockMovementX: b.lockMovementX,
        lockMovementY: b.lockMovementY,
        isInStencil: b.isInStencil,
        zIndex: b.zIndex
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
        success: async function(response) {
            let threats = response.threats.map(threat => ({
                component: threat.component,
                reason: threat.reason,
                threat: threat.threat,
                severity: threat.severity,
                best_practices: threat.best_practices,
                comment: threat.comment || "",
                status: threat.status || "Open"
            }));

            // Check if AI-supported analysis is enabled
            if ($("#ai-supported-analysis").is(":checked")) {
                const { overview, enhancedThreats } = await enhanceWithAI(elements, flows, threats);
                $("#threat-model-overview-text").text(overview);
                $("#threat-model-overview").show();
                threats = enhancedThreats;
            } else {
                $("#threat-model-overview").hide();
            }

            // Store the project data with findings
            projectData = {
                elements: elements,
                flows: flows,
                boundaries: boundaries,
                feedConfig: feedConfig,
                threats: threats
            };

            // Display threats in the UI
            $("#threats-section").show();
            $("#element-props").hide();
            $("#flow-props").hide();
            $("#port-props").hide();
            $("#boundary-props").hide();

            var tableBody = $("#threat-table-body");
            tableBody.empty();

            threats.forEach((threat, index) => {
                var row = `
                    <tr ${threat.status !== "Open" ? 'style="background-color: #d3d3d3;"' : ''}>
                        <td>${threat.component}</td>
                        <td>${threat.reason}</td>
                        <td>${threat.threat}${threat.enhancedDescription ? '<br><strong>Enhanced:</strong> ' + threat.enhancedDescription : ''}</td>
                        <td>
                            <select id="severity-${index}" onchange="updateThreat(${index}, 'severity', this.value)">
                                <option value="Low" ${threat.severity === 'Low' ? 'selected' : ''}>Low</option>
                                <option value="Medium" ${threat.severity === 'Medium' ? 'selected' : ''}>Medium</option>
                                <option value="High" ${threat.severity === 'High' ? 'selected' : ''}>High</option>
                            </select>
                        </td>
                        <td>
                            <textarea id="comment-${index}" placeholder="Add comment..." onblur="updateThreat(${index}, 'comment', this.value)">${threat.comment || ''}</textarea>
                        </td>
                        <td>
                            <button onclick="closeFinding(${index}, 'False Positive')" ${threat.status !== "Open" ? 'disabled' : ''}>False Positive</button>
                            <button onclick="closeFinding(${index}, 'Already Addressed')" ${threat.status !== "Open" ? 'disabled' : ''}>Already Addressed</button>
                        </td>
                    </tr>
                `;
                tableBody.append(row);
            });

            // Provide a link to download the report
            if (response.report) {
                $("#download-report").attr("href", `/download/${response.report}`).show();
            } else {
                alert("No report generated");
            }
        },
        error: function(xhr, status, error) {
            alert("Analysis failed: " + error);
        }
    });
}

function updateThreat(index, field, value) {
    if (projectData && projectData.threats && projectData.threats[index]) {
        projectData.threats[index][field] = value;
        console.log(`Updated threat ${index}: ${field} = ${value}`);
    }
}

function closeFinding(index, reason) {
    if (projectData && projectData.threats && projectData.threats[index]) {
        projectData.threats[index].status = reason;
        console.log(`Closed threat ${index}: ${reason}`);
        $(`#threat-table-body tr:eq(${index})`).css('background-color', '#d3d3d3');
        $(`#threat-table-body tr:eq(${index}) button`).prop('disabled', true);
    }
}

function autoAWS() {
    $.get("/auto_aws", function(response) {
        window.location.href = `/download/${response.report}`;
        alert("AWS auto-generated model created. Download PDF or CSV: " + response.report + " | " + response.csv);
    });
}

function startWizard() {
    alert("Wizard Step 1: Add a Trust Boundary");
    var boundary = new fabric.Boundary({
        left: 200,
        top: 50,
        width: 400,
        height: 300,
        labelText: "Trust Boundary",
        sublabelText: "Corporate Network",
        isInStencil: false // This boundary is on the main canvas
    });
    mainCanvas.add(boundary);

    setTimeout(() => {
        alert("Wizard Step 2: Add a Web App inside the boundary");
        var webApp = new fabric.ElementWithPorts({
            left: 300,
            top: 100,
            labelText: "Web App",
            sublabelText: "Custom Web App",
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
            alert("Wizard Step 3: Add an API and connect it");
            var api = new fabric.ElementWithPorts({
                left: 500,
                top: 100,
                labelText: "API",
                sublabelText: "Custom API",
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
            var webAppOutPortPos = getAbsolutePortPosition(webApp, webApp.item(webApp.ports.findIndex(p => p.type === 'out') + 3));
            var apiInPortPos = getAbsolutePortPosition(api, api.item(api.ports.findIndex(p => p.type === 'in') + 3));
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
    }, 1000);
}

// Save the project as JSON
function saveProject() {
    if (!projectData) {
        alert("No project data to save. Please analyze the diagram first.");
        return;
    }

    var projectJson = JSON.stringify(projectData, null, 2);
    var blob = new Blob([projectJson], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = `project_${new Date().toISOString().replace(/[:.]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Load the project from a JSON file
function loadProject() {
    $("#load-project-file").click();
}

function loadProjectFile(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log("Loading project JSON...");
            projectData = JSON.parse(e.target.result);
            console.log("Project JSON parsed:", projectData);

            // Clear the canvas
            mainCanvas.clear();
            console.log("Canvas cleared");

            // Reconstruct elements
            projectData.elements.forEach((element, idx) => {
                console.log(`Reconstructing element ${idx}: ${element.label || 'undefined'}`);
                // Ensure ports are properly structured
                element.ports = element.ports || [
                    { type: 'in', color: '#ff0000', position: { left: -65, top: 0 } },
                    { type: 'out', color: '#00ff00', position: { left: 65, top: 0 } }
                ];
                // Validate each port
                element.ports = element.ports.map((port, portIdx) => {
                    if (!port.type || !port.color || !port.position || typeof port.position.left !== 'number' || typeof port.position.top !== 'number') {
                        console.warn(`Invalid port ${portIdx} in element ${element.label || 'undefined'}, using default`);
                        return {
                            type: port.type || (portIdx === 0 ? 'in' : 'out'),
                            color: port.color || (portIdx === 0 ? '#ff0000' : '#00ff00'),
                            position: port.position || { left: portIdx === 0 ? -65 : 65, top: 0 }
                        };
                    }
                    return port;
                });

                var newElement = new fabric.ElementWithPorts({
                    left: element.left,
                    top: element.top,
                    labelText: element.label, // Use the correct property name from analyze()
                    sublabelText: element.sublabel, // Use the correct property name from analyze()
                    ports: element.ports,
                    data: element,
                    lockMovementX: element.lockMovementX || false,
                    lockMovementY: element.lockMovementY || false
                });
                newElement.setLabel(element.label); // Ensure label is set with fallback
                newElement.setSublabel(element.sublabel); // Ensure sublabel is set with fallback
                mainCanvas.add(newElement);
                console.log(`Added element ${element.label || 'undefined'} with ${newElement.ports.length} ports`);
            });

            // Reconstruct boundaries
            if (projectData.boundaries) {
                projectData.boundaries.forEach((boundary, idx) => {
                    console.log(`Reconstructing boundary ${idx}: ${boundary.labelText}`);
                    var newBoundary = new fabric.Boundary({
                        left: boundary.left,
                        top: boundary.top,
                        width: boundary.width,
                        height: boundary.height,
                        labelText: boundary.labelText,
                        sublabelText: boundary.sublabelText,
                        lockMovementX: boundary.lockMovementX || false,
                        lockMovementY: boundary.lockMovementY || false,
                        isInStencil: boundary.isInStencil || false,
                        zIndex: boundary.zIndex || 0
                    });
                    newBoundary.setLabel(boundary.labelText); // Ensure label is set
                    newBoundary.setSublabel(boundary.sublabelText); // Ensure sublabel is set
                    mainCanvas.add(newBoundary);
                    console.log(`Added boundary ${boundary.labelText}`);
                });
            }

            // Force a render to ensure all elements are drawn
            mainCanvas.renderAll();
            console.log("Elements and boundaries rendered");

            // Reconstruct flows (arrows) after all elements are added
            if (projectData.flows) {
                projectData.flows.forEach((flow, idx) => {
                    console.log(`Reconstructing flow ${idx}: ${flow.from} -> ${flow.to}`);
                    var sourceElement = mainCanvas.getObjects().find(obj => obj.labelText === flow.from && obj instanceof fabric.ElementWithPorts);
                    var targetElement = mainCanvas.getObjects().find(obj => obj.labelText === flow.to && obj instanceof fabric.ElementWithPorts);
                    if (sourceElement && targetElement) {
                        console.log(`Source element: ${sourceElement.labelText}, Target element: ${targetElement.labelText}`);
                        console.log(`Source ports:`, sourceElement.ports);
                        console.log(`Target ports:`, targetElement.ports);

                        var sourcePortIndex = sourceElement.ports.findIndex(p => p.type === 'out');
                        var targetPortIndex = targetElement.ports.findIndex(p => p.type === 'in');

                        console.log(`Source port index: ${sourcePortIndex}, Target port index: ${targetPortIndex}`);

                        if (sourcePortIndex !== -1 && targetPortIndex !== -1) {
                            var sourcePort = sourceElement.item(sourcePortIndex + 3); // Adjust index due to rect, label, sublabel
                            var targetPort = targetElement.item(targetPortIndex + 3); // Adjust index due to rect, label, sublabel
                            if (sourcePort && targetPort) {
                                console.log(`Source port object:`, sourcePort);
                                console.log(`Target port object:`, targetPort);
                                var sourcePortPos = getAbsolutePortPosition(sourceElement, sourcePort);
                                var targetPortPos = getAbsolutePortPosition(targetElement, targetPort);
                                console.log(`Source port position: (${sourcePortPos.x}, ${sourcePortPos.y}), Target port position: (${targetPortPos.x}, ${targetPortPos.y})`);
                                var arrow = new fabric.Path(`M ${sourcePortPos.x} ${sourcePortPos.y} L ${targetPortPos.x} ${targetPortPos.y} M ${targetPortPos.x - 10} ${targetPortPos.y - 5} L ${targetPortPos.x} ${targetPortPos.y} L ${targetPortPos.x - 10} ${targetPortPos.y + 5}`, {
                                    stroke: '#333',
                                    strokeWidth: 2,
                                    fill: '',
                                    selectable: true,
                                    data: {
                                        source: sourceElement,
                                        target: targetElement,
                                        sourcePort: sourceElement.ports[sourcePortIndex],
                                        targetPort: targetElement.ports[targetPortIndex],
                                        isEncrypted: flow.isEncrypted,
                                        protocol: flow.protocol
                                    }
                                });
                                mainCanvas.add(arrow);
                                console.log(`Added flow from ${flow.from} to ${flow.to}`);
                            } else {
                                console.error(`Failed to find port objects for flow from ${flow.from} to ${flow.to}`);
                            }
                        } else {
                            console.error(`Failed to find 'out' or 'in' port for flow from ${flow.from} to ${flow.to}`);
                        }
                    } else {
                        console.error(`Failed to find source (${flow.from}) or target (${flow.to}) for flow`);
                    }
                });
            } else {
                console.log("No flows to reconstruct");
            }

            // Force a final render to ensure all arrows are drawn
            mainCanvas.renderAll();
            console.log("Flows rendered");

            // Display threats in the UI
            $("#threats-section").show();
            $("#element-props").hide();
            $("#flow-props").hide();
            $("#port-props").hide();
            $("#boundary-props").hide();

            var tableBody = $("#threat-table-body");
            tableBody.empty();

            if (projectData.threats) {
                projectData.threats.forEach((threat, index) => {
                    var row = `
                        <tr ${threat.status !== "Open" ? 'style="background-color: #d3d3d3;"' : ''}>
                            <td>${threat.component}</td>
                            <td>${threat.reason}</td>
                            <td>${threat.threat}${threat.enhancedDescription ? '<br><strong>Enhanced:</strong> ' + threat.enhancedDescription : ''}</td>
                            <td>
                                <select id="severity-${index}" onchange="updateThreat(${index}, 'severity', this.value)">
                                    <option value="Low" ${threat.severity === 'Low' ? 'selected' : ''}>Low</option>
                                    <option value="Medium" ${threat.severity === 'Medium' ? 'selected' : ''}>Medium</option>
                                    <option value="High" ${threat.severity === 'High' ? 'selected' : ''}>High</option>
                                </select>
                            </td>
                            <td>
                                <textarea id="comment-${index}" placeholder="Add comment..." onblur="updateThreat(${index}, 'comment', this.value)">${threat.comment || ''}</textarea>
                            </td>
                            <td>
                                <button onclick="closeFinding(${index}, 'False Positive')" ${threat.status !== "Open" ? 'disabled' : ''}>False Positive</button>
                                <button onclick="closeFinding(${index}, 'Already Addressed')" ${threat.status !== "Open" ? 'disabled' : ''}>Already Addressed</button>
                            </td>
                        </tr>
                    `;
                    tableBody.append(row);
                });
                console.log("Threats table populated");
            } else {
                console.log("No threats to display");
            }

            // Display AI-generated threat model overview if available
            if (projectData.threatModelOverview) {
                $("#threat-model-overview-text").text(projectData.threatModelOverview);
                $("#threat-model-overview").show();
            } else {
                $("#threat-model-overview").hide();
            }

            mainCanvas.renderAll();
            alert("Project loaded successfully!");
        } catch (error) {
            console.error("Error loading project:", error);
            alert("Error loading project: " + error);
        }
    };
    reader.readAsText(file);
}

// Expose functions to global scope
window.saveApiSettings = saveApiSettings;
window.analyze = analyze;
window.autoAWS = autoAWS;
window.startWizard = startWizard;
window.saveProject = saveProject;
window.loadProject = loadProject;

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