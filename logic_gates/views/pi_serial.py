"""
Author: Matt Guo
Course: EE475/542
Affiliation: University of Washington
Name: pi_serial.py
Functionality: Controls the UART functionality from the raspberry pi to
the STM32 microcontroller. THis is placed in a class object for easier control
over different files. The UART runs on 9600 baud
"""

import serial
import time

class uart_communicate:
    def __init__(self, array_cmd):
        # Initialize the serial
        self.ser = serial.Serial(
                port='/dev/serial0',
                baudrate=9600,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=0.5)
        # Initialize the commands that need to be sent
        self.cmd = array_cmd
        
    def send_thru_uart(self, to_send):
        """Helper function to send UART through Raspberry Pi GPIO to STM32"""
        self.ser.write(str.encode(to_send))
        # Make sure to flush the output
        self.ser.flushInput()
        self.ser.flushOutput()
        time.sleep(.5)
        
        timeout = time.time() + 
        # Continue to check to see if the STM sent a response back. This needs to be a handshake
        while True:
           ret = self.ser.readline()
           # No errors, thus we can co ahead and break away
           if ret != b'':
              return

    def send_all(self):
        """Function that sends all of the commands"""
        for i in self.cmd:
           self.send_thru_uart(i)
