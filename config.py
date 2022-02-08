import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    FAKE_HARDWARE = False


class DevelopmentConfig(Config):
    SECRET_KEY = 'secret'
    FAKE_HARDWARE = True


class ProductionConfig(Config):
    # TODO: any configuration that in production is different
    pass


configurations = {
    'default': DevelopmentConfig,
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
