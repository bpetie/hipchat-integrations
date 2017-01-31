var express = require('express'), bodyParser = require('body-parser');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json())

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

var pg = require('pg');
var pgp = require("pg-promise")();
var db = pgp(process.env.DATABASE_URL);

app.post('/raj', function(request, response) {
	var rajArray = [
		'https://media.giphy.com/media/3o6gaQfzKVaQi43l3a/giphy.gif',
		'https://media.giphy.com/media/26FPzCq1HT3PYQrzq/giphy.gif',
		'https://media.giphy.com/media/xT0BKuHQMmDIoZYiCk/giphy.gif',
		'https://media.giphy.com/media/l4Ki2sVuo8sTVAI36/giphy.gif',
		'https://media.giphy.com/media/xT0BKnKByoEZtI97Es/giphy.gif',
		'https://media.giphy.com/media/xT0BKzAfZWpdzck3yU/giphy.gif',
		'https://media.giphy.com/media/xT0BKffyYUafqRC29G/giphy.gif',
		'https://media.giphy.com/media/26FPJ7KEM4E84akYU/giphy.gif',
		'https://s3.amazonaws.com/uploads.hipchat.com/28219/3345018/p3g3PTpo8nw11av/ezgif-967774748.gif',
		'https://media.giphy.com/media/H3ADkJa2NtqYE/giphy.gif',
		'https://media.giphy.com/media/UyLyMBQzUw1i/giphy.gif'
	]
	var index =  Math.floor(Math.random() * rajArray.length);
	var randomRaj = rajArray[index];
	sendMessage(response, randomRaj, rajColor)
});

app.post('/foos', function(request, response) {
	var message = request.body.item.message.message;
	var tokens = message.split(" ")
	var command = tokens[1]

	if (command == 'history') {
		displayHistory(response, tokens);
	} else if (command == 'scores') {
		displayScores(response);
	} else if (command == 'log') {
		logMatch(response, tokens);
	} else if (command == '-h' || command == '--help') {
		sendHelpMessage(response);
	} else {
		sendInformationalMessage(response, 'usage: /foos [-h] {history,scores,log}');
	}
});

function displayHistory(response, tokens) {
	var player1 = tokens[2]
	var player2 = tokens[3]

	if (!player1 || !player2 || player1.toUpperCase() == player2.toUpperCase()) {
		sendError(response, 'The following arguments are required: @FIRSTPLAYER @SECONDPLAYER');
		return;
	}

	db.task(t=> {
		var query = 'select * from game_log where upper(winner) = $1 and upper(loser) = $2';
		return t.batch([
			t.any(query, [player1.toUpperCase(), player2.toUpperCase()]),
			t.any(query, [player2.toUpperCase(), player1.toUpperCase()])
		]);
	})
	.then(data=> {
		var responseString = player1 + ' has a record of ' + data[0].length + '-' + data[1].length + ' against ' + player2 + '.'
		sendInformationalMessage(response, responseString)
	})
	.catch(error=> {
		sendError(response, 'An error occured. Please contact the administrator.\n' + error.message);
	});
}

function displayScores(response) {
	var results = '--- Current Ratings ---\n\n';

	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    	const query = client.query('SELECT * FROM foos_scores order by score desc;');

    	var teamScores = [];
    	var indScores = [];
    	query.on('row', (row) => {
    		if (row.is_team) {
    			teamScores.push(row);
    		} else {
    			indScores.push(row);
    		}  	
    	});

    	query.on('end', () => {
    		results += '\tIndividual Scores\n';
    		indScores.forEach(function(row) {
				results += row.id.substr(1) + ' -\t\t' + row.score + '\t\t' + row.wins + 'W\t' + row.losses + 'L\n'; 
    		});
    		results += '\n\n\tTeam Scores\n';
    		teamScores.forEach(function(row) {
    			results += row.id.substr(1) + ' -\t\t' + row.score + '\t\t' + row.wins + 'W\t' + row.losses + 'L\n';
    		});
    		done();
    		sendInformationalMessage(response, results);
    	});
  	});
}

function logMatch(response, tokens) {
	var player1 = tokens[2]
	var player2 = tokens[3]

	if (!player1 || !player2 || player1.toUpperCase() == player2.toUpperCase()) {
		sendError(response, 'The following arguments are required: @WINNINGPLAYER @LOSINGPLAYER');
		return;
	}

	db.task(t=> {
		var query = 'select * from foos_scores where upper(id) = $1';
		return t.batch([
			t.one(query, player1.toUpperCase()),
			t.one(query, player2.toUpperCase())
		]);
	})
	.then(data=> {
		var p1 = data[0];
		var p2 = data[1];

		if (p1.is_team != p2.is_team) {
			sendError(response, 'Unable to log a game between a team and an individual player.');
			return;
		}

		var r1 = Math.pow(10, p1.score/400);
		var r2 = Math.pow(10, p2.score/400);

		var e1 = r1 / (r1 + r2);
		var e2 = r2 / (r1 + r2);

		var s1 = 1;
		var s2 = 0;

		var k = 32;
		r1 = Math.round(p1.score + k * (s1 - e1));
		r2 = Math.round(p2.score + k * (s2 - e2));

		db.task(t=> {
			return t.batch([
				t.none('insert into game_log (winner, loser) values ($1, $2)', [p1.id, p2.id]),
				t.none('update foos_scores set score = $1, wins = wins+1 where upper(id) = $2', [r1, p1.id.toUpperCase()]),
				t.none('update foos_scores set score = $1, losses = losses+1 where upper(id) = $2', [r2, p2.id.toUpperCase()])
			]);
		})
		.then(data=> {
			var responseString = 'Game logged successfully!\n\n\t' + p1.id + '\'s new rating is ' + r1 + '\n\t' + p2.id + '\'s new rating is ' + r2;
			sendSuccessMessage(response, responseString);
		})
		.catch(error=> {
			consolue.log(error)
			sendGeneralError(response, error);
		});
	})
	.catch(error=> {
		console.log(error)
		sendGeneralError(response, error);
	});
}

var errorColor = 'red';
var infoColor = 'yellow';
var successColor = 'green';
var rajColor = 'purple';

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
