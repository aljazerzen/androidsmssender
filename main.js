const { spawn } = require('child_process');
const express = require('express');
const bodyParser = require('body-parser');
const ADB = './platform-tools/adb';

const queue = [
];

const call = (command, args) =>
	new Promise(resolve => {
		let cmd = spawn(command, args);
		cmd.stdout.on('data', data => {
			console.log(`stdout: ${data}`);
		});
		cmd.stderr.on('data', data => {
			console.log(`stderr: ${data}`);
		});
		cmd.on('close', resolve);
	});

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

smsSenderRunning = false;
let totalSent = 0;
async function smsSender() {
	if (smsSenderRunning)
		return;
	smsSenderRunning = true;

	while (queue.length > 0) {
		let { number, text } = queue.shift();
		let openApp = ['shell', 'am', 'start', '-a', 'android.intent.action.SENDTO', '-d', 'sms:' + number, '--es', 'sms_body', '"' + text + '"', '--ez', 'exit_on_sent', 'true']
		let send = 'shell input tap 670 1235'.split(' ');
		let back = 'shell input keyevent KEYCODE_BACK'.split(' ');
		console.log(openApp.join(' '));
		await call(ADB, openApp);
		await call(ADB, back);
		await call(ADB, send);
		await call(ADB, back);
		totalSent++;
		console.log('Current queue length: ' + queue.length + '. Total SMS sent: ' + totalSent);
		await sleep(30000);
	}

	smsSenderRunning = false;
}


// Express

const e = express()
e.use(bodyParser.json());

e.get('/', (req, res) => {
	res.send('Current queue length: ' + queue.length + '. Total SMS sent: ' + totalSent);
});

e.post('/', (req, res) => {
	if (!req.body.number)
		return res.send('body.number missing');
	if (!req.body.text)
		return res.send('body.text missing');

	console.log(req.body);
	queue.push(req.body);
	smsSender();
	res.send('Added to queue. Current queue length: ' + queue.length);
});

e.listen(3000, () => console.log('SMS sender listening on port 3000'));
smsSender();