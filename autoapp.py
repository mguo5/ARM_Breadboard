from logic_gates import create_app
import os

app = create_app(os.environ.get('FLASK_CONFIG') or 'default')
application = app

