
class formatter:
	def __init__(self, msg_array):
		self.msg_array = msg_array
		
	def convert_to_string(self):
		my_string_i = "I"
		my_string_o = "O"
		for i in self.msg_array:
			if str(i[0]) == "L":
				return my_string_i + my_string_o
			my_string_o += str(i[1])
			if str(i[1]) == "A":
				my_string_i += "11"
			elif str(i[1]) == "B":
				my_string_i += "21"
			elif str(i[1]) == "C":
				my_string_i += "07"
			
			if str(i[2]) == "O":
				my_string_o += "T"
				my_string_i += "T"
			else:
				my_string_o += str(i[2])
				my_string_i += str(i[2])
		return my_string
		
	def convert_to_json(self):
		my_json = {'input': {}, 'output': {}}
		for i in self.msg_array:
			my_array_o = []
			temp_string_o = "Port"
			temp_string_o += str(i[1])
			temp_string_i = "Pin"
			if str(i[0]) == "L":
				return my_json
			if str(i[1]) == "A":
				temp_string_i += "11"
				if str(i[2]) == 'O':
					temp_logic_i = True
					temp_logic_o = True
				else:
					temp_logic_i = False
					temp_logic_o = False
			elif str(i[1]) == "B":
				temp_string_i += "21"
				if str(i[2]) == 'O':
					temp_logic_i = True
					temp_logic_o = True
				else:
					temp_logic_i = False
					temp_logic_o = False
			elif str(i[1]) == "C":
				temp_string_i += "07"
				if str(i[2]) == 'O':
					temp_logic_i = True
					temp_logic_o = True
				else:
					temp_logic_i = False
					temp_logic_o = False
			my_json['input'].update({temp_string_i: temp_logic_i})
			my_json['output'].update({temp_string_o: temp_logic_o})
		return my_json
