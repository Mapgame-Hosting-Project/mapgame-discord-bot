function handleMainCanvasClick(canvas, event, coloursWithCoordsJSON) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.round(event.clientX - rect.left)
    const y = Math.round(event.clientY - rect.top)
    var clickColourData = canvas.getContext("2d").getImageData(event.offsetX, event.offsetY, 1, 1).data

    for (var i = 0; i < coloursWithCoordsJSON.main.length; i++) {
        console.log(coloursWithCoordsJSON.main[i])
        if (coloursWithCoordsJSON.main[i][1] == clickColourData) {
            return coloursWithCoordsJSON.main[i][0]
        }
    }
}

var canvas

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
        alert(handleMainCanvasClick(canvas, e, coloursWithCoordsJSON))
    })
})