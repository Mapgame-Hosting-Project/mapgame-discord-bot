function handleMainCanvasClick(canvas, event, coloursWithCoordsJSON) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.round(event.clientX - rect.left)
    const y = Math.round(event.clientY - rect.top)
    var clickColourData = canvas.getContext("2d").getImageData(event.offsetX, event.offsetY, 1, 1).data
    console.log(Array.from(clickColourData))

    for (var i = 0; i < coloursWithCoordsJSON.main.length; i++) {
        if (coloursWithCoordsJSON.main[i][1][0] == clickColourData[0] && coloursWithCoordsJSON.main[i][1][1] == clickColourData[1] && coloursWithCoordsJSON.main[i][1][2] == clickColourData[2] && coloursWithCoordsJSON.main[i][1][3] == clickColourData[3]) {
            console.log(coloursWithCoordsJSON.main[i][0])
            return coloursWithCoordsJSON.main[i][0], clickColourData
        }
    }
}

var canvas
var chosenHexColour = "#000000"

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
        var pixelToAddToCode, colourList = handleMainCanvasClick(canvas, e, coloursWithCoordsJSON)

        handleProvinceClick(pixelToAddToCode)

        if (colourList[0] != 0 && colourList[1] != 0 && colourList[2] != 0) {
            recolorImage(img1, colourList[0], colourList[1], colourList[2], 0, 0, 0, canvas)
        }
    })
    document.getElementById("copy-button").addEventListener("click", () => {
        document.querySelector("#map-code-text-input").value = document.querySelector("#map-code-text-input").value.substring(0, document.querySelector("#map-code-text-input").value.length - 1)
        document.querySelector("#map-code-text-input").select()
        document.execCommand("copy")
        alert("Copied map claim code!")
        document.querySelector("#map-code-text-input").value += ","
    })
    document.getElementById("colour-input").addEventListener("change", (event) => {
        changeAllInstancesInCurrentMapCode(chosenHexColour, event.target.value)
        chosenHexColour = event.target.value
    }, false)
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

function changeAllInstancesInCurrentMapCode(oldString, newString) {
    var mapCodeTextInput = document.getElementById("map-code-text-input")
    mapCodeTextInput.value = mapCodeTextInput.value.split(oldString).join(newString)
}

function recolorImage(img, oldRed, oldGreen, oldBlue, newRed, newGreen, newBlue, c) {

    var ctx = c.getContext("2d");
    var w = img.width;
    var h = img.height;

    c.width = w;
    c.height = h;

    // draw the image on the temporary canvas
    ctx.drawImage(img, 0, 0, w, h);

    // pull the entire image into an array of pixel data
    var imageData = ctx.getImageData(0, 0, w, h);

    // examine every pixel, 
    // change any old rgb to the new-rgb
    for (var i = 0; i < imageData.data.length; i += 4) {
        // is this pixel the old rgb?
        if (imageData.data[i] == oldRed &&
            imageData.data[i + 1] == oldGreen &&
            imageData.data[i + 2] == oldBlue
        ) {
            // change to your new rgb
            imageData.data[i] = newRed;
            imageData.data[i + 1] = newGreen;
            imageData.data[i + 2] = newBlue;
        }
    }
    // put the altered data back on the canvas  
    ctx.putImageData(imageData, 0, 0);
    // put the re-colored image back on the image

    img.src = c.toDataURL('image/png');

}