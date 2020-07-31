class RegisterNation {
    constructor(db, guildID, mapgameBotUtilFunctions, config) {
        this.Discord = require("discord.js")

        this.config = config
        this.db = db
        this.guildID = guildID
        this.mapgameBotUtilFunctions = mapgameBotUtilFunctions
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

                    msg.channel.send("Fill out the following details about your nation.")

                    msg.channel.send(listOfFieldsForRegistration[0] + ":")

                    collector.on("collect", cMsg => {
                        console.log(collector.collected.size)
                        console.log(listOfFieldsForRegistration.length)

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
                            cMsg.channel.send("Generating map claim preview...")

                            this.mapgameBotUtilFunctions.generateMapFromMapCode(cMsg.content).then(mapPath => {
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

                            var ref = this.db.ref(this.guildID + "/nationApplications/" + msg.member.id)
                            ref.update(formJSONObject)

                            collected.array()[0].channel.send("Done! Your registration form is now submitted. To cancel it, type" + this.config.prefix + "cancel-registration.")
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
    }
}

module.exports = RegisterNation