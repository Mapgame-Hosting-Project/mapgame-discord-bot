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
                //check for user's nation application status (if it exists)

                var userCheckRef = this.db.ref(this.guildID + "/nationApplications/" + msg.member.id + "/status")
                userCheckRef.once("value", (snapshot) => {
                    var ableToContinueRegistration

                    switch (snapshot.val()) {
                        case "accepted":
                            msg.channel.send("You are already a nation! Ask an admin if you can swap nations or create a new one.")
                            ableToContinueRegistration = false
                            break;

                        case "rejected":
                            msg.channel.send("Bad news: your original application was rejected. Good news: that means you can submit a new one!")
                            ableToContinueRegistration = true
                            break;

                        case "pendingApproval":
                            msg.channel.send("You're old application is still pending...type " + this.config.prefix + "cancel-registration to cancel it, then run this command again.")
                            ableToContinueRegistration = false
                            break;

                        case "cancelled":
                            ableToContinueRegistration = true
                            break;

                        default:
                            ableToContinueRegistration = true
                            break;
                    }

                    switch (ableToContinueRegistration) {
                        case true:
                            var listOfFieldsForRegistrationRef = this.db.ref(this.guildID + "/config/listOfFieldsForRegistration")
                            listOfFieldsForRegistrationRef.once("value", (snapshot) => {
                                var listOfFieldsForRegistration = snapshot.val()

                                // create collector that only receives messages from same user, then process form once it has been sent

                                var filter = m => m.member.id === msg.member.id
                                var formAnswerCollector = msg.channel.createMessageCollector(filter)

                                msg.channel.send("Fill out the following details about your nation. Send \"cancel\" at any time to cancel the registration process.")

                                msg.channel.send(listOfFieldsForRegistration[0] + ":")

                                formAnswerCollector.on("collect", cMsg => {
                                    console.log(formAnswerCollector.collected.size)
                                    console.log(listOfFieldsForRegistration.length)

                                    if (cMsg.content.toLowerCase() == "cancel") {
                                        formAnswerCollector.stop()

                                        cMsg.channel.send("Registration cancelled.")

                                        return
                                    }

                                    if (formAnswerCollector.collected.size == listOfFieldsForRegistration.length) {
                                        formAnswerCollector.stop()

                                        return
                                    }

                                    cMsg.channel.send(listOfFieldsForRegistration[formAnswerCollector.collected.size] + ":")
                                })

                                formAnswerCollector.on("end", collected => {
                                    if (collected.array()[collected.array().length - 1].content.toLowerCase() == "cancel") {
                                        return
                                    }

                                    try {
                                        var answers = []
                                        collected.array().forEach(message => {
                                            answers.push(message.content)
                                        });

                                        var formJSONObject = {
                                            fields: {}
                                        }
                                        console.log(listOfFieldsForRegistration)
                                        for (var i = 0; i < listOfFieldsForRegistration.length; i++) {
                                            formJSONObject.fields[listOfFieldsForRegistration[i]] = answers[i]
                                            console.log(listOfFieldsForRegistration[i] + ": " + answers[i])
                                        }
                                        formJSONObject["status"] = "pendingApproval"

                                        var serverTypeCheckRef = this.db.ref(this.guildID + "/config/customOrIrlNation")
                                        serverTypeCheckRef.once("value", (snapshot) => {
                                            switch (snapshot.val()) {
                                                case "custom":
                                                    // ask for map claim, then submit form

                                                    var filter2 = m => m.member.id === msg.member.id
                                                    var mapClaimCollector = msg.channel.createMessageCollector(filter2)

                                                    msg.channel.send("Now to do your initial map claim. Follow the instructions below.")
                                                    var embed = new this.Discord.MessageEmbed()
                                                        .setColor("#009900")
                                                        .setTitle("Map claim instructions")
                                                        .addField("How to get your map claim code", "Visit the website [here](https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html) and follow the instructions to generate your mapgame code.")
                                                        .addField("Ok... what now?", "Simply copy paste that code and send it here! Once you've done that, you will get a confirmation message.")
                                                    msg.channel.send(embed)

                                                    mapClaimCollector.on("collect", cMsg => {
                                                        switch (mapClaimCollector.collected.size) {
                                                            case 1:
                                                                cMsg.channel.send("Generating map claim preview... (this may take a while)")

                                                                this.mapgameBotUtilFunctions.generateMapFromMapCode(cMsg.content).then(mapPath => {
                                                                    if (mapPath == "error parsing map code") {
                                                                        mapClaimCollector.collected.delete(mapClaimCollector.collected.lastKey())

                                                                        cMsg.channel.send("Invalid map code. Send another map claim code from the website (https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html).")

                                                                        return
                                                                    }

                                                                    cMsg.channel.send("Is this claim ok? (yes/no)", { files: [mapPath] })
                                                                })
                                                                break;

                                                            case 2:
                                                                if (cMsg.content.toLowerCase() == "yes" || cMsg.content.toLowerCase() == "y") {
                                                                    mapClaimCollector.stop()
                                                                } else {
                                                                    mapClaimCollector.collected.delete(mapClaimCollector.collected.lastKey())
                                                                    mapClaimCollector.collected.delete(mapClaimCollector.collected.lastKey())

                                                                    cMsg.channel.send("Send another map claim code from the website (https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html).")
                                                                }
                                                                break;

                                                            default:
                                                                break;
                                                        }
                                                    })

                                                    mapClaimCollector.on("end", collected => {
                                                        formJSONObject["mapClaimCode"] = collected.array()[0].content

                                                        var ref = this.db.ref(this.guildID + "/nationApplications/" + msg.member.id)
                                                        ref.update(formJSONObject)

                                                        RegisterNation.sendApplicationToModReviewChannel(this.guildID, ref, this.db, this.mapgameBotUtilFunctions, listOfFieldsForRegistration)

                                                        collected.array()[0].channel.send("Done! Your registration form is now submitted. To cancel it, type \"" + this.config.prefix + "cancel-registration\".")
                                                    })
                                                    break;

                                                case "irl":
                                                    // submit form

                                                    var ref = this.db.ref(this.guildID + "/nationApplications/" + msg.member.id)
                                                    ref.update(formJSONObject)

                                                    RegisterNation.sendApplicationToModReviewChannel(this.guildID, ref, this.db, this.mapgameBotUtilFunctions, listOfFieldsForRegistration)

                                                    collected.array()[0].channel.send("Done! Your registration form is now submitted. To cancel it, type \"" + this.config.prefix + "cancel-registration\".")
                                                    break;

                                                default:
                                                    break;
                                            }
                                        })

                                        console.log(formJSONObject)
                                    } catch (e) {
                                        console.log(e)
                                        collected.array()[0].channel.send("Whoops! There was something wrong with submitting your form. Type \"" + this.config.prefix + "register\" to try again.")

                                        var ref = this.db.ref(this.guildID + "/nationApplications/" + msg.member.id)
                                        ref.remove()
                                    }
                                })
                            })
                            break;

                        case false:
                            msg.channel.send("Registration cancelled.")
                            return

                        default:
                            break;
                    }
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

            var ref = db.ref(guildID + "/config/channelToSendApplicationsToID")
            ref.once("value", (snapshot) => {
                var channelToSendApplicationEmbedTo = mapgameBotUtilFunctions.getChannelFromMention("<#" + snapshot.val() + ">")

                var ref2 = db.ref(guildID + "/config/roleRequiredToProcessApplicationsID")
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
                                                message.guild.members.cache.find(member => member.id == applicationDbRef.key).setNickname(mapgameBotUtilFunctions.replaceTemplateWithFieldValues(snapshot3.val().nicknameTemplate, listOfFieldsForRegistration, snapshot4.val().fields)).catch(error => console.log(error))
                                            }

                                            if (snapshot3.val().channelTemplate != "skip") {
                                                var channelName = mapgameBotUtilFunctions.replaceTemplateWithFieldValues(snapshot3.val().channelTemplate, listOfFieldsForRegistration, snapshot4.val().fields)
                                                message.guild.channels.create(channelName).then(channel => {
                                                    channel.setParent(message.guild.channels.cache.find(channel => channel.name.toLowerCase() == snapshot3.val().channelCategory).id)
                                                })
                                            }

                                            var nationJSONObject = { fields: {} }
                                            nationJSONObject.fields = snapshot4.val().fields
                                            nationJSONObject.mapClaimCode = snapshot4.val().mapClaimCode
                                            var ref4 = db.ref(guildID + "/nations")
                                            ref4.update({
                                                [applicationDbRef.key]: nationJSONObject
                                            })
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