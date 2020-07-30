function handleMainCanvasClick(canvas, event, coloursWithCoordsJSON) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.round(event.clientX - rect.left)
    const y = Math.round(event.clientY - rect.top)
    var clickColourData = canvas.getContext("2d").getImageData(event.offsetX, event.offsetY, 1, 1).data
    console.log(Array.from(clickColourData))

    for (var i = 0; i < coloursWithCoordsJSON.main.length; i++) {
        if (coloursWithCoordsJSON.main[i][1][0] == clickColourData[0] && coloursWithCoordsJSON.main[i][1][1] == clickColourData[1] && coloursWithCoordsJSON.main[i][1][2] == clickColourData[2] && coloursWithCoordsJSON.main[i][1][3] == clickColourData[3]) {
            console.log(coloursWithCoordsJSON.main[i][0])
            return coloursWithCoordsJSON.main[i][0]
        }
    }
}

var canvas
var mapClaimCode = ""

fetch("res/colours with coords.json").then(response => response.json()).then(coloursWithCoordsJSON => {
    console.log(coloursWithCoordsJSON)
    canvas = document.getElementById("main-canvas")
    var canvasCTX = canvas.getContext("2d")
    var img1 = new Image()
    img1.onload = function() {
        canvas.width = img1.width
        canvas.height = img1.height
        canvasCTX.drawImage(img1, 0, 0)
    }
    img1.src = "res/edited map.png"
    canvas.addEventListener("click", function(e) {
        var pixelToAddToCode = handleMainCanvasClick(canvas, e, coloursWithCoordsJSON)

        handleProvinceClick(pixelToAddToCode)
    })
    document.getElementById("copy-button").addEventListener("click", () => {
        document.querySelector("#map-code-text-input").value = document.querySelector("#map-code-text-input").value.substring(0, document.querySelector("#map-code-text-input").value.length - 1)
        document.querySelector("#map-code-text-input").select()
        document.execCommand("copy")
        alert("Copied map claim code!")
        document.querySelector("#map-code-text-input").value += ","
    })
})

function handleProvinceClick(pixelToAddToCode) {
    if (pixelToAddToCode == undefined) {
        return
    }

    var mapClaimCode = constructMapCode(pixelToAddToCode, document.getElementById("colour-input").value)
    var mapCodeTextInput = document.getElementById("map-code-text-input")

    if (mapCodeTextInput.value.includes(mapClaimCode)) {
        mapCodeTextInput.value = mapCodeTextInput.value.replace(mapClaimCode, "")
    } else {
        mapCodeTextInput.value += mapClaimCode
    }
}

function constructMapCode(pixel, hexColour) {
    return `${pixel[0]}.${pixel[1]}=${hexColour},`
}