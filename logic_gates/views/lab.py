import secrets
from flask import Blueprint, request, session, render_template, jsonify
lab_blueprint = Blueprint('lab', __name__)
from .pi_serial import uart_communicate

@lab_blueprint.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        asd = request.json
        print(asd)
        uart = uart_communicate(asd)
        uart.send_all()
        return jsonify(success=True)
    session['csrf'] = secrets.token_urlsafe()
    return render_template("lab.html")

