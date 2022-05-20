"""
Author: Matt Guo
Course: EE475/542
Affiliation: University of Washington
Name: lab.py
Functionality: The router functionality of the web application, used to initialize the
state of the webpage, as well as call the different python files for UART communication
and video camera feed onto the flask environment.
"""

import secrets
import os
from flask import Blueprint, request, session, render_template, jsonify, Response
lab_blueprint = Blueprint('lab', __name__)
# from .pi_serial import uart_communicate
# from .json_format import formatter

# # import camera driver
# if os.environ.get('CAMERA'):
#     Camera = import_module('camera_' + os.environ['CAMERA']).Camera
# else:
#     from .camera_pi import Camera

@lab_blueprint.route('/', methods=['GET', 'POST'])
def index():
    """THe main initialization of the web application"""

    # # Check to see if a POST method is submitted from the client onto flask
    # if request.method == 'POST':
    #     asd = request.json
    #     # Properly convert the necessary JSON package into a protocol to be sent to the STM32
    #     uart = uart_communicate(asd)
    #     codes = formatter(asd)
    #     print(codes.convert_to_json())
    #     print(codes.convert_to_string())
    #     # Send the response over through serial communication
    #     uart.send_all()
    #     # Return the JSON to the client to indicate the the message transfer is successful
    #     return jsonify(success=True)
    session['csrf'] = secrets.token_urlsafe()
    return render_template("lab.html")
    
def gen(camera):
    """Video streaming generator function."""
    yield b'--frame\r\n'
    while True:
        frame = camera.get_frame()
        yield b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n--frame\r\n'


@lab_blueprint.route('/video_feed')
def video_feed():
    """Video streaming route. Put this in the src attribute of an img tag."""
    return Response(gen(Camera()),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

