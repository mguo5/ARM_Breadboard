from flask import Flask
from flask_assets import Environment

from config import configurations

# Here you can initialize any Flask extension that you add
assets = Environment() # for compiling resources (both for caching and for avoid problems with cached versions)
# redis = FlaskRedis() # for Redis database
# babel = Babel() # for internationalization (i18n)
# weblab = WebLab() # for supporting remote laboratories (weblablib)
# ...

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(configurations[config_name])

    # Here you can initialize the Flask extensions
    #
    assets.init_app(app)
    # redis.init_app(app)
    # babel.init_app(app)
    #
    #from .views.pi_serial import uart_communicate
    from .bundles import register_bundles
    register_bundles(assets)

    # Here register the blueprints
    from .views.lab import lab_blueprint
    app.register_blueprint(lab_blueprint)

    if app.config['FAKE_HARDWARE']:
        from .views.fake_api import fake_api_blueprint
        app.register_blueprint(fake_api_blueprint, url_prefix='/api')
    else:
        from .views.api import api_blueprint
        app.register_blueprint(api_blueprint, url_prefix='/api')


    return app

