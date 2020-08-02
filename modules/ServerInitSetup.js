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

        msg.channel.send("I'm going to ask you a couple questions to help setup your server with the bot. Send \"cancel\" at any time to cancel the setup process.")
        msg.channel.send("What channel should I welcome new members in? (make sure to have the channel name mentioned, highlighted blue)")

        collector1.on("collect", cMsg => {
            console.log(collector1.collected.size)

            if (cMsg.content.toLowerCase() == "cancel") {
                collector1.stop()

                cMsg.channel.send("Setup cancelled.")

                return
            }

            switch (collector1.collected.size) {
                case 1:
                    if (this.mapgameBotUtilFunctions.getChannelFromMention(cMsg.content) == "invalid mention") {
                        cMsg.channel.send("Invalid channel.")
                        collector1.collected.delete(collector1.collected.lastKey())
                        msg.channel.send("What channel should I welcome new members in? (make sure to have the channel name mentioned, highlighted blue)")
                        break;
                    }

                    if (!this.client.guilds.cache.get(this.guildID).members.cache.get(this.client.user.id).permissionsIn(this.mapgameBotUtilFunctions.getChannelFromMention(cMsg.content)).has("VIEW_CHANNEL")) {
                        cMsg.channel.send("It seems I can't find that channel...make sure I have the correct permissions to view that channel.")
                        collector1.collected.delete(collector1.collected.lastKey())
                        msg.channel.send("What channel should I welcome new members in? (make sure to have the channel name mentioned, highlighted blue)")
                        break;
                    }

                    cMsg.channel.send("What role should I give members when they join? Make sure to mention the role. To skip this step, send a message with \"skip\".")
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
            if (collector1Collected.array()[collector1Collected.array().length - 1].content == "cancel") {
                return
            }

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

                if (cMsg.content.toLowerCase() == "cancel") {
                    collector2.stop()

                    cMsg.channel.send("Setup cancelled.")

                    return
                }

                switch (collector2.collected.size) {
                    case 1:
                        if (cMsg.content.toLowerCase() == "done") {
                            cMsg.channel.send("Done. Form completed.")

                            cMsg.channel.send("What channel should I send nation applications in for moderator review? If you don't have one, please create one before answering this question. (make sure to have the channel name mentioned, highlighted blue)")

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
                        if (this.mapgameBotUtilFunctions.getChannelFromMention(cMsg.content) == "invalid mention") {
                            cMsg.channel.send("Invalid channel.")
                            collector2.collected.delete(collector2.collected.lastKey())
                            cMsg.channel.send("What channel should I send nation applications in for moderator review? (make sure to have the channel name mentioned, highlighted blue)")
                            break;
                        }

                        if (!this.client.guilds.cache.get(this.guildID).members.cache.get(this.client.user.id).permissionsIn(this.mapgameBotUtilFunctions.getChannelFromMention(cMsg.content)).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) {
                            cMsg.channel.send("It seems I can't find that channel...make sure I have the correct permissions to view that channel and send messages in it.")
                            collector2.collected.delete(collector2.collected.lastKey())
                            cMsg.channel.send("What channel should I send nation applications in for moderator review? (make sure to have the channel name mentioned, highlighted blue)")
                            break;
                        }

                        cMsg.channel.send("What role should moderators have to have to be able to accept or reject nation applications? Make sure to mention the role.")
                        break;

                    case 3:
                        if (this.mapgameBotUtilFunctions.getUserFromMention(cMsg.content, true, this.client.guilds.cache.get(this.guildID)) == "invalid mention") {
                            cMsg.channel.send("Invalid role.")
                            collector2.collected.delete(collector2.collected.lastKey())
                            msg.channel.send("What role should moderators have to have to be able to accept or reject nation applications? Make sure to mention the role.")
                            break;
                        }

                        cMsg.channel.send("Ok, now we're getting down to the good stuff... Set up members' custom nicknames following the instructions below:")
                        var embed2 = new this.Discord.MessageEmbed()
                            .setColor("#009900")
                            .setTitle("Custom nickname setup")
                            .addField("Instructions:", "Send a message of how members' nicknames should change after registering below. To insert an answer from a field type '[fieldname]'. To insert the member's original username type '[username]'")
                            .addField("Example:", "If I have a field called 'Nation name', I could send \"[username] | [Nation name]\" which would turn in to, for example, 'Mapgame Bot | My Epic Nation Name'.")
                            .addField("Don't want to do this step?", "If so, simply send \"skip\"")
                        cMsg.channel.send(embed2)
                        break;

                    case 4:
                        if (cMsg.content.toLowerCase() == "skip") {
                            cMsg.channel.send("Done! Nickname template skipped.")
                            cMsg.channel.send("When a member registers a new nation, should a channel be created for that nation? (yes/no)")

                            return
                        }

                        var nicknameTemplateCheck = this.mapgameBotUtilFunctions.checkFieldNameTemplateValidity(cMsg.content, listOfFieldsForRegistration)
                        console.log(nicknameTemplateCheck)

                        if (nicknameTemplateCheck[1] == false) {
                            collector2.collected.delete(collector2.collected.lastKey())

                            cMsg.channel.send("Something went wrong with processing that nickname template...try making sure it is valid and everything is spelt right, then send it again.")

                            return
                        } else if (nicknameTemplateCheck[1] == true) {
                            collector2.collected.get(collector2.collected.lastKey()).content = nicknameTemplateCheck[0]

                            cMsg.channel.send("Done! Nickname template completed.")
                            cMsg.channel.send("When a member registers a new nation, should a channel be created for that nation? (yes/no)")

                            return
                        }
                        break;

                    case 5:
                        if (cMsg.content.toLowerCase() == "yes") {
                            nationChannelBool = true

                            cMsg.channel.send("Ok, follow the instructions below to set it up.")
                            var embed2 = new this.Discord.MessageEmbed()
                                .setTitle("Custom nation channel setup")
                                .setColor("#009900")
                                .addField("Instructions:", "Send a message of what the channel will be called. Use the same method as with nicknames to add answers from the form, surrounding the field name with square brackets. All spaces will be turned to dashes ('-') when the channel is created.")
                                .addField("Don't want to do this step?", "I literally just asked you- fine. Send \"skip\" and you'll be on your way.")
                            cMsg.channel.send(embed2)

                            return
                        } else if (cMsg.content.toLowerCase() == "no") {
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

                    case 6:
                        if (cMsg.content.toLowerCase() == "skip") {
                            nationChannelBool = false

                            cMsg.channel.send("Done! Channel template skipped.")
                            cMsg.channel.send("Your server is now setup. Type " + this.config.prefix + "help to see a list of commands you can use.")

                            collector2.stop()

                            return
                        }

                        var channelTemplateTemp = cMsg.content
                        if (channelTemplateTemp.startsWith("#")) {
                            channelTemplateTemp = channelTemplateTemp.slice(1)
                        }

                        console.log(channelTemplateTemp)

                        var channelTemplateCheck = this.mapgameBotUtilFunctions.checkFieldNameTemplateValidity(channelTemplateTemp, listOfFieldsForRegistration, false)
                        channelTemplateTemp = channelTemplateCheck[0]

                        console.log(channelTemplateCheck)

                        if (channelTemplateCheck[1] == false) {
                            collector2.collected.delete(collector2.collected.lastKey())

                            cMsg.channel.send("Something went wrong with processing that channel template...try making sure it is valid and everything is spelt right, then send it again.")

                            return

                        } else
                        if (channelTemplateCheck[1] == true) {
                            collector2.collected.get(collector2.collected.lastKey()).content = channelTemplateTemp

                            cMsg.channel.send("Done! Channel template completed.")
                            cMsg.channel.send("What is the name of the channel category I should add new members' nations' channels to?")

                            return
                        }
                        break;

                    case 7:
                        if (!this.client.guilds.cache.get(this.guildID).members.cache.get(this.client.user.id).permissionsIn(this.client.guilds.cache.get(this.guildID).channels.cache.find(channel => channel.name.toLowerCase() == cMsg.content.toLowerCase())).has("VIEW_CHANNEL")) {
                            cMsg.channel.send("It seems I can't find that channel...make sure I have the correct permissions to view that channel.")
                            collector2.collected.delete(collector2.collected.lastKey())
                            cMsg.channel.send("What channel should I send nation applications in for moderator review? (make sure to have the channel name mentioned, highlighted blue)")
                            break;
                        }

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

                if (collector2Collected.array()[collector2Collected.array().length - 1].content.toLowerCase() == "cancel") {
                    return
                }

                var welcomeChannelID = this.mapgameBotUtilFunctions.getChannelFromMention(collector1Collected.array()[0].content).id
                var autoRoleRoleID = this.mapgameBotUtilFunctions.getUserFromMention(collector1Collected.array()[1].content, true, this.client.guilds.cache.get(this.guildID)).id
                var nicknameTemplate = collector2Collected.array()[3].content
                var channelTemplate
                var channelCategory
                switch (nationChannelBool) {
                    case true:
                        channelTemplate = collector2Collected.array()[5].content
                        channelCategory = collector2Collected.array()[6].content
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
                var channelToSendNationApplicationsToID = this.mapgameBotUtilFunctions.getChannelFromMention(collector2Collected.array()[1].content).id
                this.client.guilds.cache.get(this.guildID).channels.cache.get(channelToSendNationApplicationsToID).createOverwrite(this.client.guilds.cache.get(this.guildID).roles.everyone, { SEND_MESSAGES: false })
                this.client.guilds.cache.get(this.guildID).channels.cache.get(channelToSendNationApplicationsToID).createOverwrite(this.client.user, { SEND_MESSAGES: true })
                var roleNeededToProcessNationApplicationsID = this.mapgameBotUtilFunctions.getUserFromMention(collector2Collected.array()[2].content, true, this.client.guilds.cache.get(this.guildID)).id

                var ref2 = this.db.ref(this.guildID + "/config")
                ref2.update({
                    setupComplete: "yes",
                    welcomeChannelID: welcomeChannelID,
                    autoRoleRoleID: autoRoleRoleID,
                    listOfFieldsForRegistration: listOfFieldsForRegistration,
                    nicknameTemplate: nicknameTemplate,
                    channelTemplate: channelTemplate,
                    channelCategory: channelCategory.toLowerCase(),
                    channelToSendNationApplicationsToID: channelToSendNationApplicationsToID,
                    roleNeededToProcessNationApplicationsID: roleNeededToProcessNationApplicationsID
                })
            })
        })
    }
}

module.exports = ServerInitSetup