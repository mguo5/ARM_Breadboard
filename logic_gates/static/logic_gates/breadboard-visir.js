if(typeof(RHLab) === "undefined") {
    RHLab = {};
}

if(typeof(RHLab.Widgets) === "undefined") {
    RHLab.Widgets = {};
}

RHLab.Widgets.Breadboard = function() {

    var VISIR_SQUARE_SIZE = 13;
    var DEFAULT_NUMBER_OF_SWITCHES = 18;

    var OUTPUTS_BY_PIN = {
         6: 'V_SW0',  // GPIO5
         7: 'V_SW1',  // GPIO6
         8: 'V_SW2',  // GPIO7
         9: 'V_SW3',  // GPIO8
        10: 'V_SW4',  // GPIO9
        13: 'V_SW5',  // GPIO10
        14: 'V_SW6',  // GPIO11
        15: 'V_SW7',  // GPIO12
        16: 'V_SW8',  // GPIO13
        17: 'V_SW9',  // GPIO14
        18: 'V_SW10', // GPIO15
        19: 'V_SW11', // GPIO16
        20: 'V_SW12', // GPIO17
        21: 'V_SW13', // GPIO18
        22: 'V_SW14', // GPIO19
        23: 'V_SW15', // GPIO20
        24: 'V_SW16', // GPIO21
        25: 'V_SW17', // GPIO22
    };

    var INPUTS_BY_PIN = {
        31: 'V_LED0', // GPIO26
        32: 'V_LED1', // GPIO27
    };

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
        this._notGate = [];
        this._numberOfSwitches = numberOfSwitches || DEFAULT_NUMBER_OF_SWITCHES;
        this._imageBase = imageBase || (window.STATIC_ROOT + "resources/img/");
        this._enableNetwork = (enableNetwork === undefined)?true:enableNetwork;

        $.each(OUTPUTS_BY_PIN, function (pinNumber, name) {
            self._outputState[pinNumber] = false;
        });
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

        this._HideInstruments();
        this._AddPowerSupplies();
        this._AddComponents();
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

            return $("<root />").append($xml).html();
        }

        window._dbgGlobalBreadboard = this;
    }

    Breadboard.prototype.LoadCircuit = function (circuit) {
        this._breadboard.LoadCircuit(circuit);
        this.Update();
    }
    
    Breadboard.prototype.SaveCircuit = function () {
        return this._breadboard.SaveCircuitWithoutWires();
    }


    Breadboard.prototype._HideInstruments = function () {
        this._$elem.find('.bin .teacher').hide();
        this._$elem.find('.bin .reset').hide();
        this._$elem.find('.instrument.dmm').hide();
        this._$elem.find('.instrument.osc').hide();
        this._$elem.find('.instrument.fgen').hide();
        this._$elem.find('.instrument.gnd').hide();
    }

    Breadboard.prototype._AddPowerSupplies = function () {
        var connections2image = this._$elem.find('.instrument.dcpower img').attr('src');
        var rightPowerSupply = '<div class="instrument gnd" style="left: 586px; top: 398px"><div class="connectionimages"><img src="' + connections2image + '"></div><div class="texts"><div class="connectiontext">GND</div><div class="connectiontext">+3.3V</div></div></div>';
        this._$elem.find('.instruments').append($(rightPowerSupply));

        this._$elem.find('.instrument.dcpower').css({'top': '-46px'});
        this._$elem.find('.instrument.dcpower .title').hide();
        this._$elem.find('.instrument.dcpower .connectiontext:contains(6V)').text('+3.3V');
    }

    Breadboard.prototype._AddComponents = function () {

        var switchesBottomLine = 10;

        for (var i = 0; i < this._numberOfSwitches; i++) {
            var bottomTopBase;
            var bottomLeftBase;
            var positionX;

            if (i < switchesBottomLine) {
                var positionX = i;
                var bottomTopBase = 307;
                var bottomLeftBase = 157;
            } else {
                var positionX = i - switchesBottomLine;
                var bottomTopBase = 215;
                var bottomLeftBase = 170;
            }

            var topPosition;
            if (i % 2 == 1) {
                topPosition = bottomTopBase;
            } else {
                topPosition = bottomTopBase + 2 * VISIR_SQUARE_SIZE;
            }
            var leftPosition = bottomLeftBase + (VISIR_SQUARE_SIZE * 3) * positionX;
            var identifier = "switch" + i;
            var switchComponent = new Breadboard.Switch(identifier, this._imageBase, leftPosition, topPosition);
            this._outputs.push(switchComponent);
            this.AddComponent(switchComponent);
        }

        var led0 = new Breadboard.LED('led0', this._imageBase, 496, 157);
        this._inputs.push(led0);
        this.AddComponent(led0);
        var led1 = new Breadboard.LED('led1', this._imageBase, 522, 157);
        this._inputs.push(led1);
        this.AddComponent(led1);

        var jp1Image = this._imageBase + "connections_50.png";
        var jp1 = new Breadboard.Component('JP1', 221, 22, jp1Image, null, 0);
        this.AddComponent(jp1);

        // 274 and then multiples of 13
        /***************************************************************************************** */
        var not0 = new Breadboard.NotGate('NG1', this._imageBase, 274, 261);
        this._notGate.push(not0);
        this.AddComponent(not0)
        
        // var notGateImage = this._imageBase + "not_gate.png";
        // var not_gate = new Breadboard.Component('NG1', 274, 261, notGateImage, null, 0);
        // this.AddComponent(not_gate);
        /***************************************************************************************** */
        var andGateImage = this._imageBase + "and_gate.png";
        var and_gate = new Breadboard.Component("AG1", 378, 261, andGateImage, null, 0);
        this.AddComponent(and_gate);
    }

    Breadboard.prototype.AddComponent = function(component) {
        this._components[component._identifier] = component;
        this._$elem.find('.components').append(component._$elem);
        component.SetBreadboard(this);
    }

    Breadboard.prototype.UpdateInputState = function(state) {
        var self = this;
        if (!state.inputs)
            return;

        var anyChanged = false;

        $.each(this._inputState, function (pinNumber, currentState) {
            var inputName = INPUTS_BY_PIN[pinNumber];
            if (state.inputs[inputName] === undefined || state.inputs[inputName] === null)
                return; // No input variable provided

            if (state.inputs[inputName] != currentState) {
                anyChanged = true;
                self._inputState[pinNumber] = state.inputs[inputName];
            }
        });

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
            if (point.x >= 229 && point.x <= 476) {
                return Math.round((factor + 1) * 2) - 1;
            } 
        } else if (point.y == 42) { // upper row (2..40)
            if (point.x >= 229 && point.x <= 476) {
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

    Breadboard.prototype.ReportOK = function () {
        $('#ll-breadboard-messages').text(ERROR_MESSAGES['ready']);
    }

    Breadboard.prototype.ReportError = function (key) {
        $('#ll-breadboard-messages').text(ERROR_MESSAGES[key]);
    }

    Breadboard.prototype.Update = function() {
        console.log("Updating...")
        var self = this;

        var errors = false;
        var wires = this._breadboard._wires;

        var finder = new Breadboard.PinFinder();

        var previousGpioPins = [];

        var processedInputs = [];
        var processedOutputGpios = [];
        // cycle between all new wires
        for (var i = this._originalNumberOfWires; i < wires.length; i++) {
            var wire = wires[i];

            // Each wire must be connected to a GPIO at least. Otherwise, error
            var gpioPin1 = finder.FindGpioPin(wire._start);
            var gpioPin2 = finder.FindGpioPin(wire._end);
            var gpioPin;
            var otherPoint;
            if (gpioPin1 === null && gpioPin2 === null) {
                var gate_array = this._notGate;
                // add stuff here about valid switch to logic gates
                /*************************************************** */
                // It can only go to the LED's
                // var found = false;
                $.each(this._outputs, function (position, output) {
                    var wireX = output.GetWireX();
                    var wireYBase = output.GetWireYBase();
                    
                    var switch_wire;
                    var logic_wire;
                    var correct_switch = false;
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

                    if(correct_switch){
                        if (switch_wire.y >= wireYBase && switch_wire.y <= (wireYBase + 4*VISIR_SQUARE_SIZE)) {
                            $.each(gate_array, function (position, gate) {
                                var wirePositions = gate.GetPinLocation();
                                for(var i = 0; i < wirePositions.length; i++){
                                    if(logic_wire.x === wirePositions[i]){
                                        if(logic_wire.y > gate._leftPosition){
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
                /******************************************************** */
                this.ReportError('no-gpio');
                errors = true;
                continue;
            } else if (gpioPin1 != null && gpioPin2 != null ) {
                this.ReportError('two-gpio');
                errors = true;
                continue;
            } else if (gpioPin1 != null) {
                gpioPin = gpioPin1;
                otherPoint = wire._end;
            } else {
                gpioPin = gpioPin2;
                otherPoint = wire._start;
            }

            var isOutput = OUTPUTS_BY_PIN[gpioPin] !== undefined;
            var isInput = INPUTS_BY_PIN[gpioPin] !== undefined;

            if (!isOutput && !isInput) {
                this.ReportError('gpio-not-supported');
                errors = true;
                continue;
            }

            if (previousGpioPins.includes(gpioPin)) {
                this.ReportError("gpio-already-used");
                errors = true;
                continue;
            }

            if (isInput) {
                // It can only go to the LED's
                var found = false;
                $.each(this._inputs, function (position, input) {
                    var wireX = input.GetWireX();
                    var wireYBase = input.GetWireYBase();

                    if (wireX == otherPoint.x) {
                        if (otherPoint.y >= wireYBase && otherPoint.y <= (wireYBase + 4*VISIR_SQUARE_SIZE)) {
                            var value = self._inputState[gpioPin];
                            input.SetValue(value);
                            processedInputs.push(input);
                            found = true;
                        }
                    }
                });

                if (!found) {
                    this.ReportError("input-not-led");
                    errors = true;
                    continue;
                }
            } else {
                // It can only go to ground, voltage or switches
                var isPower = finder.IsPower(otherPoint);
                var isGround = finder.IsGround(otherPoint);
                if (isPower || isGround) {
                    if (isPower) {
                        this._ChangeOutput(gpioPin, true);
                    } else {
                        this._ChangeOutput(gpioPin, false);
                    }
                    processedOutputGpios.push(gpioPin);
                } else {
                    // if not ground or power... it must be a switch
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
                    if (!found) {
                        this.ReportError("output-not-switch-gnd");
                        // Add things here about checking logic gates
                        /******************************************* */
                        if(wire._start.y > 60){
                            var cur_wire = wire._start;
                        }
                        else{
                            var cur_wire = wire._end;
                        }
                        $.each(this._notGate, function (position, gate) {
                            var wirePositions = gate.GetPinLocation();
                            for(var i = 0; i < wirePositions.length; i++){
                                if(cur_wire.x === wirePositions[i]){
                                    if(cur_wire.y > gate._leftPosition){
                                        // bottom half
                                        self._ChangeOutput(gpioPin, gate.GetValue(i));
                                        processedOutputGpios.push(gpioPin);
                                    }
                                    else{
                                        //top half
                                        self._ChangeOutput(gpioPin, gate.GetValue(13-i));
                                        processedOutputGpios.push(gpioPin);
                                    }
                                }
                            }
                            /****************************************** */
    
                        });
                        errors = true;
                        continue;
                    }
                }
            }
            previousGpioPins.push(gpioPin);
        }

        $.each(this._inputs, function (pos, input) {
            if (!processedInputs.includes(input)) {
                input.SetValue(false);
            }
        });
        $.each(this._outputState, function (pin, name) {
            if (!processedOutputGpios.includes(parseInt(pin))) {
                self._ChangeOutput(pin, false);
            }
        });
       
        if (!errors) {
            this.ReportOK();
            // use inputConnections
        }
    }

    Breadboard.prototype._ChangeOutput = function(pinNumber, value) {
        var pinNumber = parseInt(pinNumber);
        if (this._outputState[pinNumber] === value) {
            // No new data, no need to push data
            return;
        }
        var data = {'value': value};
        var identifier = OUTPUTS_BY_PIN[pinNumber];
        this._outputState[pinNumber] = value;

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


    Breadboard.Component = function (identifier, leftPosition, topPosition, image1, image2, zIndex) {
        this._breadboard = null;
        this._identifier = identifier;
        this._leftPosition = parseInt(leftPosition);
        this._topPosition = parseInt(topPosition);
        this._$elem = $("<div id='" + identifier + "'></div>");
        this._$elem.addClass("component");
        this._$elem.css({'left': parseInt(leftPosition) + 'px', 'top': parseInt(topPosition) + 'px'});
        if (zIndex !== undefined) {
            this._$elem.css({'z-index': 0});
        }
        this._$elem.append($("<img class='active image1' src='" + image1 + "' draggable='false'>"));
        if (image2) {
            this._$elem.append($("<img class='image2' src='" + image2 + "' draggable='false'>"));
        }
    }

    Breadboard.Component.prototype.SetBreadboard = function(breadboard) {
        this._breadboard = breadboard;
    }

    Breadboard.Switch = function (identifier, imageBase, leftPosition, topPosition) {
        var self = this;
        var image1 = imageBase + "switch-left-small.jpg";
        var image2 = imageBase + "switch-right-small.jpg";

        Breadboard.Component.call(this, identifier, leftPosition, topPosition, image1, image2);

        this._$elem.css({'cursor': 'pointer'});

        this._value = false;
        this._$elem.find('img').click(function () {
            self._Change();
        });
    };

    Breadboard.Switch.prototype = Object.create(Breadboard.Component.prototype);

    Breadboard.Switch.prototype._Change = function () {
        this._value = !this._value;

        var $inactiveElement = this._$elem.find('img:not(.active)');
        var $activeElement = this._$elem.find('img.active');

        $inactiveElement.addClass('active');
        $activeElement.removeClass('active');

        if (this._breadboard !== null) {
            this._breadboard.Update();
        }
    };

    Breadboard.Switch.prototype.GetValue = function() {
        return this._value;
    }

    Breadboard.Switch.prototype.GetWireX = function () {
        return this._leftPosition + 20;
    }

    Breadboard.Switch.prototype.GetWireYBase = function () {
        if (this._topPosition > 300) 
            return 302;
        else
            return 211;
    }

    // ***************************************************************************************************************************
    Breadboard.NotGate = function(identifier, imageBase, leftPosition, topPosition) {
        var self = this;
        var image1 = imageBase + "not_gate.png";

        Breadboard.Component.call(this, identifier, leftPosition, topPosition, image1);
        this._pin_location = [
            leftPosition + 7,
            leftPosition + 20,
            leftPosition + 33,
            leftPosition + 46,
            leftPosition + 59,
            leftPosition + 72,
            leftPosition + 85
        ]

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
        ]
    }

    Breadboard.NotGate.prototype = Object.create(Breadboard.Component.prototype);

    Breadboard.NotGate.prototype.SetValue = function(pin, value){
        if(pin === 1 || pin === 3 || pin === 5){
            this._array_value[pin - 1] = value;
            this._array_value[pin] = !value;
        }
        else if(pin === 9 || pin === 11 || pin === 13){
            this._array_value[pin - 1] = value;
            this._array_value[pin - 2] = !value;
        }
    }

    Breadboard.NotGate.prototype.GetValue = function(pin){
        return this._array_value[pin];
    }

    Breadboard.NotGate.prototype.GetPinLocation = function () {
        return this._pin_location;
    }
    // ***************************************************************************************************************************
    Breadboard.LED = function (identifier, imageBase, leftPosition, topPosition) {
        var self = this;
        var image1 = imageBase + "led-off.png";
        var image2 = imageBase + "led-on.png";

        Breadboard.Component.call(this, identifier, leftPosition, topPosition, image1, image2);

        this._value = false;
    };

    Breadboard.LED.prototype = Object.create(Breadboard.Component.prototype);

    Breadboard.LED.prototype.GetValue = function() {
        return this._value;
    }

    Breadboard.LED.prototype.SetValue = function(value) {
        this._value = value;
        if (value) {
            this._$elem.find('.image1').removeClass('active');
            this._$elem.find('.image2').addClass('active');
        } else {
            this._$elem.find('.image1').addClass('active');
            this._$elem.find('.image2').removeClass('active');
        }
    }

    Breadboard.LED.prototype.GetWireX = function () {
        return this._leftPosition + 6;
    }

    Breadboard.LED.prototype.GetWireYBase = function () {
        if (this._topPosition > 300) 
            return 302;
        else
            return 211;
    }

    var ERROR_MESSAGES = {
        "no-gpio": "Error: Every wire must be connected to one GPIO",
        "two-gpio": "Error: Every wire can only be connected to one GPIO",
        "gpio-not-supported": "Error: That GPIO pin is not supported",
        "gpio-already-used": "Error: That GPIO is used by two wires",
        "input-not-led": "Error: Input GPIO's must be connected to LED's",
        "output-not-switch-gnd": "Error: Output GPIO's must be connected to switches or power supply",
        "ready": "Ready"
    };

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

    return Breadboard;
}();
