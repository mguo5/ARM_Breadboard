import secrets
from flask import Blueprint, request, session, render_template

lab_blueprint = Blueprint('lab', __name__)

@lab_blueprint.route('/')
def index():
    session['csrf'] = secrets.token_urlsafe()
    return render_template("lab.html")

