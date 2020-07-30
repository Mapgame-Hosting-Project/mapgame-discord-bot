function handleMainCanvasClick(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.round(event.clientX - rect.left)
    const y = Math.round(event.clientY - rect.top)
    alert("x: " + x + ", y: " + y)
}

var canvas = document.getElementById("main-canvas")
var canvasCTX = canvas.getContext("2d")
var img1 = new Image()
img1.onload = function() {
    canvas.width = img1.width
    canvas.height = img1.height
    canvasCTX.drawImage(img1, 0, 0)
}
img1.src = "res/edited map.png"
canvas.addEventListener("click", function(e) {
    handleMainCanvasClick(canvas, e)
})