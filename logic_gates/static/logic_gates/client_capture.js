/****************************************************
 * Author: Matt Guo
 * Course: EE475/EE542
 * Name: client_capture.js
 * Affiliation: University of Washington
 * Functionality: The javascript backend for the Flask breadboard GUI,
 * handling the client functionality. This javascript is called
 * whenever the submit button on the GUI is pressed.
 ***************************************************/

 function printLog(){
    breadboard.Update()
    // console.log(breadboard);
    // console.log(breadboard._outputState);
    // console.log(breadboard._errors);
    
    // Check to see if there are any errors in the errors array
    if(breadboard._errors.length){
        // Next, check to see which error was found
        switch(breadboard._errors[0]){
                // This case means a short circuit was found
                case 1:
                    alert("Circuit short detected. Please resolve.");
                break;
                // This case means an IC is not properly powered
                case 2:
                    alert("Logic IC not properly powered. Please resolve.");
                break;
                // This case means that the GPIO configuration does not work
                case 3:
                    alert("Improper GPIO configuration. Please resolve.");
                break;
                
                default:
                break;
        }
        return;
    }
    var myString = ""
    if(breadboard._notGate.length){
        // Check the NOT gates
        for(var i = 0; i < breadboard._notGate.length; i++){
            //Need to check through _protocol array (length of 14)
            for(var j = 0; j < breadboard._notGate[i]._protocol.length; j++){
                // 6 and 13 are Vcc and GND pins, no need to include
                if(j === 6 || j === 13){
                    continue;
                }
                // Check numbers 0, 2, 4
                if(j < 6 && (j % 2 == 0)){
                    if(breadboard._notGate[i]._protocol[j] != null && breadboard._notGate[i]._protocol[j+1] != null){
                        myString = myString + "N" + breadboard._notGate[i]._protocol[j] + breadboard._notGate[i]._protocol[j+1] + ";";
                    }
                    
                }
                // Check numbers 12, 10, 8
                if(j > 6 && (j % 2 == 0)){
                    if(breadboard._notGate[i]._protocol[j] != null && breadboard._notGate[i]._protocol[j-1] != null){
                        myString = myString + "N" + breadboard._notGate[i]._protocol[j] + breadboard._notGate[i]._protocol[j-1] + ";";
                    }
                }
            }
        }
    }

    if(breadboard._andGate.length){
        // Check the AND gates
        for(var i = 0; i < breadboard._andGate.length; i++){
            // Need to check through _protocol array (length of 14)
            for(var j = 0; j < breadboard._andGate[i]._protocol.length; j++){
                // 6 and 13 are Vcc and GND pins, no need to include
                if(j === 6 || j === 13){
                    continue;
                }

                // Check numbers 0 and 3
                if(j === 0 || j === 3){
                    if(breadboard._andGate[i]._protocol[j] != null && breadboard._andGate[i]._protocol[j+1] != null && breadboard._andGate[i]._protocol[j+2] != null){
                        myString = myString + "A" + breadboard._andGate[i]._protocol[j] + breadboard._andGate[i]._protocol[j+1] + breadboard._andGate[i]._protocol[j+2] + ";";
                    }
                }

                // Check number 9 and 12
                if(j === 9 || j === 12){
                    if(breadboard._andGate[i]._protocol[j] != null && breadboard._andGate[i]._protocol[j-1] != null && breadboard._andGate[i]._protocol[j-2] != null){
                        myString = myString + "A" + breadboard._andGate[i]._protocol[j] + breadboard._andGate[i]._protocol[j-1] + breadboard._andGate[i]._protocol[j-2] + ";";
                    }
                }
            }
        }
    }

    if(breadboard._orGate.length){
        // Check the AND gates
        for(var i = 0; i < breadboard._orGate.length; i++){
            // Need to check through _protocol array (length of 14)
            for(var j = 0; j < breadboard._orGate[i]._protocol.length; j++){
                // 6 and 13 are Vcc and GND pins, no need to include
                if(j === 6 || j === 13){
                    continue;
                }

                // Check numbers 0 and 3
                if(j === 0 || j === 3){
                    if(breadboard._orGate[i]._protocol[j] != null && breadboard._orGate[i]._protocol[j+1] != null && breadboard._orGate[i]._protocol[j+2] != null){
                        myString = myString + "O" + breadboard._orGate[i]._protocol[j] + breadboard._orGate[i]._protocol[j+1] + breadboard._orGate[i]._protocol[j+2] + ";";
                    }
                }

                // Check number 9 and 12
                if(j === 9 || j === 12){
                    if(breadboard._orGate[i]._protocol[j] != null && breadboard._orGate[i]._protocol[j-1] != null && breadboard._orGate[i]._protocol[j-2] != null){
                        myString = myString + "O" + breadboard._orGate[i]._protocol[j] + breadboard._orGate[i]._protocol[j-1] + breadboard._orGate[i]._protocol[j-2] + ";";
                    }
                }
            }
        }
    }

    document.getElementById("protocol").innerHTML = myString;
    console.log(myString);

    // codes = []
    // // Check output pin number 7, tying with the yellow led
    // if(breadboard._outputState['7']){
    //     codes.push('GCO');
    // }
    // else{
    //     codes.push('GCF');
    // }

    // // Check output pin number 11, tying with the red led
    // if(breadboard._outputState['11']){
    //     codes.push('GAO');
    // }
    // else{
    //     codes.push('GAF');
    // }

    // // Check output pin number 21, tying with the green led
    // if(breadboard._outputState['21']){

    //     codes.push('GBO');
    // }
    // else{
    //     codes.push('GBF');
    // }

    // // Check output pin number 44, tying with the onboard green led
    // if(breadboard._outputState['44']){
    //     codes.push('LGO');
    // }
    // else{
    //     codes.push('LGF');
    // }

    // // Check output pin number 45, tying with the onboard orange
    // if(breadboard._outputState['45']){
    //     codes.push('LOO');
    // }
    // else{
    //     codes.push('LOF');
    // }

    // // Check output pin number 44, tying with the onboard red led
    // if(breadboard._outputState['46']){
    //     codes.push('LRO');
    // }
    // else{
    //     codes.push('LRF');
    // }

    // // Check output pin number 47, tying with the onboard blue led
    // if(breadboard._outputState['47']){
    //     codes.push('LBO');
    // }
    // else{
    //     codes.push('LBF');
    // }

    // // Send this array of information over through POST to the flask handler
    // $.ajax({
    //     type:'POST',
    //     contentType: 'application/json',
    //     data: JSON.stringify(codes),
    //     dataType: 'json',
    //     url: 'http://127.0.0.1:5000/',
    //     success: function(e){
    //         console.log(e);
    //     },
    //     error: function(error){
    //         console.log(error);
    //     }
    // });
}