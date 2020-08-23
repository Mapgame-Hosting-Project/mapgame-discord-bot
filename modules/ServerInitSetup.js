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

                    cMsg.channel.send("What role should I give members when they join? Make sure to mention the role.")
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

            var filter2 = m => m.member.id === msg.member.id
            var collector2 = msg.channel.createMessageCollector(filter2)

            msg.channel.send("What channel should I send nation applications in for moderator review? (make sure to have the channel name mentioned, highlighted blue)")

            var listOfFieldsForRegistration = []
            var checkBool1
            var embedMessage
            var embed1
            collector2.on("collect", cMsg => {
                console.log(collector2.collected.size)

                if (cMsg.content.toLowerCase() == "cancel") {
                    collector2.stop()

                    cMsg.channel.send("Setup cancelled.")

                    return
                }

                switch (collector2.collected.size) {
                    case 1:
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

                    case 2:
                        if (this.mapgameBotUtilFunctions.getUserFromMention(cMsg.content, true, this.client.guilds.cache.get(this.guildID)) == "invalid mention") {
                            cMsg.channel.send("Invalid role.")
                            collector2.collected.delete(collector2.collected.lastKey())
                            msg.channel.send("What role should moderators have to have to be able to accept or reject nation applications? Make sure to mention the role.")
                            break;
                        }

                        msg.channel.send("What information about a member's nation will they have to provide when registering?")
                        embed1 = new this.Discord.MessageEmbed()
                            .setColor("#009900")
                            .setTitle("Configure registration form")
                            .addField("Instructions:", "Send what fields you want on your registration form. Type 'done' when you are done. PS: Don't include a field about map claims or country colour, the bot will handle that all for you!")
                            .addField("Form:", "None")
                        msg.channel.send(embed1).then(message => {
                            embedMessage = message
                        })
                        break;

                    case 3:
                        if (cMsg.content.toLowerCase() == "done") {
                            cMsg.channel.send("Done. Form completed.")

                            cMsg.channel.send("Ok, now we're getting down to the good stuff... Set up members' custom nicknames following the instructions below:")
                            var embed2 = new this.Discord.MessageEmbed()
                                .setColor("#009900")
                                .setTitle("Custom nickname setup")
                                .addField("Instructions:", "Send a message of how members' nicknames should change after registering below. To insert an answer from a field in their form type '[fieldname]'. To insert the member's original username type '[username]'")
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

                    case 4:
                        if (cMsg.content.toLowerCase() == "skip") {
                            cMsg.channel.send("Done! Nickname template skipped.")

                            cMsg.channel.send("Now we're going to set up custom channels for nations.")
                            var embed2 = new this.Discord.MessageEmbed()
                                .setTitle("Custom nation channel setup")
                                .setColor("#009900")
                                .addField("Instructions:", "Send a message of what the channel will be called. Use the same method as with nicknames to add answers from the form, surrounding the field name with square brackets. All spaces will be turned to dashes ('-') when the channel is created.")
                                .addField("Don't want to do this step?", "If so, simply send \"skip\"")
                            cMsg.channel.send(embed2)

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

                            cMsg.channel.send("Now we're going to set up custom channels for nations.")
                            var embed2 = new this.Discord.MessageEmbed()
                                .setTitle("Custom nation channel setup")
                                .setColor("#009900")
                                .addField("Instructions:", "Send a message of what the channel will be called. Use the same method as with nicknames to add answers from the form, surrounding the field name with square brackets. All spaces will be turned to dashes ('-') when the channel is created.")
                                .addField("Don't want to do this step?", "If so, simply send \"skip\"")
                            cMsg.channel.send(embed2)

                            return
                        }
                        break;

                    case 5:
                        if (cMsg.content.toLowerCase() == "skip") {
                            cMsg.channel.send("Done! Channel template skipped.")

                            var embed3 = new this.Discord.MessageEmbed()
                                .setTitle("Is your server a custom nation rp or an irl nation rp?")
                                .setColor("#009900")
                                .addField("Custom nation rp", "This is a type of roleplay where members choose a nation by picking tiles from a map and expanding a certain amount each day.")
                                .addField("IRL nation rp", "This is a type of roleplay where members choose from a predefined list of nations, for example the countries that fought during world war 2, and can only expand by conquering more territory.")
                                .addField("Instructions", "Send \"1\" for custom nation rp and \"2\" for an IRL nation rp")
                            cMsg.channel.send(embed3)

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
                            cMsg.channel.send("What is the name of the channel category I should add new nations' channels to?")

                            return
                        }
                        break;

                    case 6:
                        switch (collector2.collected.array()[4].content) {
                            case "skip": // user skipped channel template, their cMsg is in response to custom/irl nation question
                                switch (cMsg.content) {
                                    case "1": // custom nation
                                        cMsg.channel.send("How many tiles should nations be able to claim each day?")

                                        checkBool1 = true
                                        break;

                                    case "2": // irl nation
                                        cMsg.channel.send("Ok. I won't ask nations for map claims daily, or when registering their nation.")

                                        collector2.stop()

                                        cMsg.channel.send("Your server is now setup. Type " + this.config.prefix + "help to see a list of commands you can use.")
                                        break;

                                    default:
                                        collector2.collected.delete(collector2.collected.lastKey())
                                        var embed3 = new this.Discord.MessageEmbed()
                                            .setTitle("Is your server a custom nation rp or an irl nation rp?")
                                            .setColor("#009900")
                                            .addField("Custom nation rp", "This is a type of roleplay where members choose a nation by picking tiles from a map and expanding a certain amount each day.")
                                            .addField("IRL nation rp", "This is a type of roleplay where members choose from a predefined list of nations, for example the countries that fought during world war 2, and can only expand by conquering more territory.")
                                            .addField("Instructions", "Send \"1\" for custom nation rp and \"2\" for an IRL nation rp")
                                        cMsg.channel.send(embed3)
                                        break;
                                }
                                break;

                            default: // user did not skip channel template, their cMsg is the category to add nation channels to
                                try {
                                    if (!this.client.guilds.cache.get(this.guildID).members.cache.get(this.client.user.id).permissionsIn(this.client.guilds.cache.get(this.guildID).channels.cache.find(channel => channel.name.toLowerCase() == cMsg.content.toLowerCase())).has(["VIEW_CHANNEL", "MANAGE_CHANNELS"])) {
                                        cMsg.channel.send("It seems I can't find that channel category...make sure I have the correct permissions to view that channel and manage its channels.")
                                        collector2.collected.delete(collector2.collected.lastKey())
                                        cMsg.channel.send("What is the name of the channel category I should add new nations' channels to?")
                                        break;
                                    }
                                } catch {
                                    cMsg.channel.send("It seems I can't find that channel category...make sure I have the correct permissions to view that channel and manage its channels.")
                                    collector2.collected.delete(collector2.collected.lastKey())
                                    cMsg.channel.send("What is the name of the channel category I should add new nations' channels to?")
                                    break;
                                }

                                var embed3 = new this.Discord.MessageEmbed()
                                    .setTitle("Is your server a custom nation rp or an irl nation rp?")
                                    .setColor("#009900")
                                    .addField("Custom nation rp", "This is a type of roleplay where members choose a nation by picking tiles from a map and expanding a certain amount each day.")
                                    .addField("IRL nation rp", "This is a type of roleplay where members choose from a predefined list of nations, for example the countries that fought during world war 2, and can only expand by conquering more territory.")
                                    .addField("Instructions", "Send \"1\" for custom nation rp and \"2\" for an IRL nation rp")
                                cMsg.channel.send(embed3)

                                checkBool1 = false
                                break;
                        }
                        break;

                    case 7:
                        if (checkBool1) {
                            if (isNaN(cMsg.content)) {
                                // cMsg is not a number

                                collector2.collected.delete(collector2.collected.lastKey())
                                cMsg.channel.send("Hmm...I don't think that's a number. Try sending a valid number again")

                                return
                            }

                            collector2.stop()

                            cMsg.channel.send("Your server is now setup. Type " + this.config.prefix + "help to see a list of commands you can use.")

                            return
                        }

                        switch (cMsg.content) {
                            case "1": // custom nation
                                cMsg.channel.send("How many tiles should nations be able to claim each day?")
                                break;

                            case "2": // irl nation
                                cMsg.channel.send("Ok. I won't ask nations for map claims daily, or when registering their nation.")

                                collector2.stop()

                                cMsg.channel.send("Your server is now setup. Type " + this.config.prefix + "help to see a list of commands you can use.")
                                break;

                            default:
                                collector2.collected.delete(collector2.collected.lastKey())
                                var embed3 = new this.Discord.MessageEmbed()
                                    .setTitle("Is your server a custom nation rp or an irl nation rp?")
                                    .setColor("#009900")
                                    .addField("Custom nation rp", "This is a type of roleplay where members choose a nation by picking tiles from a map and expanding a certain amount each day.")
                                    .addField("IRL nation rp", "This is a type of roleplay where members choose from a predefined list of nations, for example the countries that fought during world war 2, and can only expand by conquering more territory.")
                                    .addField("Instructions", "Send \"1\" for custom nation rp and \"2\" for an IRL nation rp")
                                cMsg.channel.send(embed3)
                                break;
                        }
                        break;

                    case 8:
                        if (isNaN(cMsg.content)) {
                            // cMsg is not a number

                            collector2.collected.delete(collector2.collected.lastKey())
                            cMsg.channel.send("Hmm...I don't think that's a number. Try sending a valid number again")

                            return
                        }

                        collector2.stop()

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

                var channelToSendApplicationsToID = this.mapgameBotUtilFunctions.getChannelFromMention(collector2Collected.array()[0].content).id
                var roleRequiredToProcessApplicationsID = this.mapgameBotUtilFunctions.getUserFromMention(collector2Collected.array()[1].content, true, this.client.guilds.cache.get(this.guildID)).id
                var nicknameTemplate = collector2Collected.array()[3].content
                var channelTemplate = collector2Collected.array()[4].content
                var categoryToAddNationChannelsToID
                if (collector2Collected.array()[4].content != "skip") {
                    categoryToAddNationChannelsToID = this.client.guilds.cache.get(this.guildID).channels.cache.find(c => c.name.toLowerCase() == collector2Collected.array()[5].content.toLowerCase()).id
                } else {
                    categoryToAddNationChannelsToID = "skip"
                }
                var customOrIrlNation
                if (collector2Collected.array()[4].content == "skip") {
                    // custom/irl nation indicator stored in index 5
                    switch (collector2Collected.array()[5].content) {
                        case "1":
                            customOrIrlNation = "custom"
                            break;

                        case "2":
                            customOrIrlNation = "irl"
                            break;

                        default:
                            break;
                    }
                } else {
                    // custom/irl nation indicator stored in index 6
                    switch (collector2Collected.array()[6].content) {
                        case "1":
                            customOrIrlNation = "custom"
                            break;

                        case "2":
                            customOrIrlNation = "irl"
                            break;

                        default:
                            break;
                    }
                }
                var numberOfTilesToClaimEachDay
                if (customOrIrlNation == "custom") {
                    if (checkBool1) {
                        numberOfTilesToClaimEachDay = collector2Collected.array()[6].content
                    } else {
                        numberOfTilesToClaimEachDay = collector2Collected.array()[7].content
                    }
                } else {
                    numberOfTilesToClaimEachDay = "skip"
                }

                var ref2 = this.db.ref("discord-servers/" + this.guildID + "/config")
                ref2.update({
                    setupComplete: "yes",
                    welcomeChannelID: welcomeChannelID,
                    autoRoleRoleID: autoRoleRoleID,
                    channelToSendApplicationsToID: channelToSendApplicationsToID,
                    roleRequiredToProcessApplicationsID: roleRequiredToProcessApplicationsID,
                    listOfFieldsForRegistration: listOfFieldsForRegistration,
                    nicknameTemplate: nicknameTemplate, // may be "skip"
                    channelTemplate: channelTemplate, // may be "skip"
                    categoryToAddNationChannelsToID: categoryToAddNationChannelsToID, // may be "skip"
                    numberOfTilesToClaimEachDay: numberOfTilesToClaimEachDay, // may be "skip"
                    customOrIrlNation: customOrIrlNation // may be "custom" or "irl"
                })
            })
        })
    }
}

module.exports = ServerInitSetup