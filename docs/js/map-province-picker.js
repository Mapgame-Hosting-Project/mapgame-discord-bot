function handleMainCanvasClick(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    alert("x: " + x + ", y: " + y)
}

var canvas = document.getElementById("main-canvas")
var canvasCTX = canvas.getContext("2d")
var img1 = new Image()
img1.onload = function() {
    canvasCTX.drawImage(img1, 0, 0)
}
img1.src = "res/edited map.png"
canvas.addEventListener("click", function(e) {
    handleMainCanvasClick(canvas, e)
})