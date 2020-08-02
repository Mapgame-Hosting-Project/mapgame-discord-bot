class RegisterNation {
    constructor(db, guildID, mapgameBotUtilFunctions, config) {
        this.Discord = require("discord.js")

        this.mapgameBotUtilFunctions = mapgameBotUtilFunctions
        this.config = config
        this.db = db
        this.guildID = guildID
    }

    start(msg) {
        var checkRef = this.db.ref(this.guildID + "/config/setupComplete")
        checkRef.once("value", (snapshot) => {
            if (snapshot.val() == "yes") {
                var listOfFieldsForRegistration
                var ref = this.db.ref(this.guildID + "/config/listOfFieldsForRegistration")
                ref.once("value", (snapshot) => {
                    listOfFieldsForRegistration = snapshot.val()
                    console.log(listOfFieldsForRegistration)

                    // create collector that only receives messages from same user, then process form once it has been sent

                    var filter = m => m.member.id === msg.member.id
                    var collector = msg.channel.createMessageCollector(filter)

                    msg.channel.send("Fill out the following details about your nation. Send \"cancel\" at any time to cancel the registration process.")

                    msg.channel.send(listOfFieldsForRegistration[0] + ":")

                    collector.on("collect", cMsg => {
                        console.log(collector.collected.size)
                        console.log(listOfFieldsForRegistration.length)

                        if (cMsg.content.toLowerCase() == "cancel") {
                            collector.stop()

                            cMsg.channel.send("Registration cancelled.")

                            return
                        }

                        if (collector.collected.size == listOfFieldsForRegistration.length) {
                            cMsg.channel.send("Now to do your initial map claim. Follow the instructions below.")
                            var embed = new this.Discord.MessageEmbed()
                                .setColor("#009900")
                                .setTitle("Map claim instructions")
                                .addField("How to get your map claim code", "Visit the website [here](https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html) and follow the instructions to generate your mapgame code.")
                                .addField("Ok... what now?", "Simply copy paste that code and send it here! Once you've done that, you will get a confirmation message.")
                            cMsg.channel.send(embed)

                            return
                        }

                        if (collector.collected.size == listOfFieldsForRegistration.length + 1) {
                            cMsg.channel.send("Generating map claim preview... (this may take a while)")

                            this.mapgameBotUtilFunctions.generateMapFromMapCode(cMsg.content).then(mapPath => {
                                if (mapPath == "error parsing map code") {
                                    collector.collected.delete(collector.collected.lastKey())

                                    cMsg.channel.send("Invalid map code. Send another map claim code from the website (https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html).")

                                    return
                                }

                                cMsg.channel.send("Is this claim ok? (yes/no)", { files: [mapPath] })
                            })

                            return
                        }

                        if (collector.collected.size == listOfFieldsForRegistration.length + 2) {
                            if (cMsg.content.toLowerCase() == "yes" || cMsg.content.toLowerCase() == "y") {
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
                        if (collected.array()[collected.array().length - 1].content.toLowerCase() == "cancel") {
                            return
                        }

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

                            var ref = this.db.ref(this.guildID + "/nationApplications/" + msg.member.id)
                            ref.update(formJSONObject)

                            RegisterNation.sendApplicationToModReviewChannel(this.guildID, ref, this.db, this.mapgameBotUtilFunctions, listOfFieldsForRegistration)

                            collected.array()[0].channel.send("Done! Your registration form is now submitted. To cancel it, type \"" + this.config.prefix + "cancel-registration\".")
                        } catch (e) {
                            console.log(e)
                            collected.array()[0].channel.send("Whoops! There was something wrong with submitting your form. Type \"" + this.config.prefix + "register\" to try again.")

                            var ref = this.db.ref(this.guildID + "/nationApplications/" + msg.member.id)
                            ref.remove()
                        }
                    })
                })
            } else {
                msg.channel.send("This server hasn't been set up with us yet! Contact an admin and get them to run the command \"" + config.prefix + "init\".")
                return
            }
        })
    }

    static sendApplicationToModReviewChannel(guildID, applicationDbRef, db, mapgameBotUtilFunctions, listOfFieldsForRegistration) {
        var applicationEmbed

        this.constructApplicationReviewEmbed(applicationDbRef, mapgameBotUtilFunctions, listOfFieldsForRegistration).then(embed => {
            applicationEmbed = embed

            var ref = db.ref(guildID + "/config/channelToSendNationApplicationsToID")
            ref.once("value", (snapshot) => {
                var channelToSendApplicationEmbedTo = mapgameBotUtilFunctions.getChannelFromMention("<#" + snapshot.val() + ">")

                var ref2 = db.ref(guildID + "/config/roleNeededToProcessNationApplicationsID")
                ref2.once("value", (snapshot1) => {
                    var roleNeededID = snapshot1.val()

                    channelToSendApplicationEmbedTo.send(applicationEmbed).then(message => {
                        applicationDbRef.child("status").on("value", (snapshot2) => {
                            message.edit(applicationEmbed.spliceFields(listOfFieldsForRegistration.length, 1, { name: "Status:", value: snapshot2.val() }))

                            var client = mapgameBotUtilFunctions.client
                            var guildName = client.guilds.cache.find(guild => guild.id == guildID).name

                            switch (snapshot2.val()) {
                                case "accepted":
                                    client.users.cache.find(user => user.id == applicationDbRef.key).send("Your nation application for the server \"" + guildName + "\" has been accepted!")

                                    var ref3 = db.ref(guildID + "/config")
                                    ref3.once("value", (snapshot3) => {
                                        applicationDbRef.once("value", (snapshot4) => {
                                            if (snapshot3.val().nicknameTemplate != "skip") {
                                                message.guild.members.cache.find(member => member.id == applicationDbRef.key).setNickname(mapgameBotUtilFunctions.replaceTemplateWithFieldValues(snapshot3.val().nicknameTemplate, listOfFieldsForRegistration, snapshot4.val().fields))
                                            }

                                            if (snapshot3.val().channelTemplate != "skip") {
                                                var channelName = mapgameBotUtilFunctions.replaceTemplateWithFieldValues(snapshot3.val().channelTemplate, listOfFieldsForRegistration, snapshot4.val().fields)
                                                message.guild.channels.create(channelName).then(channel => {
                                                    channel.setParent(message.guild.channels.cache.find(channel => channel.name.toLowerCase() == snapshot3.val().channelCategory).id)
                                                })
                                            }
                                        })
                                    })
                                    break;

                                case "rejected":
                                    client.users.cache.find(user => user.id == applicationDbRef.key).send("Your nation application for the server \"" + guildName + "\" has been rejected.")
                                    break;

                                default:
                                    break;
                            }
                        })

                        message.react("✅")
                        message.react("❎")

                        var filter = (_reaction, user) => {
                            return message.guild.members.cache.find(member => member.id == user.id).roles.cache.find(role => role.id == roleNeededID)
                        }
                        var collector = message.createReactionCollector(filter)

                        collector.on("collect", (reaction, user) => {
                            switch (reaction.emoji.name) {
                                case "✅":
                                    applicationDbRef.child("lastAcceptedBy").set(user.id)
                                    applicationDbRef.child("status").set("accepted")
                                    break;

                                case "❎":
                                    applicationDbRef.child("lastRejectedBy").set(user.id)
                                    applicationDbRef.child("status").set("rejected")
                                    break;

                                default:
                                    break;
                            }

                            var userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id))
                            for (var reaction1 of userReactions.values()) {
                                reaction1.users.remove(user.id)
                            }
                        })
                    })
                })
            })
        })
    }

    static async constructApplicationReviewEmbed(applicationDbRef, mapgameBotUtilFunctions, listOfFieldsForRegistration) {
        var Discord = require("discord.js")

        var embed = new Discord.MessageEmbed()
            .setTitle("Nation application from " + mapgameBotUtilFunctions.getUserFromMention("<@" + applicationDbRef.key + ">").username)

        return new Promise((resolve, reject) => {
            applicationDbRef.once("value", (snapshot) => {
                listOfFieldsForRegistration.forEach(fieldName => {
                    embed.addField(fieldName, snapshot.val().fields[fieldName])
                });

                embed.addField("Status", snapshot.val().status)

                mapgameBotUtilFunctions.generateMapFromMapCode(snapshot.val().mapClaimCode).then(mapPath => {
                    embed.attachFiles([mapPath])

                    embed.addField("Map claim", "See attached image")

                    embed.setFooter("If you are a mod, use the reactions below to accept or reject this application.")

                    resolve(embed)
                })
            })
        })
    }
}

module.exports = RegisterNation