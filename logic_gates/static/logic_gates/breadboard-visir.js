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

    // Big function in the javascript code, used to update the entirely of the breadboard layout
    Breadboard.prototype.Update = function() {
        // Initialize self variables used for checking throughout the update process
        console.log("Updating...")
        var self = this;

        var errors = false;
        var wires = this._breadboard._wires;

        var finder = new Breadboard.PinFinder();

        var previousGpioPins = [];

        var processedInputs = [];
        var processedOutputGpios = [];
        this._errors = [];
        this._protocol = [];
        error_array = this._errors;
        not_gates = this._notGate;
        and_gates = this._andGate;
        or_gates = this._orGate;
        // cycle between all new wires that the users have specified
        for (var i = this._originalNumberOfWires; i < wires.length; i++) {
            var wire = wires[i];

            // Each wire must be connected to a GPIO at least. Otherwise, error
            var gpioPin1 = finder.FindGpioPin(wire._start);  
            var gpioPin2 = finder.FindGpioPin(wire._end);
            var gpioPin;
            var otherPoint;

            // var andLProcessed = -1;
            // var orLProcessed = -1;
            
            // This means that the current wire is not connected to a GPIO pin on either end
            if (gpioPin1 === null && gpioPin2 === null) {
                var gate_array = this._notGate;
                var and_array = this._andGate;
                var or_array = this._orGate;
                if(finder.IsPower(wire._start) && finder.IsGround(wire._end)){
                    this._errors.push(1);   //1: short somewhere, check circuit
                    break;
                }
                else if(finder.IsPower(wire._end) && finder.IsGround(wire._start)){
                    this._errors.push(1);   //1: short somewhere, check circuit
                    break;
                }

                // We would now like to check if one of the wires is connected to a logic gate somewhere
                $.each(this._outputs, function (position, output) {
                    var wireX = output.GetWireX();
                    var wireYBase = output.GetWireYBase();
                    
                    var switch_wire;
                    var logic_wire;
                    var correct_switch = false;

                    // We need to check both ends of the wire to see if one of them is a logic gate
                    if(wireX == wire._start.x){
                        switch_wire = wire._start;
                        logic_wire = wire._end;
                        correct_switch = true;
                    }
                    else if(wireX == wire._end.x){
                        switch_wire = wire._end;
                        logic_wire = wire._start;
                        correct_switch = true;
                    }

                    // One end of the wire is connected to one of the switches on the breadbaoard
                    if(correct_switch){
                        if (switch_wire.y >= wireYBase && switch_wire.y <= (wireYBase + 4*VISIR_SQUARE_SIZE)) {
                            // Check the other end of the wire to see if it is on a logic gate
                            $.each(gate_array, function (position, gate) {
                                var wirePositions = gate.GetPinLocation();
                                for(var i = 0; i < wirePositions.length; i++){
                                    if(logic_wire.x === wirePositions[i]){
                                        if(logic_wire.y > gate._topPosition){
                                            // bottom half
                                            gate.SetValue(i+1, output.GetValue());
                                        }
                                        else{
                                            //top half
                                            gate.SetValue(14-i, output.GetValue());
                                        }
                                    }
                                }
                                /****************************************** */
        
                            });
                            // CHeck the other end of the wire to see if it is on an and gate
                            $.each(and_array, function (position, gate) {
                                var wirePositions = gate.GetPinLocation();
                                for(var i = 0; i < wirePositions.length; i++){
                                    if(logic_wire.x === wirePositions[i]){
                                        if(logic_wire.y > gate._topPosition){
                                            // bottom half
                                            gate.SetValue(i+1, output.GetValue());
                                        }
                                        else{
                                            //top half
                                            console.log(14-i);
                                            gate.SetValue(14-i, output.GetValue());
                                        }
                                    }
                                }
                                /****************************************** */
        
                            });
                            // Check the other end of the wire to see if it is on an or gate
                            $.each(or_array, function (position, gate) {
                                var wirePositions = gate.GetPinLocation();
                                for(var i = 0; i < wirePositions.length; i++){
                                    if(logic_wire.x === wirePositions[i]){
                                        if(logic_wire.y > gate._topPosition){
                                            // bottom half
                                            gate.SetValue(i+1, output.GetValue());
                                        }
                                        else{
                                            //top half
                                            gate.SetValue(14-i, output.GetValue());
                                        }
                                    }
                                }
                                /****************************************** */
        
                            });
                        }

                    }

                });

                // Over here, we need to know if the wire is connected to a logic gate and a power rail, chained together
                // First we need to check the not gate
                $.each(this._notGate, function (position, notGate) {
                    var wirePositions =notGate.GetPinLocation();
                    // allow direct pin connections to GND and 3v3
                    
                    for(var i = 0; i < wirePositions.length; i++){
                        if(wire._start.x === wirePositions[i] && wire._start.y > 150 && wire._start.y < 400){
                            //wire._start is a logic wire
                            if(finder.IsPower(wire._end)){
                                if(wire._start.y > notGate._topPosition){
                                    // bottom half
                                    notGate.SetValue(i+1, true);
                                    notGate._protocol[i] = "LT";
                                }
                                else{
                                    //top half
                                    notGate.SetValue(14-i, true);
                                    notGate._protocol[13-i] = "LT";
                                    
                                }
                            }
                            else if(finder.IsGround(wire._end)){
                                if(wire._start.y > notGate._topPosition){
                                    // bottom half
                                    notGate.SetValue(i+1, false);
                                    notGate._protocol[i] = "LF";
                                }
                                else{
                                    //top half
                                    notGate.SetValue(14-i, false);
                                    notGate._protocol[13-i] = "LF";
                                }
                            }
                        }
                        else if(wire._end.x === wirePositions[i] && wire._end.y > 150 && wire._end.y < 400){
                            //wire._end is a logic wire
                            if(finder.IsPower(wire._start)){
                                if(wire._end.y > notGate._topPosition){
                                    // bottom half
                                    notGate.SetValue(i+1, true);
                                    notGate._protocol[i] = "LT";
                                }
                                else{
                                    //top half
                                    notGate.SetValue(14-i, true);
                                    notGate._protocol[13-i] = "LT";
                                }
                            }
                            else if(finder.IsGround(wire._start)){
                                if(wire._end.y > notGate._topPosition){
                                    // bottom half
                                    notGate.SetValue(i+1, false);
                                    notGate._protocol[i] = "LF";
                                }
                                else{
                                    //top half
                                    notGate.SetValue(14-i, false);
                                    notGate._protocol[13-i] = "LF";
                                }
                            }
                        }
                    }
                });
                // Over here, we need to know if the wire is connected to a logic gate and a power rail, chained together
                // Next we need to check the and gate
                $.each(this._andGate, function (position, andGate) {
                    var wirePositions =andGate.GetPinLocation();
                    // allow direct pin connections to GND and 3v3
                    
                    for(let i = 0; i < wirePositions.length; i++){
                        if(wire._start.x === wirePositions[i] && wire._start.y > 150 && wire._start.y < 400){
                            //wire._start is a logic wire
                            if(finder.IsPower(wire._end)){
                                if(wire._start.y > andGate._topPosition){
                                    // bottom half
                                    andGate.SetValue(i+1, true);
                                    andGate._protocol[i] = "LT";
                                    andLProcessed = i;
                                }
                                else{
                                    //top half
                                    andGate.SetValue(14-i, true);
                                    andGate._protocol[13-i] = "LT";
                                    andLProcessed = 13-i;
                                }
                            }
                            else if(finder.IsGround(wire._end)){
                                if(wire._start.y > andGate._topPosition){
                                    // bottom half
                                    andGate.SetValue(i+1, false);
                                    andGate._protocol[i] = "LF";
                                    andLProcessed = i;
                                }
                                else{
                                    //top half
                                    andGate.SetValue(14-i, false);
                                    andGate._protocol[13-i] = "LF";
                                    andLProcessed = 13-i;
                                }
                            }
                        }
                        else if(wire._end.x === wirePositions[i] && wire._end.y > 150 && wire._end.y < 400){
                            //wire._end is a logic wire
                            if(finder.IsPower(wire._start)){
                                if(wire._end.y > andGate._topPosition){
                                    // bottom half
                                    andGate.SetValue(i+1, true);
                                    andGate._protocol[i] = "LT";
                                    andLProcessed = i;
                                }
                                else{
                                    //top half
                                    andGate.SetValue(14-i, true);
                                    andGate._protocol[13-i] = "LT";
                                    andLProcessed = 13-i;
                                }
                            }
                            else if(finder.IsGround(wire._start)){
                                if(wire._end.y > andGate._topPosition){
                                    // bottom half
                                    andGate.SetValue(i+1, false);
                                    andGate._protocol[i] = "LF";
                                    andLProcessed = i;
                                }
                                else{
                                    //top half
                                    andGate.SetValue(14-i, false);
                                    andGate._protocol[13-i] = "LF";
                                    andLProcessed = 13-i;
                                }
                            }
                        }
                    }
                });
                // Over here, we need to know if the wire is connected to a logic gate and a power rail, chained together
                // Finally we need to check the or gate
                $.each(this._orGate, function (position, orGate) {
                    var wirePositions =orGate.GetPinLocation();
                    // allow direct pin connections to GND and 3v3
                    
                    for(let i = 0; i < wirePositions.length; i++){
                        if(wire._start.x === wirePositions[i] && wire._start.y > 150 && wire._start.y < 400){
                            //wire._start is a logic wire
                            if(finder.IsPower(wire._end)){
                                if(wire._start.y > orGate._topPosition){
                                    // bottom half
                                    orGate.SetValue(i+1, true);
                                    orGate._protocol[i] = "LT";
                                }
                                else{
                                    //top half
                                    orGate.SetValue(14-i, true);
                                    orGate._protocol[13-i] = "LT";
                                }
                            }
                            else if(finder.IsGround(wire._end)){
                                if(wire._start.y > orGate._topPosition){
                                    // bottom half
                                    orGate.SetValue(i+1, false);
                                    orGate._protocol[i] = "LF";
                                }
                                else{
                                    //top half
                                    orGate.SetValue(14-i, false);
                                    orGate._protocol[13-i] = "LF";
                                }
                            }
                        }
                        else if(wire._end.x === wirePositions[i] && wire._end.y > 150 && wire._end.y < 400){
                            //wire._end is a logic wire
                            if(finder.IsPower(wire._start)){
                                if(wire._end.y > orGate._topPosition){
                                    // bottom half
                                    orGate.SetValue(i+1, true);
                                    orGate._protocol[i] = "LT";
                                }
                                else{
                                    //top half
                                    orGate.SetValue(14-i, true);
                                    orGate._protocol[13-i] = "LT";
                                }
                            }
                            else if(finder.IsGround(wire._start)){
                                if(wire._end.y > orGate._topPosition){
                                    // bottom half
                                    orGate.SetValue(i+1, false);
                                    orGate._protocol[i] = "LF";
                                }
                                else{
                                    //top half
                                    orGate.SetValue(14-i, false);
                                    orGate._protocol[13-i] = "LF";
                                }
                            }
                        }
                    }
                });
                /******************************************************** */
                //Check not gate with others to see if there are multiple logic gates chained together
                // First, sweep through the not gate
                $.each(this._notGate, function(position, gate){

                    // obtain the pin locations for the not gate
                    var wirePositions = gate.GetPinLocation();
                    // sweep through each pin position
                    for(var i = 0; i < wirePositions.length; i++){
                        if(wire._start.x === wirePositions[i]){
                            //wire._start is a logic wire
                            $.each(and_gates, function(position, andGate){
                                var wirePositionsAnd = andGate.GetPinLocation();
                                // check to see if the output pin is the same as the input pin for an and gate
                                for(var j = 0; j < wirePositionsAnd.length; j++){
                                    if(wire._end.x === wirePositionsAnd[j]){
                                        if(wire._start.y > gate._topPosition){
                                            // bottom half
                                            if(wire._end.y > andGate._topPosition){
                                                gate.SetValue(i+1, andGate._array_value[j]);

                                            }
                                            else{
                                                gate.SetValue(i+1, andGate._array_value[13 - j]);

                                            }
                                            
                                        }
                                        else{
                                            //top half
                                            if(wire._end.y > andGate._topPosition){
                                                gate.SetValue(14-i, andGate._array_value[j]);
                                            }
                                            else{
                                                gate.SetValue(14-i, andGate._array_value[13 - j]);
                                            }
                                            
                                        }
                                    }
                                    
                                }
                            });
                            // Next, we need to check if the not gate is connected with an or gate
                            $.each(or_gates, function(position, orGate){
                                var wirePositionsOr = orGate.GetPinLocation();
                                // check to see if the output pin is the same as the input pin for an or gate
                                for(var j = 0; j < wirePositionsOr.length; j++){
                                    if(wire._end.x === wirePositionsOr[j]){
                                        if(wire._start.y > gate._topPosition){
                                            // bottom half
                                            if(wire._end.y > orGate._topPosition){
                                                gate.SetValue(i+1, orGate._array_value[j]);

                                            }
                                            else{
                                                gate.SetValue(i+1, orGate._array_value[13 - j]);

                                            }
                                        }
                                        else{
                                            //top half
                                            if(wire._end.y > orGate._topPosition){
                                                gate.SetValue(14-i, orGate._array_value[j]);

                                            }
                                            else{
                                                gate.SetValue(14-i, orGate._array_value[13 - j]);

                                            }
                                        }
                                    }
                                    
                                }
                            });
                        }
                        // Now, we know that it the other end of the wire that is connected to the input gate
                        else if(wire._end.x === wirePositions[i]){
                            // Sweep through an and gate to see if it is connected with a not gate
                            $.each(and_gates, function(position, andGate){
                                var wirePositionsAnd = andGate.GetPinLocation();
                                // sweep through each location of the pins, check if they match
                                for(var j = 0; j < wirePositionsAnd.length; j++){
                                    if(wire._start.x === wirePositionsAnd[j]){
                                        if(wire._end.y > gate._topPosition){
                                            // bottom half
                                            if(wire._start.y > andGate._topPosition){
                                                gate.SetValue(i+1, andGate._array_value[j]);

                                            }
                                            else{
                                                gate.SetValue(i+1, andGate._array_value[13 - j]);
                                            }
                                            
                                        }
                                        else{
                                            //top half
                                            if(wire._start.y > andGate._topPosition){
                                                gate.SetValue(14-i, andGate._array_value[j]);

                                            }
                                            else{
                                                gate.SetValue(14-i, andGate._array_value[13 - j]);
                                            }
                                            
                                        }
                                    }
                                    
                                }
                            });
                            $.each(or_gates, function(position, orGate){
                                // Sweep through an and gate to see if it is connected with a not gate
                                var wirePositionsOr = orGate.GetPinLocation();
                                for(var j = 0; j < wirePositionsOr.length; j++){
                                    // sweep through each location of the pins, check if they match
                                    if(wire._start.x === wirePositionsOr[j]){
                                        if(wire._end.y > gate._topPosition){
                                            // bottom half
                                            if(wire._start.y > orGate._topPosition){
                                                gate.SetValue(i+1, orGate._array_value[j]);

                                            }
                                            else{
                                                gate.SetValue(i+1, orGate._array_value[13 - j]);
                                            }
                                            
                                        }
                                        else{
                                            //top half
                                            if(wire._start.y > orGate._topPosition){
                                                gate.SetValue(14-i, orGate._array_value[j]);

                                            }
                                            else{
                                                gate.SetValue(14-i, orGate._array_value[13 - j]);
                                            }
                                            
                                        }
                                    }
                                    
                                }
                            });
                        }
                    
                    }
                });
                
                /******************************************************** */

            } else if (gpioPin1 != null && gpioPin2 != null ) {

                this._errors.push(3); //indicates short on GPIO
            } else if (gpioPin1 != null) {
                gpioPin = gpioPin1;
                otherPoint = wire._end;
                this._protocol.push("G" + gpioPin.toString());
            } else {
                gpioPin = gpioPin2;
                otherPoint = wire._start;
                this._protocol.push("G" + gpioPin.toString());
            }

            var isOutput = OUTPUTS_BY_PIN[gpioPin] !== undefined;
            var isInput = INPUTS_BY_PIN[gpioPin] !== undefined;

            // check to see if the correct output GPIO on the breadboard is being used, report error otherwise
            if (!isOutput && !isInput) {
                this.ReportError('gpio-not-supported');
                errors = true;
                continue;
            }

            // This means that there is an input to the breadbaord (an output from the microcontroller)
            if (isInput) {
                // It can only go to the LED's
                var found = false;
                $.each(this._inputs, function (position, input) {
                    var wireX = input.GetWireX();
                    var wireYBase = input.GetWireYBase();

                    // Check to see with orientation the wire is in
                    if (wireX == otherPoint.x) {
                        if (otherPoint.y >= wireYBase && otherPoint.y <= (wireYBase + 4*VISIR_SQUARE_SIZE)) {
                            var value = self._inputState[gpioPin];
                            input.SetValue(value);
                            processedInputs.push(input);
                            found = true;
                        }
                    }
                });

                // This means that there is no LED on the breadbaord, indicate an error
                if (!found) {
                    this.ReportError("input-not-led");
                    errors = true;
                    continue;
                }
            } else {
                console.log("isOutput: " + isOutput);
                // It can only go to ground, voltage or switches
                var isPower = finder.IsPower(otherPoint);
                var isGround = finder.IsGround(otherPoint);
                if (isPower || isGround) {
                    // Check to see if it is a power
                    if (isPower) {
                        this._ChangeOutput(gpioPin, true);
                    } else {
                        this._ChangeOutput(gpioPin, false);
                    }
                    processedOutputGpios.push(gpioPin);
                } else if(gpioPin1 != null || gpioPin2 != null){
                    // if not ground or power... check if its a logic gate
                    var found = false;
                    $.each(this._outputs, function (position, output) {
                        var wireX = output.GetWireX();
                        var wireYBase = output.GetWireYBase();

                        if (wireX == otherPoint.x) {
                            if (otherPoint.y >= wireYBase && otherPoint.y <= (wireYBase + 4*VISIR_SQUARE_SIZE)) {
                                self._ChangeOutput(gpioPin, output.GetValue());
                                processedOutputGpios.push(gpioPin);
                                found = true;
                            }
                        }

                    });
                    // No input found, this means that the GPIO is directly tied with a logic gate
                    if (!found) {

                        // Find the orientation of the wire
                        if(wire._start.y > 60){
                            var cur_wire = wire._start;
                        }
                        else{
                            var cur_wire = wire._end;
                        }
                        // First, we need to check the GPIO connection to a not gate
                        $.each(this._notGate, function (position, gate) {
                            // Sweep through the wire locations on the not gate
                            var wirePositions = gate.GetPinLocation();
                            for(var i = 0; i < wirePositions.length; i++){
                                // CHeck to see if the GPIO is connected to that not gate
                                if(cur_wire.x === wirePositions[i]){
                                    if(cur_wire.y > gate._topPosition){
                                        // bottom half
                                        self._ChangeOutput(gpioPin, gate.GetValue(i));
                                        processedOutputGpios.push(gpioPin);
                                        gate._protocol[i] = "G" + gpioPin.toString();
                                    }
                                    else{
                                        //top half
                                        self._ChangeOutput(gpioPin, gate.GetValue(13-i));
                                        processedOutputGpios.push(gpioPin);
                                        gate._protocol[13-i] = "G" + gpioPin.toString();
                                    }
                                }
                            }
                            /****************************************** */
    
                        });
                        // Next, check to see if the GPIO connection is to an and gate
                        $.each(this._andGate, function (position, gate) {
                            // sweep through pin locations of the and gate
                            var wirePositions = gate.GetPinLocation();
                            for(var i = 0; i < wirePositions.length; i++){

                                if(cur_wire.x === wirePositions[i]){
                                    if(cur_wire.y > gate._topPosition){
                                        // bottom half
                                        self._ChangeOutput(gpioPin, gate.GetValue(i));
                                        processedOutputGpios.push(gpioPin);
                                        gate._protocol[i] = "G" + gpioPin.toString();
                                        // if(i != andLProcessed){
                                        //     gate._protocol[i] = "G" + gpioPin.toString();

                                        // }
                                    }
                                    else{
                                        //top half
                                        self._ChangeOutput(gpioPin, gate.GetValue(13-i));
                                        processedOutputGpios.push(gpioPin);
                                        gate._protocol[13-i] = "G" + gpioPin.toString();
                                        // if((13-i) != andLProcessed){
                                        //     gate._protocol[13-i] = "G" + gpioPin.toString();

                                        // }
                                    }
                                }
                            }
                            /****************************************** */
    
                        });
                        // FInally, check to see if the GPIO connection is to the or gate
                        $.each(this._orGate, function (position, gate) {
                            // Sweep through available or gate connections for the pins
                            var wirePositions = gate.GetPinLocation();
                            for(var i = 0; i < wirePositions.length; i++){

                                if(cur_wire.x === wirePositions[i]){
                                    if(cur_wire.y > gate._topPosition){
                                        // bottom half
                                        self._ChangeOutput(gpioPin, gate.GetValue(i));
                                        processedOutputGpios.push(gpioPin);
                                        gate._protocol[i] = "G" + gpioPin.toString();
                                    }
                                    else{
                                        //top half
                                        self._ChangeOutput(gpioPin, gate.GetValue(13-i));
                                        processedOutputGpios.push(gpioPin);
                                        gate._protocol[13-i] = "G" + gpioPin.toString();
                                    }
                                }
                            }
                            /****************************************** */
    
                        });

                    }
                }
            }
            previousGpioPins.push(gpioPin);
        }

        // we found an input pin in the update sweep, thus we need to chagne the state accordingly
        $.each(this._inputs, function (pos, input) {
            if (!processedInputs.includes(input)) {
                input.SetValue(false);
            }
        });
        // we found an output pin in the update sweep, thus we need to change the state accordingly
        $.each(this._outputState, function (pin, name) {
            if (!processedOutputGpios.includes(parseInt(pin))) {
                self._ChangeOutput(pin, false);
            }
        });

       // We need to check to see if each not gate is appropriately powered on
        $.each(this._notGate, function (position, gate) {
            if(gate._protocol[6] != "LF" || gate._protocol[13] != "LT"){
                error_array.push(2); //2 means logic ic not properly powered
            }
        });
        // We need to check to see if each and gate is appropriately powered on
        $.each(this._andGate, function (position, gate) {
            if(gate._protocol[6] != "LF" || gate._protocol[13] != "LT"){
                error_array.push(2); //2 means logic ic not properly powered
            }
        });
        // We need to check to see if each or gate is appropriately powered on
        $.each(this._orGate, function (position, gate) {
            if(gate._protocol[6] != "LF" || gate._protocol[13] != "LT"){
                error_array.push(2); //2 means logic ic not properly powered
            }
        });
       
        // We have no errors!
        if (!errors) {
            this.ReportOK();
        }
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
