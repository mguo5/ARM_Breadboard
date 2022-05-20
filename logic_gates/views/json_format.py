"""
Author: Matt Guo
Course: EE475/542
Affiliation: University of Washington
Name: json_format.py
Functionality: Controls the protocol used to convert the client frontend
JSON package into STM32 microcontroller readable UART information. This is
then sent over serial communication for the microcontroller to interpret
"""


class formatter:
	def __init__(self, msg_array):
		"""Initialize the main message array"""
		self.msg_array = msg_array
		
	def convert_to_string(self):
		"""Protocol 1: Convert the JSON format from the client into a string equivalent then sent over to UART
			This is the protocol that is used for the project
		"""
		# Initialize I for input, O for output
		my_string_i = "I"
		my_string_o = "O"
		# Sweep through the contents of the message array
		for i in self.msg_array:
			# We have found a break point in our client message, time to return
			if str(i[0]) == "L":
				return my_string_i + my_string_o
			# Check to see the different ports that are being used
			my_string_o += str(i[1])
			# A means that we are on port 11
			if str(i[1]) == "A":
				my_string_i += "11"
			# B means we are on port 21
			elif str(i[1]) == "B":
				my_string_i += "21"
			# C means we are on port 07
			elif str(i[1]) == "C":
				my_string_i += "07"
			
			# Convert the O for On to be T for True
			if str(i[2]) == "O":
				my_string_o += "T"
				my_string_i += "T"
			else:
				my_string_o += str(i[2])
				my_string_i += str(i[2])
		# Return the string message
		return my_string
		
	def convert_to_json(self):
		"""Protocol 2: Convert the JSON format from the client into a different JSON equivalent then sent over to UART
			This protocol was not used for the project, but is good to get documented for future work
		"""
		# Initialize a JSON package with input and output
		my_json = {'input': {}, 'output': {}}
		# Sweep through the contents in the message array
		for i in self.msg_array:
			my_array_o = []
			# The output JSON should have Port
			temp_string_o = "Port"
			temp_string_o += str(i[1])
			# The input JSON should have Pin
			temp_string_i = "Pin"
			# We have found a break point in our client message, time to return
			if str(i[0]) == "L":
				return my_json
			# A means we are on port 11
			if str(i[1]) == "A":
				temp_string_i += "11"
				# Convert the O to be True
				if str(i[2]) == 'O':
					temp_logic_i = True
					temp_logic_o = True
				else:
					temp_logic_i = False
					temp_logic_o = False
			# B means we are on port 21
			elif str(i[1]) == "B":
				temp_string_i += "21"
				# Convert the O to be True
				if str(i[2]) == 'O':
					temp_logic_i = True
					temp_logic_o = True
				else:
					temp_logic_i = False
					temp_logic_o = 
			# C means we are on port 07
			elif str(i[1]) == "C":
				temp_string_i += "07"
				# Convert the O to be True
				if str(i[2]) == 'O':
					temp_logic_i = True
					temp_logic_o = True
				else:
					temp_logic_i = False
					temp_logic_o = False
			# Now, we build the overall JSON protocol
			my_json['input'].update({temp_string_i: temp_logic_i})
			my_json['output'].update({temp_string_o: temp_logic_o})
		# We now return the protocol to be sent over through UART
		return my_json
