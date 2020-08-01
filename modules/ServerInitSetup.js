class ServerInitSetup {
    constructor(guildID, mapgameBotUtilFunctions, botClient, db, config) {
        this.Discord = require("discord.js")

        this.guildID = guildID
        this.mapgameBotUtilFunctions = mapgameBotUtilFunctions
        this.client = botClient
        this.db = db
        this.config = config
    }

    start(msg) {
        var filter1 = m => m.member.id === msg.member.id
        var collector1 = msg.channel.createMessageCollector(filter1)

        msg.channel.send("I'm going to ask you a couple questions to help setup your server with the bot.")
        msg.channel.send("What channel should I welcome new members in? (make sure to have the channel name mentioned, highlighted blue)")

        collector1.on("collect", cMsg => {
            console.log(collector1.collected.size)

            switch (collector1.collected.size) {
                case 1:
                    if (this.mapgameBotUtilFunctions.getChannelFromMention(cMsg.content) == "invalid mention") {
                        cMsg.channel.send("Invalid channel.")
                        collector1.collected.delete(collector1.collected.lastKey())
                        msg.channel.send("What channel should I welcome new members in? (make sure to have the channel name mentioned, highlighted blue)")
                        break;
                    }

                    cMsg.channel.send("What role should I give members when they join? Make sure to mention the role. To skip this step, send a message with 'skip'.")
                    break;

                case 2:
                    if (this.mapgameBotUtilFunctions.getUserFromMention(cMsg.content, true, this.client.guilds.cache.get(this.guildID)) == "invalid mention") {
                        cMsg.channel.send("Invalid role.")
                        collector1.collected.delete(collector1.collected.lastKey())
                        msg.channel.send("What role should I give members when they join? Make sure to mention the role. To skip this step, send a message with 'skip'.")
                        break;
                    }

                    collector1.stop()
                    break;

                default:
                    break;
            }
        })

        collector1.on("end", collector1Collected => {
            msg.channel.send("What information about a member's nation will they have to provide when registering?")
            var embed1 = new this.Discord.MessageEmbed()
                .setColor("#009900")
                .setTitle("Configure registration form")
                .addField("Instructions:", "Send what fields you want on your registration form. Type 'done' when you are done. PS: Don't include a field about map claims or country colour, the bot will handle that all for you!")
                .addField("Form:", "None")
            var embedMessage
            msg.channel.send(embed1).then(message => {
                embedMessage = message
            })

            var filter2 = m => m.member.id === msg.member.id
            var collector2 = msg.channel.createMessageCollector(filter2)
            var listOfFieldsForRegistration = []

            var nationChannelBool
            collector2.on("collect", cMsg => {
                console.log(collector2.collected.size)

                switch (collector2.collected.size) {
                    case 1:
                        if (cMsg.content == "done") {
                            cMsg.channel.send("Done. Form completed.")

                            cMsg.channel.send("Ok, now we're getting down to the good stuff... Set up members' custom nicknames following the instructions below:")
                            var embed2 = new this.Discord.MessageEmbed()
                                .setColor("#009900")
                                .setTitle("Custom nickname setup")
                                .addField("Instructions:", "Send a message of how members' nicknames should change after registering below. To insert an answer from a field type '[fieldname]'. To insert the member's original username type '[username]'")
                                .addField("Example:", "If I have a field called 'Nation name', I could send \"[username] | [Nation name]\" which would turn in to, for example, 'Mapgame Bot | My Epic Nation Name'.")
                                .addField("Don't want to do this step?", "If so, simply send \"skip\"")
                            cMsg.channel.send(embed2)

                            return
                        }

                        if (cMsg.content.includes("username") || cMsg.content.includes("$") || cMsg.content.includes("#") || cMsg.content.includes("[") || cMsg.content.includes("]") || cMsg.content.includes("/") || cMsg.content.includes(".") || listOfFieldsForRegistration.includes(cMsg.content)) {
                            collector2.collected.delete(collector2.collected.lastKey())

                            cMsg.channel.send("Invalid field name. Make sure it doesn't include '$', '#', '[', ']', '/', '.', or 'username' and isn't already a field.")

                            return
                        }

                        embedMessage.edit(embed1.spliceFields(1, 1, { name: "Form:", value: embed1.fields.find(f => f.name == "Form:").value.replace("None", "") + cMsg.content + ":\n" }))
                        listOfFieldsForRegistration.push(cMsg.content)
                        collector2.collected.delete(collector2.collected.lastKey())

                        break;

                    case 2:
                        if (cMsg.content == "skip") {
                            cMsg.channel.send("Done! Nickname template skipped.")
                            cMsg.channel.send("When a member registers a new nation, should a channel be created for that nation? (yes/no)")

                            return
                        }

                        var nicknameTemplateCheck = this.mapgameBotUtilFunctions.checkFieldNameTemplateValidity(cMsg.content, listOfFieldsForRegistration)

                        if (nicknameTemplateCheck == false) {
                            collector2.collected.delete(collector2.collected.lastKey())

                            cMsg.channel.send("Something went wrong with processing that nickname template...try making sure it is valid and everything is spelt right, then send it again.")

                            return
                        } else if (nicknameTemplateCheck == true) {
                            cMsg.channel.send("Done! Nickname template completed.")
                            cMsg.channel.send("When a member registers a new nation, should a channel be created for that nation? (yes/no)")

                            return
                        }

                        break;

                    case 3:
                        if (cMsg.content == "yes") {
                            nationChannelBool = true

                            cMsg.channel.send("Ok, follow the instructions below to set it up.")
                            var embed2 = new this.Discord.MessageEmbed()
                                .setTitle("Custom nation channel setup")
                                .setColor("#009900")
                                .addField("Instructions:", "Send a message of what the channel will be called. Use the same method as with nicknames to add answers from the form, surrounding the field name with square brackets. All spaces will be turned to dashes ('-') when the channel is created.")
                                .addField("Don't want to do this step?", "I literally just asked you...fine...send \"skip\" and you'll be on your way.")
                            cMsg.channel.send(embed2)

                            return
                        } else if (cMsg.content == "no") {
                            nationChannelBool = false

                            cMsg.channel.send("Done! Channel template skipped.")
                            cMsg.channel.send("Your server is now setup. Type " + this.config.prefix + "help to see a list of commands you can use.")

                            collector2.stop()

                            return
                        } else {
                            collector2.collected.delete(collector2.collected.lastKey())

                            cMsg.channel.send("Sorry, I don't know what to do with that answer. Try again, making sure you answer is yes or no.")

                            return
                        }

                    case 4:
                        if (cMsg.content == "skip") {
                            nationChannelBool = false

                            cMsg.channel.send("Done! Channel template skipped.")
                            cMsg.channel.send("Your server is now setup. Type " + this.config.prefix + "help to see a list of commands you can use.")

                            collector2.stop()

                            return
                        }

                        var channelTemplateCheck = this.mapgameBotUtilFunctions.checkFieldNameTemplateValidity(cMsg.content, listOfFieldsForRegistration, false)

                        if (channelTemplateCheck == false) {
                            collector2.collected.delete(collector2.collected.lastKey())

                            cMsg.channel.send("Something went wrong with processing that channel template...try making sure it is valid and everything is spelt right, then send it again.")

                            return

                        } else if (channelTemplateCheck == true) {
                            cMsg.channel.send("Done! Channel template completed.")
                            cMsg.channel.send("What is the name of the channel category I should add new members' nations' channels to?")

                            return
                        }
                        break;

                    case 5:
                        collector2.stop()

                        cMsg.channel.send("Done! Channel template category chosen.")
                        cMsg.channel.send("Your server is now setup. Type " + this.config.prefix + "help to see a list of commands you can use.")
                        break;

                    default:
                        break;
                }
            })

            collector2.on("end", collector2Collected => {
                // FYI: collector1Collected is within this scope

                var welcomeChannelID = this.mapgameBotUtilFunctions.getChannelFromMention(collector1Collected.array()[0].content).id
                var autoRoleRoleID = this.mapgameBotUtilFunctions.getUserFromMention(collector1Collected.array()[1].content, true, this.client.guilds.cache.get(this.guildID)).id
                var nicknameTemplate = collector2Collected.array()[1].content
                var channelTemplate
                var channelCategory
                switch (nationChannelBool) {
                    case true:
                        channelTemplate = collector2Collected.array()[3].content
                        channelCategory = collector2Collected.array()[4].content
                        break;

                    case false:
                        channelTemplate = "skip"
                        channelCategory = "skip"
                        break;

                    default:
                        channelTemplate = "skip"
                        channelCategory = "skip"
                        break;
                }

                var ref2 = this.db.ref(this.guildID + "/config")
                ref2.update({
                    setupComplete: "yes",
                    welcomeChannelID: welcomeChannelID,
                    autoRoleRoleID: autoRoleRoleID,
                    listOfFieldsForRegistration: listOfFieldsForRegistration,
                    nicknameTemplate: nicknameTemplate,
                    channelTemplate: channelTemplate.split(" ").join("-"),
                    channelCategory: channelCategory
                })
            })
        })
    }
}

module.exports = ServerInitSetup