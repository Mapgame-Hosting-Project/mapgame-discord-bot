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

const childProcess = require("child_process")

const fs = require("fs")

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on("guildCreate", guild => {
    var defaultChannel = "";
    guild.channels.forEach(channel => {
        if (channel.type == "text" && defaultChannel == "") {
            if (channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                defaultChannel = channel;
            }
        }
    })

    defaultChannel.send("Hello! To get started using me, type \"" + config.prefix + "init\".")
})

client.on("message", msg => {
    if (!msg.content.startsWith(config.prefix) || msg.author.bot) {
        return
    }

    const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    handleCommand(msg, command, args)
})

client.on("guildMemberAdd", member => {
    var ref = db.ref(member.guild.id + "/config")
    ref.once("value", (snapshot) => {
        var welcomeChannelID = snapshot.val().welcomeChannelID
        var autoRoleRoleName = snapshot.val().autoRoleRoleName
        console.log(snapshot.val())

        member.guild.channels.cache.get(welcomeChannelID).send("Welcome <@" + member.id + ">!")
        member.roles.add(member.guild.roles.cache.find(role => role.name == autoRoleRoleName))
    })
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

        case "init":
            // 1. ask for welcome channel
            // 2. ask for role to apply to members when they join
            // 3. ask for what nation registration fields should be optional

            if (!msg.member.hasPermission("ADMINISTRATOR")) {
                msg.channel.send("You do not have the correct permissions to use this command. Ask an admin to help you out.")
                break;
            }

            var ref = db.ref(guildID + "/config/setupComplete")
            ref.once("value", (snapshot) => {
                if (snapshot.val() == "yes") {
                    msg.channel.send("You've already initialised this server! To re-initialiase or un-initialise it, DM the bot's owner: 'Scott Buchanan#7940'")
                    return
                } else {
                    var filter = m => m.member.id === msg.member.id
                    var collector = msg.channel.createMessageCollector(filter)

                    msg.channel.send("I'm going to ask you a couple questions to help setup your server with the bot.")
                    msg.channel.send("What channel should I welcome new members in? (make sure to have the channel name mentioned, highlighted blue)")

                    var numberOfQuestionsToBeAskedByTheCollector = 3

                    collector.on("collect", cMsg => {

                        console.log(collector.collected.size)

                        switch (collector.collected.size) {
                            case 1:
                                if (getChannelFromMention(cMsg.content) == "invalid mention") {
                                    cMsg.channel.send("Invalid channel.")
                                    collector.collected.delete(collector.collected.lastKey())
                                    msg.channel.send("What channel should I welcome new members in? (make sure to have the channel name mentioned, highlighted blue)")
                                    break;
                                }

                                cMsg.channel.send("What role should I give members when they join? Make sure to send the name of the role, rather than mentioning it. To skip this step, send a message with 'skip'.")
                                break;

                            case 2:
                                cMsg.channel.send("What information about a member's nation will they have to provide when registering? (Don't worry about including a field about map claims or country colour, the bot will handle that all for you!)")
                                var embed = new Discord.MessageEmbed()
                                    .setColor("#009900")
                                    .setTitle("Registration information")
                                    .addField("Instructions:", "Send a list of messages containing the different fields that will be on your registration form (field names can't contain $, #, [, ], /, or ., if one does, it will be ignored). Type done when you are done.")
                                    .addField("Form:", "None")
                                cMsg.channel.send(embed).then(message => {
                                    initRegistrationQuestionSetup(cMsg, embed, message, collector, guildID)

                                    collector.stop()
                                })
                                break;

                            default:
                                break;
                        }
                    })
                }
            })

            break;

        case "rn":
        case "register":
        case "register-nation":
            var checkRef = db.ref(guildID + "/config/setupComplete")
            checkRef.once("value", (snapshot) => {
                if (snapshot.val() == "yes") {
                    var listOfFieldsForRegistration
                    var ref = db.ref(guildID + "/config/listOfFieldsForRegistration")
                    ref.once("value", (snapshot) => {
                        listOfFieldsForRegistration = snapshot.val()
                        console.log(listOfFieldsForRegistration)

                        // create collector that only receives messages from same user, then process form once it has been sent

                        var filter = m => m.member.id === msg.member.id
                        var collector = msg.channel.createMessageCollector(filter)

                        msg.channel.send("Fill out the following details about your nation.")

                        msg.channel.send(listOfFieldsForRegistration[0] + ":")

                        collector.on("collect", cMsg => {
                            console.log(collector.collected.size)
                            console.log(listOfFieldsForRegistration.length)

                            if (collector.collected.size == listOfFieldsForRegistration.length) {
                                cMsg.channel.send("Now to do your initial map claim. Follow the instructions below.")
                                var embed = new Discord.MessageEmbed()
                                    .setColor("#009900")
                                    .setTitle("Map claim instructions")
                                    .addField("How to get your map claim code", "Visit the website [here](https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html) and follow the instructions to generate your mapgame code.")
                                    .addField("Ok... what now?", "Simply copy paste that code and send it here! Once you've done that, you will get a confirmation message.")
                                cMsg.channel.send(embed)

                                return
                            }

                            if (collector.collected.size == listOfFieldsForRegistration.length + 1) {
                                cMsg.channel.send("Generating map claim preview...")

                                generateMapFromMapCode(cMsg.content).then(mapPath => {
                                    cMsg.channel.send("Is this claim ok? (yes/no)", { files: [mapPath] })
                                })

                                return
                            }

                            if (collector.collected.size == listOfFieldsForRegistration.length + 2) {
                                if (cMsg.content == "yes" || cMsg.content == "y") {
                                    collector.stop()

                                    return
                                } else {
                                    collector.collected.delete(collector.collected.lastKey())
                                    collector.collected.delete(collector.collected.lastKey())

                                    cMsg.channel.send("Send another map claim code from the website (https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html).")

                                    return
                                }
                            }

                            cMsg.channel.send(listOfFieldsForRegistration[collector.collected.size] + ":")
                        })

                        collector.on("end", collected => {
                            try {
                                var answers = []
                                collected.array().slice(0, listOfFieldsForRegistration.length).forEach(message => {
                                    answers.push(message.content)
                                });

                                var formJSONObject = {
                                    fields: {}
                                }
                                console.log(listOfFieldsForRegistration)
                                for (var i = 0; i < listOfFieldsForRegistration.length; i++) {
                                    console.log("sb1")
                                    formJSONObject.fields[listOfFieldsForRegistration[i]] = answers[i]
                                    console.log(listOfFieldsForRegistration[i] + ": " + answers[i])
                                }
                                formJSONObject["status"] = "pendingApproval"
                                formJSONObject["mapClaimCode"] = collected.array()[listOfFieldsForRegistration.length].content

                                console.log(formJSONObject)

                                var ref = db.ref(guildID + "/nationApplications/" + msg.member.id)
                                ref.update(formJSONObject)

                                collected.array()[0].channel.send("Done! Your registration form is now submitted.")
                            } catch (e) {
                                console.log(e)
                                collected.array()[0].channel.send("Whoops! There was something wrong with submitting your form.")
                            }
                        })
                    })
                } else {
                    msg.channel.send("This server hasn't been set up with us yet! Contact an admin and get them to run the command \"" + config.prefix + "init\".")
                    return
                }
            })

            break;

        case "cr":
        case "cancel-registration":
            var ref = db.ref(guildID + "/nationApplications/" + msg.member.id)
            ref.update({
                status: "cancelled"
            })

            msg.channel.send("Done! Your nation registration has been cancelled.")
            break;

        case "stats":
            var listOfNations = []
            var ref = db.ref(guildID + "/nations")
            ref.once("value", (snapshot) => {
                if (!snapshot.exists()) {
                    msg.channel.send("No nations found.")
                    return
                } else {
                    // at least 1 country found
                }
            })

            /*
            const exampleEmbed = new Discord.MessageEmbed()
                .setColor("#009900")
                .setTitle("Statistics")
                .setDescription("Statistics about countries in the mapgame.")
                .addFields({ name: "Countries:", value: listOfNations })
            msg.channel.send(exampleEmbed).then(embedMsg => {
                embedMsg.react("1️⃣").then(() => embedMsg.react("2️⃣").then(() => embedMsg.react("3️⃣").then(() => embedMsg.react("4️⃣").then(() => embedMsg.react("5️⃣")))))
            })
            */
            break;

        default:
            break;
    }
}

