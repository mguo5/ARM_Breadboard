import secrets
import os
from flask import Blueprint, request, session, render_template, jsonify, Response
lab_blueprint = Blueprint('lab', __name__)
# from .pi_serial import uart_communicate

# import camera driver
# if os.environ.get('CAMERA'):
#     Camera = import_module('camera_' + os.environ['CAMERA']).Camera
# else:
#     from .camera_pi import Camera

@lab_blueprint.route('/', methods=['GET', 'POST'])
def index():
    # if request.method == 'POST':
    #     asd = request.json
    #     print(asd)
    #     uart = uart_communicate(asd)
    #     uart.send_all()
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

