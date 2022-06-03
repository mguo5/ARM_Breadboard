/****************************************************
 * Author: Matt Guo
 * Course: EE475/EE542
 * Name: breadboard-visir.js
 * Affiliation: University of Washington
 * Functionality: The javascript backend for the Flask breadboard GUI,
 * handling the client functionality. Breadboard components contain:
 * switches, not gate, and gate, and or gates. Breadboard.Update() contains
 * the update method, checked upon every user button click to change the states
 * of the components in the breadboard
 ***************************************************/
// Define RHLab JSON package
if(typeof(RHLab) === "undefined") {
    RHLab = {};
}

if(typeof(RHLab.Widgets) === "undefined") {
    RHLab.Widgets = {};
}
// Initialize the Breadboard container in the RHLab JSON package
RHLab.Widgets.Breadboard = function() {

    var VISIR_SQUARE_SIZE = 13;
    var DEFAULT_NUMBER_OF_SWITCHES = 18;

    // Associate which of the 50-pin GPIO will be outputs (inputs to the microcontroller)
    var OUTPUTS_BY_PIN = {
        07: 'PC1',  // GPIO6 //PC1
        08: 'V_SW2',  // GPIO7
        09: 'V_SW3',  // GPIO8
        10: 'V_SW4',  // GPIO9
        11: 'PA1', //PA1
        12: 'temp',
        13: 'V_SW5',  // GPIO10
        14: 'V_SW6',  // GPIO11
        15: 'V_SW7',  // GPIO12
        16: 'V_SW8',  // GPIO13
        17: 'V_SW9',  // GPIO14
        18: 'V_SW10', // GPIO15
        19: 'V_SW11', // GPIO16
        20: 'V_SW12', // GPIO17
        21: 'PB1', // GPIO18  //PB1
        22: 'V_SW14', // GPIO19
        //23: 'V_SW15', // GND
        24: 'V_SW16', // GPIO21
        25: 'V_SW17', // GPIO22
        26: 'V_SW18',
        27: 'V_SW19',
        28: 'V_SW20',
        29: 'V_SW21',
        30: 'V_SW22',
        33: 'V_SW23',
        34: 'V_SW24',
        35: 'V_SW25',
        36: 'V_SW26',
        37: 'V_SW27',
        38: 'V_SW28',
        39: 'V_SW29',
        40: 'V_SW30',
        41: 'V_SW31',
        42: 'V_SW32',
        43: 'V_SW33',
        44: 'PD12', //Green
        45: 'PD13', //Orange
        46: 'PD14', //Red
        47: 'PD15' //Blue
    };

    // Associate which of the microcontroller will be inputs to the breadboard (output from the GPIO)
    var INPUTS_BY_PIN = {
        31: 'V_LED0', // GPIO26
        32: 'V_LED1', // GPIO27
    };

    // Function called by template.html for flask that initalizes a <div> for the breadboard
    function Breadboard($element, endpointBase, numberOfSwitches, imageBase, enableNetwork) {
        var self = this;
        this._components = {};
        this._outputState = {
            // pinNumber: true/false
        };
        this._inputState = {
            // pinNumber: true/false
        };
        this._outputs = []; // Switches
        this._inputs = []; // LEDs
        this._notGate = []; // not gate
        this._andGate = []; //and gate
        this._orGate = []; //or gate
        this._errors = [];  //potential errors
        this._numberOfSwitches = numberOfSwitches || DEFAULT_NUMBER_OF_SWITCHES;
        this._imageBase = imageBase || (window.STATIC_ROOT + "resources/img/");
        this._enableNetwork = (enableNetwork === undefined)?true:enableNetwork;

        // Start off will all of the breadboard outputs as a False
        $.each(OUTPUTS_BY_PIN, function (pinNumber, name) {
            self._outputState[pinNumber] = false;
        });
        // Start off with all of the breadboard inputs as a False
        $.each(INPUTS_BY_PIN, function (pinNumber, name) {
            self._inputState[pinNumber] = false;
        });

        this._$elem = $element;
        this._endpointBase = endpointBase;

        visir.Config.Set("dcPower25", false);
        visir.Config.Set("dcPowerM25", false);

        // Not clean: override _ReadLibrary to return always a fixed list without
        // making queries to the server
        visir.Breadboard.prototype._ReadLibrary = function () {
            this._$library = $("<components></components>");
            if (this._onLibraryLoaded) 
                me._onLibraryLoaded();
        }
        this._breadboard = new visir.Breadboard(1, $element);

        // Don't need the visir functionality for: Instruments, Power Supplies
        this._HideInstruments();
        this._AddPowerSupplies();
        this._AddComponents();
        // Create a Delete button to delete wires
        this._$elem.find('.delete').click(function () {
            self.Update();
        });
        $(document).on("mouseup.rem touchend.rem mouseup", function(e) {
            self.Update();
        });

        this._breadboard.LoadCircuit(getOriginalWires(this._numberOfSwitches));
        this._originalNumberOfWires = this._breadboard._wires.length;

        if (visir.FIXES === undefined) {
            visir.FIXES = {};
        }

        if (visir.FIXES.oldSelectWire === undefined) {
            visir.FIXES.oldSelectWire = visir.Breadboard.prototype.SelectWire;
        }

        if (visir.FIXES.oldClear === undefined) {
            visir.FIXES.oldClear = visir.Breadboard.prototype.Clear;
        }

        // Not clean at all: trying to override the function
        visir.Breadboard.prototype.SelectWire = function (idx) {
            if (idx !== null && idx < self._originalNumberOfWires) {
                console.log("Original cable. Do not select");
                return;
            }

            visir.FIXES.oldSelectWire.bind(this)(idx);
            self.Update();
        };

        this._insideClear = false;

        visir.Breadboard.prototype.Clear = function() {
            // Whenever "clear", clear but always add the original wires
            if (!self._insideClear) {
                visir.FIXES.oldClear.bind(this)();
                self._insideClear = true;
                self._breadboard.LoadCircuit(getOriginalWires(self._numberOfSwitches));
                self._originalNumberOfWires = self._breadboard._wires.length;
                self._insideClear = false;
            }
        }

        visir.Breadboard.prototype.SaveCircuitWithoutWires = function(circuit)
        {
            // Whenever SaveCircuit, only save wires which were not already there
            var offp = new visir.Point(44, -3);

            var $xml = $("<circuit><circuitlist/></circuit>");

            var $cirlist = $xml.find("circuitlist");
            $cirlist = $xml.find("circuitlist");

            // Sweeps through the number of original, hardcoded wires in the breadboard
            for(var i=self._originalNumberOfWires;i<this._wires.length; i++) {
                    var w = this._wires[i];
                    var $wire = $("<component/>");
                    var c = this._ColorToNum(w._color);
                    trace("wire color: " + c);
                    var s = w._start.Add(offp);
                    var m = w._mid.Add(offp);
                    var e = w._end.Add(offp);
                    $wire.text("W " + c + " " + s.x + " " + s.y + " " + m.x + " " + m.y + " " + e.x + " " + e.y);
                    $cirlist.append($wire);
            }
            // Save all components to the .xml equivalence for later
            return $("<root />").append($xml).html();
        }

        window._dbgGlobalBreadboard = this;
    }

    // Loads existing circuit from the .xml file
    Breadboard.prototype.LoadCircuit = function (circuit) {
        this._breadboard.LoadCircuit(circuit);
        this.Update();
    }
    
    // Saves current circuit to the .xml file
    Breadboard.prototype.SaveCircuit = function () {
        return this._breadboard.SaveCircuitWithoutWires();
    }

    // Visir contains a bunch of Instruments, which is unimportant here. We can hide these
    Breadboard.prototype._HideInstruments = function () {
        this._$elem.find('.bin .teacher').hide();
        this._$elem.find('.bin .reset').hide();
        this._$elem.find('.instrument.dmm').hide();
        this._$elem.find('.instrument.osc').hide();
        this._$elem.find('.instrument.fgen').hide();
        this._$elem.find('.instrument.gnd').hide();
    }

    // Initializes the power supply and voltage rails for the breadboard. We need +3.3V and GND
    Breadboard.prototype._AddPowerSupplies = function () {
        var connections2image = this._$elem.find('.instrument.dcpower img').attr('src');
        var rightPowerSupply = '<div class="instrument gnd" style="left: 586px; top: 398px"><div class="connectionimages"><img src="' + connections2image + '"></div><div class="texts"><div class="connectiontext">GND</div><div class="connectiontext">+3.3V</div></div></div>';
        this._$elem.find('.instruments').append($(rightPowerSupply));

        this._$elem.find('.instrument.dcpower').css({'top': '-46px'});
        this._$elem.find('.instrument.dcpower .title').hide();
        this._$elem.find('.instrument.dcpower .connectiontext:contains(6V)').text('+3.3V');
    }

    // Function to add existing components to the breadboard. Used for logic gates and switches
    Breadboard.prototype._AddComponents = function () {

        var switchesBottomLine = 10;

        // When we initialize, we can specify the number of switches that we would like
        for (var i = 0; i < this._numberOfSwitches; i++) {
            var bottomTopBase;
            var bottomLeftBase;
            var positionX;

            // Store information on where the switches should be located relative to the breadbaord
            if (i < switchesBottomLine) {
                var positionX = i;
                var bottomTopBase = 307;
                var bottomLeftBase = 157;
            } else {
                var positionX = i - switchesBottomLine;
                var bottomTopBase = 215;
                var bottomLeftBase = 170;
            }

            // Store information on the top position of each switch
            var topPosition;
            if (i % 2 == 1) {
                topPosition = bottomTopBase;
            } else {
                topPosition = bottomTopBase + 2 * VISIR_SQUARE_SIZE;
            }
            var leftPosition = bottomLeftBase + (VISIR_SQUARE_SIZE * 3) * positionX;
            var identifier = "switch" + i;
            var switchComponent = new Breadboard.Switch(identifier, this._imageBase, leftPosition, topPosition);
            // Add the switch information to the overall breadboard JSON, useful for debugging
            this._outputs.push(switchComponent);
            this.AddComponent(switchComponent);
        }

        // The 50-pin connectior to the GPIO of the microcontroller should always be there. We can initialize it here
        var jp1Image = this._imageBase + "connections_50.png";
        var jp1 = new Breadboard.Component('JP1', 221, 22, jp1Image, null, 0);
        this.AddComponent(jp1);
    }

    // Add a new component onto the breadboard, send it to the HTML
    Breadboard.prototype.AddComponent = function(component) {
        this._components[component._identifier] = component;
        this._$elem.find('.components').append(component._$elem);
        component.SetBreadboard(this);
    }

    // Input states to the breadboard is the output state of the microcontroller
    Breadboard.prototype.UpdateInputState = function(state) {
        var self = this;
        if (!state.inputs)
            return;

        // check to see if any of the inputs states have or should be changed
        var anyChanged = false;

        // Sweep thorough the pins on the 50-pin GPIO that should be a input
        $.each(this._inputState, function (pinNumber, currentState) {
            var inputName = INPUTS_BY_PIN[pinNumber];
            if (state.inputs[inputName] === undefined || state.inputs[inputName] === null)
                return; // No input variable provided

            if (state.inputs[inputName] != currentState) {
                anyChanged = true;
                self._inputState[pinNumber] = state.inputs[inputName];
            }
        });

        // If there is a change, make sure to update the breadbaord
        if (anyChanged) {
            this.Update();
        }
    }

    Breadboard.PinFinder = function () {
    }
    // Make sure to use your logic gates with dimensions 50 x 43 pixels
    Breadboard.PinFinder.prototype.FindGpioPin = function(point) {
        // Return a GPIO pin
        // Crucial to make sure that the GPIO is 13 pixels apart
        var factor = ((point.x - 229) / 13); // 13 is the number of pixels between GPIO pin points
                                             // 229 is the distance between left wall and the left edge of the GPIO connector
        if (point.y == 55) { // bottom row (1..39)
            if (point.x >= 229 && point.x <= 543) {
                return Math.round((factor + 1) * 2) - 1;
            } 
        } else if (point.y == 42) { // upper row (2..40)
            if (point.x >= 229 && point.x <= 543) {
                return Math.round((factor + 1) * 2);
            } 
        }
        return null;
    }

    Breadboard.PinFinder.prototype.IsGround = function (point) {    // if it is one of the GND points in the BREADBOARD (not the connector)
        // If it is ground
        if (point.x >= 177 && point.x < 541) {
            if (point.y == 406 || point.y == 159) {
                return true;
            }
        }
        // Or the particular right ground
        if (point.y == 406 && point.x == 593) {
            return true;
        }
        // Or the particular left ground
        if (point.y == 159 && point.x == 112) {
            return true;
        }
        // Otherwise, it's not ground
        return false;
    }

    Breadboard.PinFinder.prototype.IsPower = function (point) {     // if it is one of the POWER points in the BREADBOARD (not the connector)
        // If it is power
        if (point.x >= 177 && point.x < 541) {
            if (point.y == 419 || point.y == 146) {
                return true;
            }
        }
        // Or the particular right power
        if (point.y == 419 && point.x == 593) {
            return true;
        }
        // Or the particular left power
        if (point.y == 146 && point.x == 112) {
            return true;
        }
        // Otherwise, it's not power
        return false;
    }

    // Error message handling: there are no errors found
    Breadboard.prototype.ReportOK = function () {
        $('#ll-breadboard-messages').text(ERROR_MESSAGES['ready']);
    }

    // Error message handling: there is a message found
    Breadboard.prototype.ReportError = function (key) {
        $('#ll-breadboard-messages').text(ERROR_MESSAGES[key]);
    }

    Breadboard.Helper = function(){
        this.gpioCodeType = "g";
        this.literalCodeType = "l";      // May need to expand
        this.gateTypes = {
            "n": "not",
            "a": "and",
            "o": "or"
        };
    }

    Breadboard.Helper.prototype.NeedBuffer = function(code1, code2){
        if(code1.length < 1 || code2.length < 1){
            return;
        }
        if(code1[0] == this.gpioCodeType || code2[0] == this.gpioCodeType){
            return false;
        }
        if(code1[0] == this.literalCodeType || code2[0] == this.literalCodeType){
            return false;
        }
        return true;
    }

    Breadboard.Helper.prototype.ParseGate = function(code, pointPinNum) {
        if(code.length < 1){
            return;
        }
        if(code[0] == this.gpioCodeType){
            return [code, pointPinNum];
        }
        if(code[0] == this.literalCodeType){
            return [code, pointPinNum];
        }
        if(code[0] in this.gateTypes){
            return [this.gateTypes[code[0]], pointPinNum];
        }
        return [null, null];
    }

    Breadboard.NotStatus = function(){
        this.connectedToGround = false;
        this.connectedToPower = false;
        // this.originalGate = originalGate;

        this.gate1 = {
            "input": null,
            "output" : []
        };

        this.gate2 = {
            "input": null,
            "output" : []
        };

        this.gate3 = {
            "input": null,
            "output" : []
        };

        this.gate4 = {
            "input": null,
            "output" : []
        };

        this.gate5 = {
            "input": null,
            "output" : []
        };

        this.gate6 = {
            "input": null,
            "output" : []
        };

        this.gates = [this.gate1, this.gate2, this.gate3, this.gate4, this.gate5, this.gate6];
    }

    Breadboard.NotStatus.prototype.connectInput = function(inputPoint, whichGate){
        this.gates[whichGate]["input"] = inputPoint;
    }

    Breadboard.NotStatus.prototype.connectOutput = function(outputPoint, whichGate){
        this.gates[whichGate-1]["output"] = outputPoint;
    }

    Breadboard.NotStatus.prototype.buildProtocolBlocks = function() {
        // if(!this.connectedToGround){
        //     return [];
        // }
        // if(!this.connectedToPower){
        //     return [];
        // }

        var messages = [];
        $.each(this.gates, function(position, gate){
            if(gate["output"].length < 1){
                return;
            }
            if(gate["input"] == null){
                return; // TODO: will change later
            }
            messages.push("n"+gate["input"]+gate["output"]);
        });
        return messages;
    }

    Breadboard.AndStatus = function(){
        this.connectedToGround = false;
        this.connectedToPower = false;
        // this.originalGate = originalGate;

        this.gate1 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gate2 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gate3 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gate4 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gates = [this.gate1, this.gate2, this.gate3, this.gate4];
    }

    Breadboard.AndStatus.prototype.connectInput = function(inputPoint, whichGate, whichInput){
        this.gates[whichGate-1]["input"+whichInput.toString()] = inputPoint;
    }

    Breadboard.AndStatus.prototype.connectOutput = function(outputPoint, whichGate){
        this.gates[whichGate-1]["output"] = outputPoint;
    }

    Breadboard.AndStatus.prototype.buildProtocolBlocks = function() {
        // if(!this.connectedToGround){
        //     return [];
        // }
        // if(!this.connectedToPower){
        //     return [];
        // }

        var messages = [];
        $.each(this.gates, function(position, gate){
            if(gate["output"].length < 1){
                return;
            }
            if(gate["input1"] == null || gate["input2"] == null){
                return; // TODO: will change later
            }
            messages.push("a"+gate["input1"]+gate["input2"]+gate["output"]);
        });
        return messages;
    }

    Breadboard.OrStatus = function(){
        this.connectedToGround = false;
        this.connectedToPower = false;
        // this.originalGate = originalGate;

        this.gate1 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gate2 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gate3 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gate4 = {
            "input1": null,
            "input2": null,
            "output": []
        };

        this.gates = [this.gate1, this.gate2, this.gate3, this.gate4];
    }

    Breadboard.OrStatus.prototype.connectInput = function(inputPoint, whichGate, whichInput){
        this.gates[whichGate-1]["input"+whichInput.toString()] = inputPoint;
    }

    Breadboard.OrStatus.prototype.connectOutput = function(outputPoint, whichGate){
        this.gates[whichGate-1]["output"] = outputPoint;
    }

    Breadboard.OrStatus.prototype.buildProtocolBlocks = function() {
        // if(!this.connectedToGround){
        //     return [];
        // }
        // if(!this.connectedToPower){
        //     return [];
        // }

        var messages = [];
        $.each(this.gates, function(position, gate){
            if(gate["output"].length < 1){
                return;
            }
            if(gate["input1"] == null || gate["input2"] == null){
                return; // TODO: will change later
            }
            messages.push("o"+gate["input1"]+gate["input2"]+gate["output"]);
        });
        return messages;
    }

    // Big function in the javascript code, used to update the entirely of the breadboard layout
    Breadboard.prototype.Update = function() {
        // Initialize self variables used for checking throughout the update process
        console.log("Updating...");
        var myString = this.CalculateWiringProtocolMessage();
        // console.log(myString);
        return myString;
    }

    Breadboard.prototype.CalculateWiringProtocolMessage = function(){
        // Run through different wires
        var finder = new Breadboard.PinFinder();
        var helper = new Breadboard.Helper();
        var notStatus = new Breadboard.NotStatus();
        var andStatus = new Breadboard.AndStatus();
        var orStatus = new Breadboard.OrStatus();
        var componentStatus = [];
        var errors = [];
        var wires = this._breadboard._wires;
        var bufferCounter = 0;

        var _notGate = this._notGate;
        componentStatus.push(notStatus);
        var _andGate = this._andGate;
        componentStatus.push(andStatus);
        var _orGate = this._orGate;
        componentStatus.push(orStatus);
        // console.log(_notGate);
        console.log(componentStatus);
        for (var i = this._originalNumberOfWires; i < wires.length; i++) {
            // Sweep through the different wires
            var wire = wires[i];
            var point1 = wire._start;
            var point2 = wire._end;

            // check if point1 is a virtual output or a virtual input
            var point1IsOutput = null;
            // check input:
            // - check if output of FPGA, inputs to logic gate
            var gpioPin = finder.FindGpioPin(point1);
            var isVirtualInput = INPUTS_BY_PIN[gpioPin] !== undefined;
            var point1Code = "";
            if(isVirtualInput){
                point1IsOutput = false;
                point1Code = "g" + gpioPin.toString();
            }
            var notPinInput = [false, -1]; // if in gate, gate location
            $.each(_notGate, function(pos, gate){
                notPinInput = gate.CheckIfInput(point1);
                if(notPinInput[0]){
                    return false;
                }
            });
            var inputPoint1GateNum = -1;
            var inputPoint1InputNum = 1;
            if(notPinInput[0]){
                point1IsOutput = false;
                inputPoint1GateNum = notPinInput[1];
                point1Code = "n";
            }
            var andPinInput = [false, -1, -1]; // if in gate, gate location, input num
            $.each(_andGate, function(pos, gate){
                andPinInput = gate.CheckIfInput(point1);
                if(andPinInput[0]){
                    return false;
                }
            });
            if(andPinInput[0]){
                point1IsOutput = false;
                inputPoint1GateNum = andPinInput[1];
                inputPoint1InputNum = andPinInput[2];
                point1Code = "a";
            }
            var orPinInput = [false, -1, -1]; // if in gate, gate location, input num
            $.each(_orGate, function(pos, gate){
                orPinInput = gate.CheckIfInput(point1);
                if(orPinInput[0]){
                    return false;
                }
            });
            if(orPinInput[0]){
                point1IsOutput = false;
                inputPoint1GateNum = orPinInput[1];
                inputPoint1InputNum = orPinInput[2];
                point1Code = "o";
            }

            // check output:
            // - check if output of switch, or Power or GND, or output of a logic gate, or output of GPIO
            if(finder.IsPower(point1)){
                point1IsOutput = true;
                point1Code = "lT";
            }
            else if(finder.IsGround(point1)){
                point1IsOutput = true;
                point1Code = "lF";
            }
            var isVirtualOutput = OUTPUTS_BY_PIN[gpioPin] !== undefined;
            if(isVirtualOutput){
                point1IsOutput = true;
                point1Code = "g" + gpioPin.toString();
            }
            var notPinOutput = [false, -1]; // if in gate, gate num
            $.each(_notGate, function(pos, gate){
                notPinOutput = gate.CheckIfOutput(point1);
                if(notPinOutput[0]){
                    return false;
                }
            });
            var outputPoint1GateNum = -1;
            if(notPinOutput[0]){
                point1IsOutput = true;
                outputPoint1GateNum = notPinOutput[1];
                point1Code = "n";
            }
            var andPinOutput = [false, -1]; // if in gate, gate num
            $.each(_andGate, function(pos, gate){
                andPinOutput = gate.CheckIfOutput(point1);
                if(andPinOutput[0]){
                    return false;
                }
            });
            if(andPinOutput[0]){
                point1IsOutput = true;
                outputPoint1GateNum = andPinOutput[1];
                point1Code = "a";
            }
            var orPinOutput = [false, -1]; // if in gate, gate num
            $.each(_orGate, function(pos, gate){
                orPinOutput = gate.CheckIfOutput(point1);
                if(orPinOutput[0]){
                    return false;
                }
            });
            if(orPinOutput[0]){
                point1IsOutput = true;
                outputPoint1GateNum = orPinOutput[1];
                point1Code = "o";
            }

            // check if point2 is a virtual output or a virtual input
            var point2IsOutput = null;
            var point2Code = "";
            // check input:
            // - check if output of FPGA, inputs to logic gate
            gpioPin = finder.FindGpioPin(point2);
            isVirtualInput = INPUTS_BY_PIN[gpioPin] !== undefined;
            if(isVirtualInput){
                point2IsOutput = false;
                point2Code = "g" + gpioPin.toString();
            }
            $.each(_notGate, function(pos, gate){
                notPinInput = gate.CheckIfInput(point2);
                if(notPinInput[0]){
                    return false;
                }
            });
            var inputPoint2GateNum = -1;
            var inputPoint2InputNum = 1;
            if(notPinInput[0]){
                point2IsOutput = false;
                inputPoint2GateNum = notPinInput[1];
                point2Code = "n";
            }
            $.each(_andGate, function(pos, gate){
                andPinInput = gate.CheckIfInput(point2);
                if(andPinInput[0]){
                    return false;
                }
            });
            if(andPinInput[0]){
                point2IsOutput = false;
                inputPoint2GateNum = andPinInput[1];
                inputPoint2InputNum = andPinInput[2];
                point2Code = "a";
            }
            $.each(_orGate, function(pos, gate){
                orPinInput = gate.CheckIfInput(point2);
                if(orPinInput[0]){
                    return false;
                }
            });
            if(orPinInput[0]){
                point2IsOutput = false;
                inputPoint2GateNum = orPinInput[1];
                inputPoint2InputNum = orPinInput[2];
                point2Code = "o";
            }

            // check output:
            // - check if output of switch, or Power or GND, or output of a logic gate, or output of GPIO
            if(finder.IsPower(point2)){
                point2IsOutput = true;
                point2Code = "lT";
            }
            else if(finder.IsGround(point2)){
                point2IsOutput = true;
                point2Code = "lF";
            }
            isVirtualOutput = OUTPUTS_BY_PIN[gpioPin] !== undefined;
            if(isVirtualOutput){
                point2IsOutput = true;
                point2Code = "g" + gpioPin.toString();
            }
            $.each(_notGate, function(pos, gate){
                notPinOutput = gate.CheckIfOutput(point2);
                if(notPinOutput[0]){
                    return false;
                }
            });
            var outputPoint2GateNum = -1;
            if(notPinOutput[0]){
                point2IsOutput = true;
                outputPoint2GateNum = notPinOutput[1];
                point2Code = "n";
            }
            $.each(_andGate, function(pos, gate){
                andPinOutput = gate.CheckIfOutput(point2);
                if(andPinOutput[0]){
                    return false;
                }
            });
            if(andPinOutput[0]){
                point2IsOutput = true;
                outputPoint1GateNum = andPinOutput[1];
                point2Code = "a";
            }
            $.each(_orGate, function(pos, gate){
                orPinOutput = gate.CheckIfOutput(point2);
                if(orPinOutput[0]){
                    return false;
                }
            });
            if(orPinOutput[0]){
                point2IsOutput = true;
                outputPoint1GateNum = orPinOutput[1];
                point2Code = "o";
            }

            var inputPoint;
            var inputPointPinNum;
            var outputPoint;
            var outputPointPinNum;
            var newPoint1Code;
            var newPoint2Code;
            var point1InputNum;
            var point2InputNum;
            if(point1IsOutput == null || point2IsOutput == null){
                errors.push("Error");
                console.log("Both are null error");
                return;
            }

            if(!point1IsOutput && point2IsOutput){
                // virtual input connection to virtual output -> VALID
                inputPoint = point1;
                inputPointPinNum = inputPoint1GateNum;
                newPoint1Code = point1Code;
                outputPoint = point2;
                outputPointPinNum = outputPoint2GateNum;
                newPoint2Code = point2Code;
                point1InputNum = inputPoint1InputNum;
                point2InputNum = inputPoint2InputNum;
            }
            else if(point1IsOutput && !point2IsOutput){
                // virtual input connection to virtual output -> VALID
                inputPoint = point2;
                inputPointPinNum = inputPoint2GateNum;
                newPoint1Code = point2Code;
                outputPoint = point1;
                outputPointPinNum = outputPoint1GateNum;
                newPoint2Code = point1Code;
                point1InputNum = inputPoint2InputNum;
                point2InputNum = inputPoint1InputNum;
            }
            else if(!point1IsOutput && !point2IsOutput){
                // both are inputs. For now, we will return error
                errors.push("Error");
                console.log("Both are inputs error");
                return;
            }
            else{
                // both are outputs. Also error
                errors.push("Error");
                console.log("Both are outputs error");
                return;
            }

            // point1Code: g17, T, F, n
            // inputPointPinNum = gate number (only if point1Code is n)
            // outputPointPinNum = gate number (only if point1Code is n)

            // Check if needs buffer
            var needsBuffer = helper.NeedBuffer(newPoint1Code, newPoint2Code);
            if(needsBuffer){
                var whatGate = helper.ParseGate(newPoint1Code, inputPointPinNum);
                if(whatGate[0] != null){
                    if(whatGate[0] == "not"){
                        notStatus.connectInput("b"+bufferCounter, whatGate[1]);
                    }
                    else if(whatGate[0] == "and"){
                        andStatus.connectInput("b"+bufferCounter, whatGate[1], point1InputNum);
                    }
                    else if(whatGate[0] == "or"){
                        orStatus.connectInput("b"+bufferCounter, whatGate[1], point1InputNum);
                    }
                }
                whatGate = helper.ParseGate(newPoint2Code, outputPointPinNum);
                if(whatGate[0] != null){
                    if(whatGate[0] == "not"){
                        notStatus.connectOutput("b"+bufferCounter, whatGate[1]);
                    }
                    else if(whatGate[0] == "and"){
                        andStatus.connectOutput("b"+bufferCounter, whatGate[1]);
                    }
                    else if(whatGate[0] == "or"){
                        orStatus.connectOutput("b"+bufferCounter, whatGate[1]);
                    }
                }
                bufferCounter += 1;
            }
            else{
                // Don't need the buffer
                var whatGate = helper.ParseGate(newPoint1Code, inputPointPinNum);
                // console.log(whatGate);
                if(whatGate[0] != null){
                    if(whatGate[0] == "not"){
                        notStatus.connectInput(newPoint2Code, whatGate[1]);
                    }
                    else if(whatGate[0] == "and"){
                        andStatus.connectInput(newPoint2Code, whatGate[1], point1InputNum);
                    }
                    else if(whatGate[0] == "or"){
                        orStatus.connectInput(newPoint2Code, whatGate[1], point1InputNum);
                    }
                }
                
                whatGate = helper.ParseGate(newPoint2Code, outputPointPinNum);
                // console.log(whatGate);
                if(whatGate[0] != null){
                    if(whatGate[0] == "not"){
                        notStatus.connectOutput(newPoint1Code, whatGate[1]);
                    }
                    else if(whatGate[0] == "and"){
                        andStatus.connectOutput(newPoint1Code, whatGate[1]);
                    }
                    else if(whatGate[0] == "or"){
                        orStatus.connectOutput(newPoint1Code, whatGate[1]);
                    }
                }
            }

        }

        if(errors.length > 0){
            return "ErrorHelloWorld";
        }
        var messages = [];
        $.each(componentStatus, function(pos, particularComponentStatus){
            var currentMessages = particularComponentStatus.buildProtocolBlocks();
            for(var i = 0; i < currentMessages.length; i++){
                var currentMessage = currentMessages[i];
                if(!messages.includes(currentMessage)){
                    messages.push(currentMessage);
                } 
            }
        });
        var wiringProtocolMessage = messages.join(";");
        return wiringProtocolMessage;

    }

    // Breadboard function to change the output of the GPIO pin
    Breadboard.prototype._ChangeOutput = function(pinNumber, value) {
        var pinNumber = parseInt(pinNumber);
        if (this._outputState[pinNumber] === value) {
            // No new data, no need to push data
            return;
        }
        var data = {'value': value};
        var identifier = OUTPUTS_BY_PIN[pinNumber];
        this._outputState[pinNumber] = value;

        // Potentially used to communicate via post method with flask
        if (this._enableNetwork) {
            $.ajax({
                type: "POST",
                url: this._endpointBase + 'switches/' + identifier,
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(data) {
                    console.log("Changed.");
                },
                error: function(errMsg) {
                    console.log("Failed.");
                }
            });
        }
    }

    // The defintion of each component in the function, called in the template.html to initialize the breadboard
    Breadboard.Component = function (identifier, leftPosition, topPosition, image1, image2, zIndex) {
        this._breadboard = null;
        this._identifier = identifier;
        this._leftPosition = parseInt(leftPosition);
        this._topPosition = parseInt(topPosition);
        // grab a new <div> to put on the webpage
        this._$elem = $("<div id='" + identifier + "'></div>");
        this._$elem.addClass("component");
        this._$elem.css({'left': parseInt(leftPosition) + 'px', 'top': parseInt(topPosition) + 'px'});
        // Link the CSS file to the appropraite div
        if (zIndex !== undefined) {
            this._$elem.css({'z-index': 0});
        }
        // Add in the appropriate images to the breadboard
        this._$elem.append($("<img class='active image1' src='" + image1 + "' draggable='false'>"));
        if (image2) {
            this._$elem.append($("<img class='image2' src='" + image2 + "' draggable='false'>"));
        }
    }

    Breadboard.Component.prototype.SetBreadboard = function(breadboard) {
        this._breadboard = breadboard;
    }

    // The switch objects in the breadboard
    Breadboard.Switch = function (identifier, imageBase, leftPosition, topPosition) {
        var self = this;
        // Obtain the two images for the switches from the static folder
        var image1 = imageBase + "switch-left-small.jpg";
        var image2 = imageBase + "switch-right-small.jpg";

        Breadboard.Component.call(this, identifier, leftPosition, topPosition, image1, image2);

        // Link appropriate css that makes the mouse become a pointer
        this._$elem.css({'cursor': 'pointer'});

        this._value = false;
        this._$elem.find('img').click(function () {
            self._Change();
        });
    };

    Breadboard.Switch.prototype = Object.create(Breadboard.Component.prototype);

    // change the output state of the switch, triggered upon each user click
    Breadboard.Switch.prototype._Change = function () {
        this._value = !this._value;

        // swap between the two different images
        var $inactiveElement = this._$elem.find('img:not(.active)');
        var $activeElement = this._$elem.find('img.active');

        // set the other one as inactive
        $inactiveElement.addClass('active');
        $activeElement.removeClass('active');

        // Make sure that the breadboard recognizes this change by updating the breadboard state
        if (this._breadboard !== null) {
            this._breadboard.Update();
        }
    };

    // The getter function that returns the current state value of the switch
    Breadboard.Switch.prototype.GetValue = function() {
        return this._value;
    }

    // The getter function that obtains the x value coordinates of where the wire should be
    Breadboard.Switch.prototype.GetWireX = function () {
        return this._leftPosition + 20;
    }

    // The getter function that obtains the y value coordinates of where the wire should be
    Breadboard.Switch.prototype.GetWireYBase = function () {
        if (this._topPosition > 300) 
            return 302;
        else
            return 211;
    }
    
    // The or gate functionality of the breadboard
    Breadboard.OrGate = function(identifier, imageBase, leftPosition, topPosition){
        var self = this;

        // Obtain the or gate image from the static folder to be placed on the breadbaord
        var image1 = imageBase + "or_gate.png";
        Breadboard.Component.call(this, identifier, leftPosition, topPosition, image1);

        // Array that stores each of the 7 pin locations of the logic gate
        this._pin_location = [
            leftPosition + 7,
            leftPosition + 20,
            leftPosition + 33,
            leftPosition + 46,
            leftPosition + 59,
            leftPosition + 72,
            leftPosition + 85
        ];
    
        // Array value that stores the states of each pin of the or gate
        this._array_value = [
            false,
            false,
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        ];

        this._protocol = [
            null, null,
            null, null,
            null, null,
            null, null,
            null, null,
            null, null
        ];
    }

    Breadboard.OrGate.prototype = Object.create(Breadboard.Component.prototype);

    // the getter function that obtains the state value for each pin
    Breadboard.OrGate.prototype.GetValue = function(pin){
        return this._array_value[pin];
    }

    // the getter function that obtains the pin location for each pin
    Breadboard.OrGate.prototype.GetPinLocation = function () {
        return this._pin_location;
    }

    // the setter function that sets the input and output pin states for the or gate
    Breadboard.OrGate.prototype.SetValue = function(pin, value){
        // pin 1 and pin 2 are the inputs for pin 3
        if(pin === 1 || pin === 2){
            this._array_value[pin - 1] = value;
            this._array_value[2] = this._array_value[0] || this._array_value[1];
        }
        // pin 4 and pin 5 are the inputs for pin 6
        else if(pin === 4 || pin === 5){
            this._array_value[pin - 1] = value;
            this._array_value[5] = this._array_value[3] || this._array_value[4];
        }
        // pins 9 and pins 10 are the inputs for pin 8
        else if(pin === 10 || pin === 9){
            this._array_value[pin - 1] = value;
            this._array_value[7] = this._array_value[8] || this._array_value[9];
        }
        // pins 12 and pins 13 are the inputs for pin 11
        else if(pin === 12 || pin === 13){
            this._array_value[pin - 1] = value;
            this._array_value[10] = this._array_value[11] || this._array_value[12];
        }
        // otherwise, it has to be a vcc or gnd pin
        else{
            this._array_value[pin - 1] = value;
        }
    }

    Breadboard.OrGate.prototype.CheckIfInput = function(pin){
        // top half
        if(pin.y < this._topPosition && pin.y > 159){
            for(var i = 1; i < this._pin_location.length; i++){
                if(pin.x === this._pin_location[i]){
                    if(i != 3 && i != 6){
                        return [true, i < 3 ? 3 : 4, i < 3 ? i - 3 : i];
                    }
                }
            }
            return [false, -1, -1];
        }
        // bottom half
        else if(pin.y >= this._topPosition && pin.y < 406) {
            for(var i = 0; i < this._pin_location.length - 1; i++){
                if(pin.x === this._pin_location[i]){
                    if(i != 2 && i != 5){
                        return [true, i < 2 ? 1 : 2, i < 2 ? i + 1 : i - 2];
                    }
                }
            }
            return [false, -1, -1];

        }
        return [false, -1, -1];
    }

    Breadboard.OrGate.prototype.CheckIfOutput = function(pin){
        // top half
        if(pin.y < this._topPosition && pin.y > 159){
            if(pin.x === this._pin_location[3]){
                return [true, 3];
            }
            else if(pin.x === this._pin_location[6]){
                return [true, 4]
            }
            return [false, -1];
        }
        // bottom half
        else if(pin.y >= this._topPosition && pin.y < 406) {
            if(pin.x === this._pin_location[2]){
                return [true, 1];
            }
            else if(pin.x === this._pin_location[5]){
                return [true, 2];
            }
            return [false, -1];

        }
        return [false, -1];
    }
    // ***********************************************************************************
    // The and gate functionality of the breadboard
    Breadboard.AndGate = function(identifier, imageBase, leftPosition, topPosition) {
        var self = this;

        // Obtain the or gate image from the static folder to be placed on the breadbaord
        var image1 = imageBase + "and_gate.png";
        Breadboard.Component.call(this, identifier, leftPosition, topPosition, image1);
        
        // Array that stores each of the 7 pin locations of the logic gate
        this._pin_location = [
            leftPosition + 7,
            leftPosition + 20,
            leftPosition + 33,
            leftPosition + 46,
            leftPosition + 59,
            leftPosition + 72,
            leftPosition + 85
        ];

        // Array value that stores the states of each pin of the logic gate
        this._array_value = [
            false,
            false,
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        ];

        this._protocol = [
            null, null,
            null, null,
            null, null,
            null, null,
            null, null,
            null, null
        ];
    }

    Breadboard.AndGate.prototype = Object.create(Breadboard.Component.prototype);

    // the getter function that obtains the state value for each pin
    Breadboard.AndGate.prototype.GetValue = function(pin){
        return this._array_value[pin];
    }

    // the getter function that obtains the pin location for each pin
    Breadboard.AndGate.prototype.GetPinLocation = function () {
        return this._pin_location;
    }

    // the setter function that sets the input and output pin states for the and gate
    Breadboard.AndGate.prototype.SetValue = function(pin, value){
        // pin 1 and pin 2 are the inputs for pin 3
        if(pin === 1 || pin === 2){
            this._array_value[pin - 1] = value;
            this._array_value[2] = this._array_value[0] && this._array_value[1];
        }
        // pin 4 and pin 5 are the inputs for pin 6
        else if(pin === 4 || pin === 5){
            this._array_value[pin - 1] = value;
            this._array_value[5] = this._array_value[3] && this._array_value[4];
        }
        // pins 9 and pins 10 are the inputs for pin 8
        else if(pin === 10 || pin === 9){
            this._array_value[pin - 1] = value;
            this._array_value[7] = this._array_value[8] && this._array_value[9];
        }
        // pins 12 and pins 13 are the inputs for pin 11
        else if(pin === 12 || pin === 13){
            this._array_value[pin - 1] = value;
            this._array_value[10] = this._array_value[11] && this._array_value[12];
        }
        // otherwise, it has to be a vcc or gnd pin
        else{
            this._array_value[pin - 1] = value;
        }
    }

    Breadboard.AndGate.prototype.CheckIfInput = function(pin){
        // top half
        if(pin.y < this._topPosition && pin.y > 159){
            for(var i = 1; i < this._pin_location.length; i++){
                if(pin.x === this._pin_location[i]){
                    if(i != 3 && i != 6){
                        return [true, i < 3 ? 3 : 4, i < 3 ? i - 3 : i];
                    }
                }
            }
            return [false, -1, -1];
        }
        // bottom half
        else if(pin.y >= this._topPosition && pin.y < 406) {
            for(var i = 0; i < this._pin_location.length - 1; i++){
                if(pin.x === this._pin_location[i]){
                    if(i != 2 && i != 5){
                        return [true, i < 2 ? 1 : 2, i < 2 ? i + 1 : i - 2];
                    }
                }
            }
            return [false, -1, -1];

        }
        return [false, -1, -1];
    }

    Breadboard.AndGate.prototype.CheckIfOutput = function(pin){
        // top half
        if(pin.y < this._topPosition && pin.y > 159){
            if(pin.x === this._pin_location[3]){
                return [true, 3];
            }
            else if(pin.x === this._pin_location[6]){
                return [true, 4]
            }
            return [false, -1];
        }
        // bottom half
        else if(pin.y >= this._topPosition && pin.y < 406) {
            if(pin.x === this._pin_location[2]){
                return [true, 1];
            }
            else if(pin.x === this._pin_location[5]){
                return [true, 2];
            }
            return [false, -1];

        }
        return [false, -1];
    }
    // ***************************************************************************************************************************
    // The and gate functionality of the breadboard
    Breadboard.NotGate = function(identifier, imageBase, leftPosition, topPosition) {
        var self = this;
        // Obtain the or gate image from the static folder to be placed on the breadbaord
        var image1 = imageBase + "not_gate.png";

        Breadboard.Component.call(this, identifier, leftPosition, topPosition, image1);
        
        // Array that stores each of the 7 pin locations of the logic gate
        this._pin_location = [
            leftPosition + 7,
            leftPosition + 20,
            leftPosition + 33,
            leftPosition + 46,
            leftPosition + 59,
            leftPosition + 72,
            leftPosition + 85
        ];

        // Array value that stores the states of each pin of the logic gate
        this._array_value = [
            false,
            true,
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        ];

        this._protocol = [
            null, null,
            null, null,
            null, null,
            null, null,
            null, null,
            null, null
        ];
    }

    Breadboard.NotGate.prototype = Object.create(Breadboard.Component.prototype);

    // the setter function that sets the input and output pin states for the and gate
    Breadboard.NotGate.prototype.SetValue = function(pin, value){
        // this is the bottom half pins on the not gate
        if(pin === 1 || pin === 3 || pin === 5){
            this._array_value[pin - 1] = value;
            this._array_value[pin] = !value;
        }
        // this is the top half pins on the not gate
        else if(pin === 9 || pin === 11 || pin === 13){
            this._array_value[pin - 1] = value;
            this._array_value[pin - 2] = !value;
        }
        // otherwise, it has to be a vcc or gnd pin
        else{
            this._array_value[pin - 1] = value;
        }
    }

    // the getter function that obtains the state value for each pin
    Breadboard.NotGate.prototype.GetValue = function(pin){
        return this._array_value[pin];
    }

    // the getter function that obtains the pin location for each pin
    Breadboard.NotGate.prototype.GetPinLocation = function () {
        return this._pin_location;
    }

    Breadboard.NotGate.prototype.CheckIfInput = function(pin){
        // top half
        if(pin.y < this._topPosition && pin.y > 159){
            // 9, 11, 13
            for(var i = 1; i < this._pin_location.length; i++){
                if(pin.x === this._pin_location[i] && (i % 2 != 0)){
                    return [true, Math.floor(i/2)+1];
                }
            }
            return [false, -1];
        }
        // bottom half
        else if(pin.y >= this._topPosition && pin.y < 406) {
            // 0, 2, 4
            for(var i = 0; i < this._pin_location.length - 1; i++){
                if(pin.x === this._pin_location[i] && (i % 2 == 0)){
                    return [true, i/2];
                }
            }
            return [false, -1];
        }
        return [false, -1];
    }

    Breadboard.NotGate.prototype.CheckIfOutput = function(pin){
        // top half
        if(pin.y < this._topPosition && pin.y > 159){
            // 8, 10, 12
            for(var i = 1; i < this._pin_location.length; i++){
                if(pin.x === this._pin_location[i] && (i % 2 == 0)){
                    return [true, i/2];
                }
            }
            return [false, -1];
        }
        // bottom half
        else if(pin.y >= this._topPosition && pin.y < 406) {
            for(var i = 0; i < this._pin_location.length - 1; i++){
                // 1, 3, 5
                if(pin.x === this._pin_location[i] && (i % 2 != 0)){
                    return [true, Math.floor(i/2)+1];
                }
            }
            return [false, -1];
        }
        return [false, -1];
    }
    // ***************************************************************************************************************************

    // All potential error messages that a user may experience
    var ERROR_MESSAGES = {
        "no-gpio": "Error: Every wire must be connected to one GPIO",
        "two-gpio": "Error: Every wire can only be connected to one GPIO",
        "gpio-not-supported": "Error: That GPIO pin is not supported",
        "gpio-already-used": "Error: That GPIO is used by two wires",
        "input-not-led": "Error: Input GPIO's must be connected to LED's",
        "output-not-switch-gnd": "Error: Output GPIO's must be connected to switches or power supply",
        "ready": "Ready"
    };

    // These are the hardcoded wires and values onto the breadbaord
    function getOriginalWires(numberOfSwitches) {
        var originalWires = ("<circuit>" +
        "   <circuitlist>" +
        "      <component>W 16711680 156 143 190 142 221 143</component>" +
        "      <component>W 0 156 156 188 155 221 156</component>" +
        "      <component>W 16711680 637 416 613 414 585 416</component>" +
        "      <component>W 0 585 403 611 402 637 403</component>" +
        "      <component>W 0 156 156 275 -43.171875 338 39</component>");

        var switchWires = [ 
            ("     <component>W 16711680 234 351 235 387 234 416</component>" +
            "      <component>W 0 208 351 216 381 221 403</component>"),

            ("     <component>W 16711680 273 351 274 386 273 416</component>" +
            "      <component>W 0 247 351 248 378 247 403</component>"),

            ("     <component>W 16711680 312 351 312 386 312 416</component>" +
            "      <component>W 0 286 351 292 378 299 403</component>"),

            ("     <component>W 16711680 351 351 351 383 351 416</component>" +
            "      <component>W 0 325 351 325 377 325 403</component>"),

            ("     <component>W 16711680 390 351 392 389 390 416</component>" +
            "      <component>W 0 364 351 370 377 377 403</component>"),

            ("     <component>W 16711680 429 351 430 385 429 416</component>" +
            "      <component>W 0 403 351 404 376 403 403</component>"),

            ("     <component>W 16711680 468 351 469 389 468 416</component>" +
            "      <component>W 0 442 351 449 378 455 403</component>"),

            ("     <component>W 16711680 507 351 508 385 507 416</component>" +
            "      <component>W 0 481 351 481 376 481 403</component>"),

            ("     <component>W 16711680 546 351 548 386 546 416</component>" +
            "      <component>W 0 520 351 530 381 533 403</component>"),

            ("     <component>W 16711680 585 351 580 379 572 416</component>" +
            "      <component>W 0 559 403 560 386 559 351</component>"),

            ("     <component>W 16711680 247 208 246 176 247 143</component>" +
            "      <component>W 0 221 208 229 178 234 156</component>"),

            ("     <component>W 16711680 273 143 280 176 286 208</component>" +
            "      <component>W 0 260 208 262 181 260 156</component>"),

            ("     <component>W 16711680 325 143 326 179 325 208</component>" +
            "      <component>W 0 299 208 300 179 299 156</component>"),

            ("     <component>W 16711680 351 143 358 175 364 208</component>" +
            "      <component>W 0 338 208 340 183 338 156</component>"),

            ("     <component>W 16711680 403 143 404 172 403 208</component>" +
            "      <component>W 0 377 208 378 179 377 156</component>"),

            ("     <component>W 16711680 429 143 438 179 442 208</component>" +
            "      <component>W 0 416 208 416 179 416 156</component>"),

            ("     <component>W 16711680 481 208 481 172 481 143</component>" +
            "      <component>W 0 455 208 455 177 455 156</component>"),

            ("     <component>W 16711680 520 208 526 172 507 143</component>" +
            "      <component>W 0 494 208 495 182 494 156</component>") 
        ];

        // Make sure each switch has those hardcoded values, so that no switch is left unassigned
        for (var i = 0; i < numberOfSwitches; i++) {
            if (i < switchWires.length) {
                originalWires = originalWires + switchWires[i];
            }
        }

        originalWires = originalWires + (
        "   </circuitlist>" +
        "</circuit>");

        return originalWires;
    }

    // Finally, we are done with the breadbaord. We can return it to the html
    return Breadboard;
}();
