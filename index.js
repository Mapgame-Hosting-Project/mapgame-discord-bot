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
const { formatWithOptions } = require("util")

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
        var autoRoleRoleID = snapshot.val().autoRoleRoleID
        console.log(snapshot.val())

        member.guild.channels.cache.get(welcomeChannelID).send("Welcome <@" + member.id + ">!")
        member.roles.add(member.guild.roles.cache.get(autoRoleRoleID))
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

                                cMsg.channel.send("What role should I give members when they join? Make sure to mention the role. To skip this step, send a message with 'skip'.")
                                break;

                            case 2:
                                if (getUserFromMention(cMsg.content, true, client.guilds.cache.get(guildID)) == "invalid mention") {
                                    cMsg.channel.send("Invalid role.")
                                    collector.collected.delete(collector.collected.lastKey())
                                    msg.channel.send("What role should I give members when they join? Make sure to mention the role. To skip this step, send a message with 'skip'.")
                                    break;
                                }

                                cMsg.channel.send("What information about a member's nation will they have to provide when registering?")
                                var embed = new Discord.MessageEmbed()
                                    .setColor("#009900")
                                    .setTitle("Configure registration form")
                                    .addField("Instructions:", "Send what fields you want on your registration form. Type 'done' when you are done. PS: Don't include a field about map claims or country colour, the bot will handle that all for you!")
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

