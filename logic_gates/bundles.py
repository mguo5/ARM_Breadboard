from flask_assets import Bundle

def register_bundles(assets):
    visir_css = Bundle(
            "visir/instrumentframe/instrumentframe.css",
            "visir/instruments/breadboard/breadboard.css",
            "visir/instruments/flukemultimeter/flukemultimeter.css",
            "visir/instruments/tripledc/tripledc.css",
            "visir/instruments/hp_funcgen/hp_funcgen.css",
            "visir/instruments/ag_oscilloscope/ag_oscilloscope.css",
            "visir/instruments/ni_oscilloscope/ni_oscilloscope.css",
            "visir/instrumentframe/instrumentframe.css",
            output="gen/visir.%(version)s.min.css")
    visir_js = Bundle(
            "visir/utils.js",
            "visir/services.js",
            "visir/jquery-turnable.js",
            "visir/jquery-draggable.js",
            "visir/jquery-updownbutton.js",
            "visir/config.js",
            "visir/FileSaver.min.js",
            "visir/language.js",
            "visir/instrumentregistry.js",
            "visir/instruments/multimeter.js",
            "visir/instruments/oscilloscope.js",
            "visir/instruments/functiongenerator.js",
            "visir/instruments/dcpower.js",
            "visir/instruments/breadboard/breadboard.js",
            "visir/instruments/flukemultimeter/flukemultimeter.js",
            "visir/instruments/tripledc/tripledc.js",
            "visir/instruments/hp_funcgen/hp_funcgen.js",
            "visir/instruments/ag_oscilloscope/ag_oscilloscope.js",
            "visir/instruments/ni_oscilloscope/ni_oscilloscope.js",
            "visir/instrumentframe/instrumentframe.js",
            output="gen/visir.%(version)s.min.js")

    assets.register("visir_css", visir_css)
    assets.register("visir_js", visir_js)
