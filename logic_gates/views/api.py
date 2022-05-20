"""
Author: Matt Guo
Course: EE475/542
Affiliation: University of Washington
Name: api.py
Functionality: A helper flask file for the event that additional expandability
is needed through different routes on the web application. Currently not used.
"""

from functools import wraps
from flask import Blueprint, request, jsonify, session

api_blueprint = Blueprint('api', __name__)

def check_csrf(func):
    """Check to see if a POST method is sent"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if request.method == 'POST':
            request_data = request.get_json(silent=True, force=True)
            if session.get('csrf') != request_data.get('csrf'):
                return jsonify("Unauthorized request: csrf failed")
        return func(*args, **kwargs)
    return wrapper


@api_blueprint.route('/', methods=['GET', 'POST'])
def index():
    return "API endpoint"

@api_blueprint.route('/switch/<number>', methods=['GET', 'POST'])
@check_csrf
def switch(number):
    """Which of the three switches are used, and return as JSON to the client"""
    if request.method == 'GET':
        return jsonify(success=False, message="not implemented")
    return jsonify(success=True)

@api_blueprint.route('/submit', methods=['GET', 'POST'])
def submit():
    """The submit button action to send the commands via POST over to Flask"""
    if request.method == 'POST':
        asd = request.json
        return jsonify(success=True)
    
