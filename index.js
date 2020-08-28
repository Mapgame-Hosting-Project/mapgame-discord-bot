const Discord = require("discord.js")
const client = new Discord.Client()
const config = require("./config.json")

var admin = require("firebase-admin")
var serviceAccount = require(config.firebase_token_path)
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mapgame-discord-bot.firebaseio.com/"
})
var db = admin.database()

var MapgameBotUtilFunctions = require("./modules/MapgameBotUtilFunctions.js")
var RegisterNation = require("./modules/RegisterNation.js")

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on("guildCreate", guild => {
    var defaultChannel = "";
    guild.channels.cache.array().forEach(channel => {
        if (channel.type == "text" && defaultChannel == "") {
            if (channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                defaultChannel = channel;
            }
        }
    })

    defaultChannel.send("Hello! To start linking your server with the bot and website, type \"" + config.prefix + "init\". Also, make sure to have my role (which should be 'Mapgame Bot') at the top of your server's role list in your server's settings or else I won't work!")
})

/*
client.on("guildMemberAdd", member => {
    var ref = db.ref("discord-servers/" + member.guild.id + "/config")
    ref.once("value", (snapshot) => {
        var welcomeChannelID = snapshot.val().welcomeChannelID
        var autoRoleRoleID = snapshot.val().autoRoleRoleID
        console.log(snapshot.val())

        try {
            member.guild.channels.cache.get(welcomeChannelID).send("Welcome <@" + member.id + ">!")
            member.roles.add(member.guild.roles.cache.get(autoRoleRoleID))
        } catch (e) {
            console.log("Error when trying to give member roles or send welcome message: " + e)
        }
    })
})
*/

client.on("message", msg => {
    if (!msg.content.startsWith(config.prefix) || msg.author.bot) {
        return
    }

    if (msg.guild === null) {
        return
    }

    const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    handleCommand(msg, command, args)
})

function handleCommand(msg, command, args) {
    var guildID = msg.guild.id

    switch (command) {
        case "ping":
            msg.channel.send("Pong!")
            break;

        case "help":
            // TODO: help message
            break;

        case "uninit":
            if (!msg.member.hasPermission("ADMINISTRATOR")) {
                msg.channel.send("You do not have the correct permissions to use this command. Ask an admin to help you out.")
                break;
            }

            var ref = db.ref("discord-servers/" + guildID + "/config/setupComplete")
            ref.once("value", (snapshot) => {
                if (snapshot.val() == "yes") {
                    ref2 = db.ref("discord-servers/" + guildID + "/config")
                    ref2.remove().then(() => {
                        msg.channel.send("Done! You can now re-initialise the server with \"" + config.prefix + "init\".")
                    })
                } else {
                    msg.channel.send("This server hasn't been initialised yet! Type \"" + config.prefix + "init\" to link it with the bot.")
                }
            })
            break;

        case "init":
            if (!msg.member.hasPermission("ADMINISTRATOR")) {
                msg.channel.send("You do not have the correct permissions to use this command. Ask an admin to help you out.")
                break;
            }

            db.ref("discord-servers/" + guildID + "/config/setupComplete").once("value", (snapshot) => {
                if (snapshot.val() == "yes") {
                    msg.channel.send("This server is alerady set up! Type \"" + config.prefix + "uninit\" to uninitialise it.")
                } else {
                    var checkKey = MapgameBotUtilFunctions.makeCheckKey(5)
                    var url = `https://mapgamehostingwebsite20200827111104.azurewebsites.net/Create/DiscordServerSetup?guildID=${guildID}&userID=${msg.author.id}&checkKey=${checkKey}`

                    var ref = db.ref("discord-check-keys/" + msg.author.id + "/create-guild")
                    ref.set(guildID + "|" + checkKey)

                    msg.channel.send("Check your DMs!")
                    msg.author.send("Click the link below to setup your server:\n" + url)

                    db.ref("discord-servers/" + guildID + "/config/categoryToAddNationChannelsToID").on("value", (snapshot) => {
                        try {
                            client.guilds.cache.get(guildID).channels.cache.get(snapshot.val()).updateOverwrite(client.user, { MANAGE_CHANNELS: true })
                        } catch {

                        }
                    })
                }
            })
            break;

        case "rn":
        case "register":
        case "register-nation":
            var registerNation = new RegisterNation(db, guildID, new MapgameBotUtilFunctions(client), config)
            registerNation.start(msg)
            break;

        case "cr":
        case "cancel-registration":
            var ref = db.ref("discord-servers/" + guildID + "/nationApplications/" + msg.member.id)
            ref.update({
                status: "cancelled"
            })

            msg.channel.send("Done! Your nation registration has been cancelled.")
            break;

        case "stats":
            var listOfNationsKeys = []
            var ref = db.ref("discord-servers/" + guildID + "/nations")
            ref.once("value", (snapshot) => {
                if (!snapshot.exists()) {
                    msg.channel.send("No nations found.")
                    return
                } else {
                    Object.keys(snapshot.val()).forEach(nationKey => {
                        listOfNationsKeys.push(nationKey)
                    });

                    var mapgameBotUtilFunctions = new MapgameBotUtilFunctions(client)

                    var ref2 = db.ref("discord-servers/" + guildID + "/config/listOfFieldsForRegistration")
                    ref2.once("value", (snapshot2) => {
                        var nationsFieldValues = []
                        listOfNationsKeys.forEach(nationKey => {
                            var nationValueForField = ""
                            snapshot2.val().forEach(fieldName => {
                                nationValueForField += fieldName + ": " + snapshot.val()[nationKey].fields[fieldName] + "\n"
                            });

                            nationsFieldValues.push({
                                name: mapgameBotUtilFunctions.getUserFromMention("<@" + snapshot.child(nationKey).key + ">").username,
                                value: nationValueForField,
                                inline: true
                            })
                        });

                        console.log(nationsFieldValues)

                        var embed = new Discord.MessageEmbed()
                            .setTitle("List of Nations")
                            .setColor("#009900")
                            .addFields(nationsFieldValues)
                        msg.channel.send(embed)
                    })
                }
            })
            break;

        case "ap":
        case "adminpanel":
            msg.channel.send("https://mapgamehostingwebsite20200827111104.azurewebsites.net/Admin/Discord?mapgameID=" + guildID)
            break;

        case "reset-nicknames":
            if (!msg.member.hasPermission("ADMINISTRATOR")) {
                msg.channel.send("You do not have the correct permissions to use this command. Ask an admin to help you out.")
                break;
            }

            msg.channel.send("Resetting nicknames...this may take a while...")
            client.guilds.cache.get(guildID).members.cache.array().forEach(member => {
                if (!member.hasPermission("ADMINISTRATOR")) {
                    member.setNickname(member.user.username)
                }
            });
            msg.channel.send("Nicknames reset!")
            break;

        case "debug-command-1":
            RegisterNation.setupFirebaseValueChecksForNationApplications(db, client, guildID)
            break;

        default:
            break;
    }
}

client.login(config.token)