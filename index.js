const mhp = require("mapgame-hosting-project")
const config = require("./config.json")

const mapgameClient = new mhp.MapgameClient(config.token, config.firebase_token_path)

/*
mapgameClient.discordClient.on("guildMemberAdd", member => {
    var ref = mapgameClient.db.ref("discord-servers/" + member.guild.id + "/config")
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

mapgameClient.discordClient.on("message", msg => {
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

            var ref = mapgameClient.db.ref("discord-servers/" + guildID + "/config/setupComplete")
            ref.once("value", (snapshot) => {
                if (snapshot.val() == "yes") {
                    ref2 = mapgameClient.db.ref("discord-servers/" + guildID + "/config")
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

            mapgameClient.db.ref("discord-servers/" + guildID + "/config/setupComplete").once("value", (snapshot) => {
                if (snapshot.val() == "yes") {
                    msg.channel.send("This server is alerady set up! Type \"" + config.prefix + "uninit\" to uninitialise it.")
                } else {
                    var checkKey = mhp.MapgameBotUtilFunctions.makeCheckKey(5)
                    var url = `http://mapgame-hosting.crumble-technologies.co.uk//Create/DiscordServerSetup?guildID=${guildID}&userID=${msg.author.id}&checkKey=${checkKey}`

                    var ref = mapgameClient.db.ref("discord-check-keys/" + msg.author.id + "/create-guild")
                    ref.set(guildID + "|" + checkKey)

                    msg.channel.send("Check your DMs!")
                    msg.author.send("Click the link below to setup your server:\n" + url)

                    mapgameClient.db.ref("discord-servers/" + guildID + "/config/categoryToAddNationChannelsToID").on("value", (snapshot) => {
                        try {
                            mapgameClient.discordClient.guilds.cache.get(guildID).channels.cache.get(snapshot.val()).updateOverwrite(mapgameClient.discordClient.user, { MANAGE_CHANNELS: true })
                        } catch {

                        }
                    })
                }
            })
            break;

        case "rn":
        case "register":
        case "register-nation":
            var registerNation = new mhp.RegisterNation(mapgameClient.db, guildID, new mhp.MapgameBotUtilFunctions(mapgameClient.discordClient), config)
            registerNation.start(msg)
            break;

        case "cr":
        case "cancel-registration":
            var ref = mapgameClient.db.ref("discord-servers/" + guildID + "/nationApplications/" + msg.member.id)
            ref.update({
                status: "cancelled"
            })

            msg.channel.send("Done! Your nation registration has been cancelled.")
            break;

        case "stats":
            var listOfNationsKeys = []
            var ref = mapgameClient.db.ref("discord-servers/" + guildID + "/nations")
            ref.once("value", (snapshot) => {
                if (!snapshot.exists()) {
                    msg.channel.send("No nations found.")
                    return
                } else {
                    Object.keys(snapshot.val()).forEach(nationKey => {
                        listOfNationsKeys.push(nationKey)
                    });

                    var mapgameBotUtilFunctions = new mhp.MapgameBotUtilFunctions(mapgameClient.discordClient)

                    var ref2 = mapgameClient.db.ref("discord-servers/" + guildID + "/config/listOfFieldsForRegistration")
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
            msg.channel.send("http://mapgame-hosting.crumble-technologies.co.uk//Admin/Discord?mapgameID=" + guildID)
            break;

        case "reset-nicknames":
            if (!msg.member.hasPermission("ADMINISTRATOR")) {
                msg.channel.send("You do not have the correct permissions to use this command. Ask an admin to help you out.")
                break;
            }

            msg.channel.send("Resetting nicknames...this may take a while...")
            mapgameClient.discordClient.guilds.cache.get(guildID).members.cache.array().forEach(member => {
                if (!member.hasPermission("ADMINISTRATOR")) {
                    member.setNickname(member.user.username)
                }
            });
            msg.channel.send("Nicknames reset!")
            break;

        case "c":
        case "claim":
        case "map-claim":
            mapgameClient.db.ref("discord-servers/" + guildID + "/nations/" + msg.author.id).once("value", (snapshot) => {
                if (snapshot.val() == null) {
                    msg.channel.send("You don't own a nation yet! Type \"" + config.prefix + "register\" to register one.")
                } else {
                    msg.channel.send("Processing map claim... please wait")

                    new mhp.MapgameBotUtilFunctions(mapgameClient.discordClient).generateMapFromMapCode(args[0], true).then(mapPathAndNumberOfTiles => {
                        mapPath = mapPathAndNumberOfTiles[0]
                        numberOfTiles = mapPathAndNumberOfTiles[1]

                        // datetime format in database: yyyy/mm/dd/hh/MM

                        var dateTimeNow = new Date()
                        var dateTimeLast = new Date(snapshot.val().lastMapClaimTime.slice(0, 4), snapshot.val().lastMapClaimTime.slice(5, 7), snapshot.val().lastMapClaimTime.slice(8, 10), snapshot.val().lastMapClaimTime.slice(11, 13), snapshot.val().lastMapClaimTime.slice(14, 16))
                        var hoursDifference = Math.abs(dateTimeNow = dateTimeLast) / 36e5

                        mapgameClient.db.ref("discord-servers/" + guildID + "/config/numberOfTilesToClaimEachDay").once("value", (snapshot2) => {
                            if (hoursDifference < 24) {
                                msg.channel.send("You have already submitted a map claim in the past 24 hours! Please try again later.")
                            } else if (parseInt(numberOfTiles) > parseInt(snapshot2.val())) {
                                msg.channel.send("There are too many tiles in that claim! Please try again.")
                            } else {
                                if (mapPath == "error parsing map code") {
                                    msg.channel.send("Invalid map code. Type the command again to try again.")

                                    return
                                } else {
                                    var dateTimeNow = new Date()
                                    msg.channel.send("Sending map code to database...")

                                    console.log(`${dateTimeNow.getFullYear()}/${dateTimeNow.getMonth().toString().padStart(2, "0")}/${dateTimeNow.getDate().toString().padStart(2, "0")}/${dateTimeNow.getHours().toString().padStart(2, "0")}/${dateTimeNow.getMinutes().toString().padStart(2, "0")}`)
                                    mapgameClient.db.ref("discord-servers/" + guildID + "/nations/" + msg.author.id).update({
                                        "mapClaimCode": snapshot.val().mapClaimCode + args[0],
                                        "lastMapClaimTime": `${dateTimeNow.getFullYear()}/${dateTimeNow.getMonth().toString().padStart(2, "0")}/${dateTimeNow.getDate().toString().padStart(2, "0")}/${dateTimeNow.getHours().toString().padStart(2, "0")}/${dateTimeNow.getMinutes().toString().padStart(2, "0")}`
                                    }).then(() => {
                                        msg.channel.send("Done! Map claim processed.")
                                    })
                                }
                            }
                        })
                    })
                }
            })
            break;

        case "bot-init":

            break;

        default:
            break;
    }
}