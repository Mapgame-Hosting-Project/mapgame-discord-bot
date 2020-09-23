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

async function handleCommand(msg, command, args) {
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
                    var url = `http://mapgame-hosting.crumble-technologies.co.uk/Create/DiscordServerSetup?guildID=${guildID}&userID=${msg.author.id}&checkKey=${checkKey}`

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
            registerNation.start(msg, mapgameClient.discordClient)
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
            var nationManager = new mhp.NationManager(mapgameClient.db, guildID)
            nationManager.getAllNationsEmbed(new mhp.MapgameBotUtilFunctions(mapgameClient.discordClient)).then(embed => {
                console.log(embed)
                msg.channel.send(embed)
            })
            break;

        case "ap":
        case "adminpanel":
            msg.channel.send("http://mapgame-hosting.crumble-technologies.co.uk/Admin/Discord?mapgameID=" + guildID)
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
                if (!snapshot.exists()) {
                    msg.channel.send("You don't own a nation! Type \"" + config.prefix + "register\" to register for one.")
                } else {
                    var checkKey = mhp.MapgameBotUtilFunctions.makeCheckKey(5)
                    var url = `http://mapgame-hosting.crumble-technologies.co.uk/PlayerActions/MakeMapClaim?mapgameID=${guildID}&nationID=${msg.author.id}&checkKey=${checkKey}`

                    var ref = mapgameClient.db.ref("discord-check-keys/" + msg.author.id + "/map-claim")
                    ref.set(guildID + "|" + checkKey)

                    msg.channel.send("Check your DMs!")
                    msg.author.send("Click the link below to make your map claim:\n" + url)
                }
            })
            break;

        case "bot-init":

            break;

        default:
            break;
    }
}