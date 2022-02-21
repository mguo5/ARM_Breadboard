import serial
import time

class uart_communicate:
    def __init__(self, array_cmd):
        self.ser = serial.Serial(
                port='/dev/serial0',
                baudrate=9600,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=0.5)
        self.cmd = array_cmd
        
    def send_thru_uart(self, to_send):
        """Helper function to send UART through Raspberry Pi GPIO to STM32"""
        self.ser.write(str.encode(to_send))
        self.ser.flushInput()
        self.ser.flushOutput()
        time.sleep(.5)
        
        timeout = time.time() + 2
        while True:
           ret = self.ser.readline()
           if ret != b'':
              return
    def send_all(self):
        for i in self.cmd:
           self.send_thru_uart(i)
