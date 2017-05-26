var express = require('express'), bodyParser = require('body-parser');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json())

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

var pg = require('pg');
var imageArrays = require('./imageArrays');

app.post('/raj', function(request, response) {
	var message = request.body.item.message.message;
	var tokens = message.split(" ")
	var command = tokens[1]
	if (command == 'dance') {
		sendMessage(response, imageArrays.rajArray[0], rajColor)
	} else if (command == 'whiteboard') {
		sendMessage(response, imageArrays.rajArray[5], rajColor)
	} else if (command == 'closeup') {
		sendMessage(response, imageArrays.rajArray[11], rajColor)
	} else if (command == 'focus') {
		sendMessage(response, imageArrays.rajArray[9], rajColor)
	} else if (command == 'doctor') {
		sendMessage(response, imageArrays.rajArray[1], rajColor)
	} else if (command == 'strut') {
		sendMessage(response, imageArrays.rajArray[6], rajColor)
	} else if (command == 'help') {
		sendInformationalMessage(response, 'usage: /raj {dance,whiteboard,closeup,focus,doctor,strut}');
	} else {
		var index =  Math.floor(Math.random() * imageArrays.rajArray.length);
		var randomRaj = imageArrays.rajArray[index];
		sendMessage(response, randomRaj, rajColor)
	}
});

app.post('/bun', function(request, response) {
	var message = request.body.item.message.message;
	var tokens = message.split(" ")
	var command = tokens[1]

	var numberOperand = parseInt(command)
	if (numberOperand < imageArrays.benGifArray.length) {
		sendMessage(response, imageArrays.benGifArray[numberOperand], bunColor)
	} else if (command == 'pic') {
		var numberOperand = parseInt(tokens[2])
		if (numberOperand < imageArrays.benPicArray.length) {
			sendMessage(response, imageArrays.benPicArray[numberOperand], bunColor)
		} else {
			var index =  Math.floor(Math.random() * imageArrays.benPicArray.length);
			var randomBun = imageArrays.benPicArray[index];
			sendMessage(response, randomBun, bunColor)
		}
	} else {
		var index =  Math.floor(Math.random() * imageArrays.benGifArray.length);
		var randomBun = imageArrays.benGifArray[index];
		sendMessage(response, randomBun, bunColor)
	}
});

app.post('/chickpea', function(request, response) {
	var chickpea = 'https://s3.amazonaws.com/uploads.hipchat.com/28219/3345018/EUqZ3mdKbfn5OIA/ezgif.com-63d6eecf03.gif'
	sendMessage(response, chickpea, rajColor)
});

var errorColor = 'red';
var infoColor = 'yellow';
var successColor = 'green';
var rajColor = 'purple';
var bunColor = 'orange'

function sendHelpMessage(response) {
	var message = 'usage: /foos [-h] {history,scores,log}\n';
	message += '...\n\n';
	message += 'available arguments:\n';
	message += '\t{history,scores,log}\n';
	message += '\t\thistory\t\tList the game results between two players\n';
	message += '\t\tscores\t\tList the existing ratings and records for all players\n';
	message += '\t\tlog\t\tLog a new match between two players\n\n';
	message += 'optional arguments:\n';
	message += '\t-h, --help\t\tshow this help message and exit';
	sendInformationalMessage(response, message);
}

function sendSuccessMessage(response, message) {
	sendMessage(response, message, successColor);
}

function sendGeneralError(response, error) {
	sendError(response, 'An error occurred. Please contact the administrator.\n\nMessage: ' + error.message || error);
}

function sendError(response, message) {
	sendMessage(response, message, errorColor);
}

function sendInformationalMessage(response, message) {
	sendMessage(response, message, infoColor);
}

function sendMessage(response, message, color) {
	response.send(JSON.stringify({'color' : color, 
		'message' : message,
		'notify' : false,
		'message_format' : 'text'
	}));
}
