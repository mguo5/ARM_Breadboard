"""
Author: Matt Guo
Course: EE475/542
Affiliation: University of Washington
Name: camera_pi.py
Functionality: The camera functionality of the raspberry pi, using picamera as
the basis for still image capture. This camera takes multiple still images
and stitches them together to create a video feed.
"""

import io
import time
import picamera
from .base_camera import BaseCamera


class Camera(BaseCamera):
    @staticmethod
    def frames():
        """Function to continuously take still images from the raspberry pi camera and stitch them together"""
        with picamera.PiCamera() as camera:
            # let camera warm up
            time.sleep(2)

            stream = io.BytesIO()
            for _ in camera.capture_continuous(stream, 'jpeg',
                                                 use_video_port=True):
                # return current frame
                stream.seek(0)
                yield stream.read()

                # reset stream for next frame
                stream.seek(0)
                stream.truncate()
