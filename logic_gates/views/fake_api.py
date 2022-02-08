from functools import wraps
from flask import Blueprint, request, jsonify, session

fake_api_blueprint = Blueprint('api', __name__)


def check_csrf(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if request.method == 'POST':
            request_data = request.get_json(silent=True, force=True)
            if session.get('csrf') != request_data.get('csrf'):
                return jsonify("Unauthorized request: csrf failed")
        return func(*args, **kwargs)
    return wrapper


@fake_api_blueprint.route('/', methods=['GET', 'POST'])
def index():
    return "Fake API endpoint"

@fake_api_blueprint.route('/switch/<number>', methods=['GET', 'POST'])
@check_csrf
def switch(number):
    if request.method == 'GET':
        return jsonify(success=False, message="not implemented")
    return jsonify(success=True)

