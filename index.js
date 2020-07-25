const Discord = require("discord.js")
const client = new Discord.Client()
const config = require("./config.json")

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on("message", msg => {
    if (!msg.content.startsWith(config.prefix) || msg.author.bot) {
        return
    }

    const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    handleCommand(msg, command, args)
})

function handleCommand(msg, command, args) {
    switch (command) {
        case "ping":
            msg.channel.send("Pong!")
            break;

        case "stats":
            const exampleEmbed = new Discord.MessageEmbed()
                .setColor("#4287f5")
                .setTitle("Statistics")
                .setDescription("Statistics about countries in the mapgame.")
                .addFields({ name: "Countries:", value: listOfCountries })
            msg.channel.send(exampleEmbed)
            break;

        default:
            break;
    }
}

client.login(config.token)
client.login(config.token)