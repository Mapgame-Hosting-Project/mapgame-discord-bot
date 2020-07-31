class MapgameBotUtilFunctions {
    constructor(botClient) {
        this.childProcess = require("child_process")

        this.client = botClient
    }

    getUserFromMention(mention, role = false, guild = null) {
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
                return this.client.users.cache.get(mention);
            }
        } else {
            return "invalid mention"
        }
    }

    getChannelFromMention(mention) {
        if (!mention) return;

        if (mention.startsWith('<#') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);

            return this.client.channels.cache.get(mention);
        } else {
            return "invalid mention"
        }
    }

    async generateMapFromMapCode(code) {
        var spawn = this.childProcess.spawn
        var pythonProcess = spawn("python", ["generate-map.py", code])

        return new Promise((resolve, reject) => {
            pythonProcess.stdout.on("data", data => {
                console.log(data.toString())
                resolve(data.toString().replace(/\r?\n|\r/g, ""))
            })
        })
    }

    checkFieldNameTemplateValidity(template, listOfFields, checkWithUsername = true) {
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

        if (checkWithUsername) {
            for (var i = 0; i < openSquareBracketIndexes.length; i++) {
                var fieldName = template.substring(openSquareBracketIndexes[i] + 1, closeSquareBracketIndexes[i])

                if (!listOfFields.includes(fieldName) && !fieldName == "username") return false
            }
        } else {
            for (var i = 0; i < openSquareBracketIndexes.length; i++) {
                var fieldName = template.substring(openSquareBracketIndexes[i] + 1, closeSquareBracketIndexes[i])

                if (!listOfFields.includes(fieldName)) return false
            }
        }

        return true
    }
}

module.exports = MapgameBotUtilFunctions