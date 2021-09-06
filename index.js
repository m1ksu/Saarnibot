const { Client, Intents } = require('discord.js');
const { Permissions } = require('discord.js');
require('dotenv').config()
const schedule = require('node-schedule');
const moment = require('moment');
const request = require('sync-request').default

const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, foodPrintHour, foodPrintMinute } = require('./config.json');

var token = process.env.TOKEN;

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once('ready', () => {
	console.log('Ready!');
});


//#region Slash commands
const commands = [
	new SlashCommandBuilder().setName('ping').setDescription('Testikomento'),
	new SlashCommandBuilder().setName('ruoka').setDescription('Kertoo ruoan'),
	new SlashCommandBuilder().setName('ruokakanava').setDescription('Asettaa kanavan, jonne ruokalista lähetetään').addChannelOption(option => option.setName('kanava').setDescription("sama").setRequired(true)),
	new SlashCommandBuilder().setName('muutaaika').setDescription('Muuta aikaa, jolloin ruokalista lähetetään').addStringOption(option => option.setName('aika').setDescription("Aika, muotoa HH:MM").setRequired(true)),

]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
	try {
		await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log('Successfully registered application commands.');
	} catch (error) {
		console.error(error);
	}
})();
//#endregion

var foodChannel;

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;
	
	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	} else if (commandName === 'ruoka') {
		await interaction.reply(foodToday());
	} else if (commandName === 'ruokakanava') {
		await interaction.reply(setFoodChannel(interaction.options.getChannel("kanava"), interaction.member))
	} else if (commandName == 'muutaaika') {
		await interaction.reply(changeFoodTime(interaction.options.getString("aika"), interaction.member))
	}
});

var foodTimer = schedule.scheduleJob(`0 ${foodPrintMinute} ${foodPrintHour} * * *`, foodToday)

//#region Funky func
function setFoodChannel(channel, member) {
	if (!member.permissions.has(Permissions.FLAGS.MANAGE_SERVER)) {
		return "Sinulla ei ole oikeuksia tähän komentoon."
	}
	foodChannel = channel.id
	return "Kanava asetettu."
}

function changeFoodTime(time, member) {
	if (!member.permissions.has(Permissions.FLAGS.MANAGE_SERVER)) {
		return "Sinulla ei ole oikeuksia tähän komentoon."
	}
	if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
		var time = time.split(":")

		foodTimer.cancel();
		foodTimer = schedule.scheduleJob(`0 ${time[1]} ${time[0]} * * *`, foodToday);
		return `Ruoka-aika on nyt asetettu aikaan ${time[0]}:${time[1]}`
	} else {
		return "Väärä aikamuoto. Ajan on olla muotoa HH:MM, esim: 06:30"
	}
}

function foodToday() {
	food = getFoodList()
	try {
		client.channels.cache.get(foodChannel).send(`**Ruoka tänään:**
Pääruoka: ${food.lunch}
Kasvisruoka: ${food.vege}`)
	} catch(e) {}
}

function getFoodList() {
	const today = moment().format('YYYY-MM-DD');
	try {
		return JSON.parse(request('GET', `https://api.koulusafka.fi/get/index.php?a=${today}&b=fgfdg905hnm490jiofsdydy346gfgd&c=espoo`).getBody()).foods.filter(food => food.date == today)[0];
	} catch (error) {
		console.error(error)
		return error
	}
}
//#endregion

client.login(token)