function getUserFromMention(mention, role = false, guild = null) {
    if (!mention) return;

    if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);

        if (mention.startsWith('!')) {
            mention = mention.slice(1);
        }

        if (mention.startsWith('&')) {
            mention = mention.slice(1);
        }

        if (role) {
            return guild.roles.cache.get(mention)
        } else {
            return client.users.cache.get(mention);
        }
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

    var fieldCollectionCompleted = false
    var nicknameTemplateCompleted = false
    var nationChannelBool
    var channelTemplateAsked = false
    collector2.on("collect", fMsg => {
        if (channelTemplateAsked) {
            var channelTemplateCheck = checkFieldNameTemplateValidity(fMsg.content, listOfFieldsForRegistration, false)

            if (channelTemplateCheck == false) {
                collector2.collected.delete(collector2.collected.lastKey())

                fMsg.channel.send("Something went wrong with processing that channel template...try making sure it is valid and everything is spelt right, then send it again.")

                return

            } else if (channelTemplateCheck == true) {
                collector2.stop()

                fMsg.channel.send("Done! Channel template completed.")
                fMsg.channel.send("Your server is now setup. Type " + config.prefix + "help to see a list of commands you can use.")

                channelTemplateCompleted = true

                return
            }
        } else {

            if (nicknameTemplateCompleted) {
                if (fMsg.content == "yes") {
                    nationChannelBool = true

                    fMsg.channel.send("Ok, follow the instructions below to set it up.")
                    var embed2 = new Discord.MessageEmbed()
                        .setTitle("Custom nation channel setup")
                        .setColor("#009900")
                        .addField("Instructions:", "Send a message of what the channel will be called. Use the same method as with nicknames to add answers from the form, surrounding the field name with square brackets. All spaces will be turned to dashes ('-') when the channel is created.")
                        .addField("Don't want to do this step?", "I literally just asked you...fine...send \"skip\" and you'll be on your way.")
                    fMsg.channel.send(embed2)

                    channelTemplateAsked = true

                    return
                } else if (fMsg.content == "no") {
                    nationChannelBool = false

                    fMsg.channel.send("Done! Channel template skipped.")
                    fMsg.channel.send("Your server is now setup. Type " + config.prefix + "help to see a list of commands you can use.")

                    collector2.stop()

                    return
                } else {
                    collector2.collected.delete(collector2.collected.lastKey())

                    fMsg.channel.send("Sorry, I don't know what to do with that answer. Try again, making sure you answer is yes or no.")

                    return
                }

            } else {

                if (fieldCollectionCompleted) {
                    if (fMsg.content == "skip") {
                        fMsg.channel.send("Done! Nickname template skipped.")

                        nicknameTemplateCompleted = true

                        fMsg.channel.send("When a meber registers a new nation, should a channel be created for that nation? (yes/no)")

                        return
                    }

                    var nicknameTemplateCheck = checkFieldNameTemplateValidity(fMsg.content, listOfFieldsForRegistration)

                    if (nicknameTemplateCheck == false) {
                        collector2.collected.delete(collector2.collected.lastKey())

                        fMsg.channel.send("Something went wrong with processing that nickname template...try making sure it is valid and everything is spelt right, then send it again.")

                        return
                    } else if (nicknameTemplateCheck == true) {
                        fMsg.channel.send("Done! Nickname template completed.")

                        nicknameTemplateCompleted = true

                        fMsg.channel.send("When a meber registers a new nation, should a channel be created for that nation? (yes/no)")

                        return
                    }

                } else {

                    if (fMsg.content == "done") {
                        fMsg.channel.send("Done. Form completed.")

                        fieldCollectionCompleted = true

                        fMsg.channel.send("Ok, now we're getting down to the good stuff... Set up members' custom nicknames following the instructions below:")
                        var embed1 = new Discord.MessageEmbed()
                            .setColor("#009900")
                            .setTitle("Custom nickname setup")
                            .addField("Instructions:", "Send a message of how members' nicknames should change after registering below. To insert an answer from a field type '[fieldname]'. To insert the member's original username type '[username]'")
                            .addField("Example:", "If I have a field called 'Nation name', I could send \"[username] | [Nation name]\" which would turn in to, for example, 'Mapgame Bot | My Epic Nation Name'.")
                            .addField("Don't want to do this step?", "If so, simply send \"skip\"")
                        fMsg.channel.send(embed1)

                        return
                    }

                    if (fMsg.content.includes("username") || fMsg.content.includes("$") || fMsg.content.includes("#") || fMsg.content.includes("[") || fMsg.content.includes("]") || fMsg.content.includes("/") || fMsg.content.includes(".") || listOfFieldsForRegistration.includes(fMsg.content)) {
                        collector2.collected.delete(collector2.collected.lastKey())

                        fMsg.channel.send("Invalid field name. Make sure it doesn't include '$', '#', '[', ']', '/', '.', or 'username' and isn't already a field.")

                        return
                    }

                    var fieldName = fMsg.content

                    embedMessage.edit(embed.spliceFields(1, 1, { name: "Form:", value: embed.fields.find(f => f.name == "Form:").value.replace("None", "") + fieldName + ":\n" }))
                    listOfFieldsForRegistration.push(fMsg.content)
                }
            }
        }
    })

    collector2.on("end", collected => {
        console.log(collector.collected)
        var welcomeChannelID = getChannelFromMention(collector.collected.array()[0].content).id
        var autoRoleRoleID = getUserFromMention(collector.collected.array()[1].content, true, client.guilds.cache.get(guildID)).id
        switch (nationChannelBool) {
            case true:
                var nicknameTemplate = collector2.collected.array()[collector2.collected.array().length - 3].content
                var channelTemplate = collector2.collected.array()[collector2.collected.array().length - 1].content
                break;

            case false:
                var nicknameTemplate = collector2.collected.array()[collector2.collected.array().length - 2].content
                var channelTemplate = null
                break;

            default:
                break;
        }

        var ref2 = db.ref(guildID + "/config")
        ref2.update({
            setupComplete: "yes",
            welcomeChannelID: welcomeChannelID,
            autoRoleRoleID: autoRoleRoleID,
            listOfFieldsForRegistration: listOfFieldsForRegistration,
            nicknameTemplate: nicknameTemplate,
            channelTemplate: channelTemplate.split(" ").join("-")
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

function checkFieldNameTemplateValidity(template, listOfFields, checkWithUsername = true) {
    var openSquareBracketIndexes = []
    var closeSquareBracketIndexes = []
    for (var i = 0; i < template.length; i++) {
        switch (template[i]) {
            case "[":
                openSquareBracketIndexes.push(i)
                break;

            case "]":
                closeSquareBracketIndexes.push(i)
                break;

            default:
                break;
        }
    }

    if (openSquareBracketIndexes.length != closeSquareBracketIndexes.length) return false
    if (openSquareBracketIndexes.length == 0) return false

    if (checkWithUsername) listOfFields.push("username")
    for (var i = 0; i < openSquareBracketIndexes.length; i++) {
        var fieldName = template.substring(openSquareBracketIndexes[i] + 1, closeSquareBracketIndexes[i])

        if (!listOfFields.includes(fieldName)) return false
    }

    return true
}

client.login(config.token)