class RegisterNation {
    constructor(db, guildID, mapgameBotUtilFunctions, config) {
        this.Discord = require("discord.js")

        this.mapgameBotUtilFunctions = mapgameBotUtilFunctions
        this.config = config
        this.db = db
        this.guildID = guildID
        this.request = require("request")
    }

    start(msg) {
        var checkRef = this.db.ref("discord-servers/" + this.guildID + "/config/setupComplete")
        checkRef.once("value", (snapshot) => {
            if (snapshot.val() == "yes") {
                //check for user's nation application status (if it exists)

                var userCheckRef = this.db.ref("discord-servers/" + this.guildID + "/nationApplications/" + msg.member.id + "/status")
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
                            var listOfFieldsForRegistrationRef = this.db.ref("discord-servers/" + this.guildID + "/config/listOfFieldsForRegistration")
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

                                        var serverTypeCheckRef = this.db.ref("discord-servers/" + this.guildID + "/config/customOrIrlNation")
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
                                                        .addField("How to get your map claim code", "Visit the website [here](https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html) and follow the instructions to generate your mapgame code file.")
                                                        .addField("Ok... what now?", "Simply send the file you downloaded from the site here! Once you've done that, you will get a confirmation message.")
                                                    msg.channel.send(embed)

                                                    mapClaimCollector.on("collect", cMsg => {
                                                        if (cMsg.content.toLowerCase() == "cancel") {
                                                            formAnswerCollector.stop()

                                                            cMsg.channel.send("Registration cancelled.")

                                                            return
                                                        }

                                                        switch (mapClaimCollector.collected.size) {
                                                            case 1:
                                                                cMsg.channel.send("Generating map claim preview... (this may take a while)")

                                                                var parentThis = this

                                                                this.request.get(cMsg.attachments.array()[0].url, function(error, response, body) {
                                                                    if (!error && response.statusCode == 200) {
                                                                        var mapClaimCode = body

                                                                        parentThis.mapgameBotUtilFunctions.generateMapFromMapCode(mapClaimCode).then(mapPath => {
                                                                            if (mapPath == "error parsing map code") {
                                                                                mapClaimCollector.collected.delete(mapClaimCollector.collected.lastKey())

                                                                                cMsg.channel.send("Invalid map code. Send another map claim code from [the website](https://phyrik.github.io/mapgame-discord-bot/map-province-picker.html).")

                                                                                return
                                                                            }

                                                                            cMsg.channel.send("Is this claim ok? (yes/no)", { files: [mapPath] })
                                                                        })
                                                                    }
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
                                                        if (collected.array()[collected.array().length - 1].content.toLowerCase() == "cancel") {
                                                            return
                                                        }

                                                        var parentThis = this

                                                        this.request.get(collected.array()[0].attachments.array()[0].url, function(error, response, body) {
                                                            formJSONObject["mapClaimCode"] = body

                                                            var ref = parentThis.db.ref("discord-servers/" + parentThis.guildID + "/nationApplications/" + msg.member.id)
                                                            ref.update(formJSONObject)

                                                            collected.array()[0].channel.send("Done! Your registration form is now submitted. To cancel it, type \"" + parentThis.config.prefix + "cancel-registration\".")
                                                        })
                                                    })
                                                    break;

                                                case "irl":
                                                    // submit form

                                                    var ref = this.db.ref("discord-servers/" + this.guildID + "/nationApplications/" + msg.member.id)
                                                    ref.update(formJSONObject)

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

                                        var ref = this.db.ref("discord-servers/" + this.guildID + "/nationApplications/" + msg.member.id)
                                        ref.remove()
                                    }
                                })
                            })
                            break;

                        case false:
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

    static setupFirebaseValueChecksForNationApplicationsAndNationCreation(db, client, guildID, mapgameBotUtilFunctions) {
        var ref = db.ref("discord-servers/" + guildID + "/nationApplications")
        ref.once("value", (snapshot) => {
            Object.keys(snapshot.val()).forEach(userID => {
                db.ref("discord-servers/" + guildID + "/nationApplications/" + userID + "/status").on("value", (snapshot) => {
                    switch (snapshot.val()) {
                        case "accepted":
                            client.users.cache.get(userID).send("Your nation application for the server \"" + client.guilds.cache.get(guildID).name + "\" has been accepted!")

                            db.ref("discord-servers/" + guildID + "/config").once("value", (snapshot1) => {
                                db.ref("discord-servers/" + guildID + "/nationApplications/" + userID).once("value", (snapshot2) => {
                                    if (snapshot1.val().nicknameTemplate) {
                                        client.guilds.cache.get(guildID).members.cache.get(userID).setNickname(mapgameBotUtilFunctions.replaceTemplateWithFieldValues(snapshot1.val().nicknameTemplate, snapshot1.val().listOfFieldsForRegistration, snapshot2.val().fields)).catch(error => console.log(error))
                                    }
                                    if (snapshot1.val().channelTemplate) {
                                        var channelName = mapgameBotUtilFunctions.replaceTemplateWithFieldValues(snapshot1.val().channelTemplate, snapshot1.val().listOfFieldsForRegistration, snapshot2.val().fields)
                                        client.guilds.cache.get(guildID).channels.create(channelName).then(channel => {
                                            channel.setParent(client.guilds.cache.get(guildID).channels.cache.get(snapshot1.val().categoryToAddNationChannelsToID))
                                            channel.send()
                                        })
                                    }

                                    db.ref("discord-servers/" + guildID + "/nations").update({
                                        [userID]: snapshot2.val()
                                    })

                                    db.ref("discord-servers/" + guildID + "/nations/" + userID + "/status").update("active")
                                })
                            })
                            break;

                        case "pendingApproval":
                            // do nothing
                            break;

                        case "cancelled":
                            // do nothing
                            break;

                        case "rejected":
                            client.users.cache.find(user => user.id === userID).send("Your nation application for the server \"" + client.guilds.cache.get(guildID).name + "\" has been rejected.")
                            break;

                        default:
                            break;
                    }
                })
            })
        })

        var ref1 = db.ref("discord-servers/" + guildID + "/nations")
        ref1.on("value", (snapshot) => {

        })
    }
}

module.exports = RegisterNation