function getUserFromMention(mention) {
    if (!mention) return;

    if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);

        if (mention.startsWith('!')) {
            mention = mention.slice(1);
        }

        return client.users.cache.get(mention);
    } else {
        return "invalid mention"
    }
}

function getChannelFromMention(mention) {
    if (!mention) return;

    if (mention.startsWith('<#') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);

        return client.channels.cache.get(mention);
    } else {
        return "invalid mention"
    }
}

function initRegistrationQuestionSetup(cMsg, embed, embedMessage, collector, guildID) {
    var filter2 = m => m.member.id === cMsg.member.id
    var collector2 = cMsg.channel.createMessageCollector(filter2)
    var listOfFieldsForRegistration = []

    collector2.on("collect", fMsg => {
        if (fMsg.content == "done") {
            collector2.stop()

            cMsg.channel.send("Done! Your server is now setup. Type " + config.prefix + "help to see a list of commands you can use.")

            return
        }

        if (fMsg.content.includes("$") || fMsg.content.includes("#") || fMsg.content.includes("[") || fMsg.content.includes("]") || fMsg.content.includes("/") || fMsg.content.includes(".")) {
            collector2.collected.delete(collector2.collected.lastKey())

            return
        }

        embedMessage.edit(embed.spliceFields(1, 1, { name: "Form:", value: embed.fields.find(f => f.name == "Form:").value.replace("None", "") + fMsg.content + ":\n" }))
        listOfFieldsForRegistration.push(fMsg.content)
    })

    collector2.on("end", collected => {
        console.log(collector.collected)
        var welcomeChannelID = getChannelFromMention(collector.collected.array()[0].content).id
        var autoRoleRoleName = collector.collected.array()[1].content

        var ref2 = db.ref(guildID + "/config")
        ref2.update({
            setupComplete: "yes",
            welcomeChannelID: welcomeChannelID,
            autoRoleRoleName: autoRoleRoleName,
            listOfFieldsForRegistration: listOfFieldsForRegistration
        })
    })
}

async function generateMapFromMapCode(code) {
    var spawn = childProcess.spawn
    var pythonProcess = spawn("python", ["generate-map.py", code])

    return new Promise((resolve, reject) => {
        pythonProcess.stdout.on("data", data => {
            console.log(data.toString())
            resolve(data.toString().replace(/\r?\n|\r/g, ""))
        })
    })
}

client.login(config.token)