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

        if (openSquareBracketIndexes.length != closeSquareBracketIndexes.length) return [null, false]
        if (openSquareBracketIndexes.length == 0) return [null, false]

        if (checkWithUsername) {
            for (var i = 0; i < openSquareBracketIndexes.length; i++) {
                var fieldName = template.substring(openSquareBracketIndexes[i] + 1, closeSquareBracketIndexes[i])
                if (fieldName.endsWith(":")) {
                    fieldName = fieldName.replace(/.$/, "")
                    template = template.slice(0, closeSquareBracketIndexes[i] - 1) + template.slice(closeSquareBracketIndexes[i])
                }

                if ((!(listOfFields.includes(fieldName))) && (!(fieldName == "username"))) return [null, false]
            }
        } else {
            for (var i = 0; i < openSquareBracketIndexes.length; i++) {
                var fieldName = template.substring(openSquareBracketIndexes[i] + 1, closeSquareBracketIndexes[i])
                if (fieldName.endsWith(":")) {
                    fieldName = fieldName.replace(/.$/, "")
                    template = template.slice(0, closeSquareBracketIndexes[i] - 1) + template.slice(closeSquareBracketIndexes[i])
                }

                if (!(listOfFields.includes(fieldName))) return [null, false]
            }
        }

        return [template, true]
    }

    replaceTemplateWithFieldValues(template, fields, fieldsWithValues, checkWithUsername = true) {
        var templateCheck = this.checkFieldNameTemplateValidity(template, fields, checkWithUsername)
        if (!templateCheck[1]) {
            return false
        }
        template = templateCheck[0]
        var newTemplate = template

        for (var i = 0; i < fields.length; i++) {
            var fieldName = fields[i]
            var fieldAnswer = fieldsWithValues[fieldName]
            newTemplate = newTemplate.replace("[" + fieldName + "]", fieldAnswer)
        }

        return newTemplate
    }
}

module.exports = MapgameBotUtilFunctions