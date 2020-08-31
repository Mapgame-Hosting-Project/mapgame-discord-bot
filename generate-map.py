from PIL import Image, ImageDraw
import sys
import os
import string, random

def hexToRGBList(hexCode):
    hexCode = hexCode.lstrip("#")
    rgbToReturn = list(int(hexCode[i:i+2], 16) for i in (0, 2, 4))
    rgbToReturn.append(255)
    rgbToReturn = tuple(rgbToReturn)
    return rgbToReturn

def parseMapCode(code):
    try:
        codeList1 = code.split(",")
        codeList2 = []
        for code in codeList1:
            codeList2.append(code.split("="))
        codeList3 = []
        for code in codeList2:
            codeList3.append([(int(code[0].split(".")[0]), int(code[0].split(".")[1])), hexToRGBList(code[1])])
    except:
        print("error parsing map code")
        sys.exit()

    return codeList3

def generateImageFileName():
    filenameToCheck = ''.join(random.choices(string.ascii_uppercase + string.digits, k=20)) + ".png"

    if os.path.isfile("mapImages/" + filenameToCheck):
        return generateImageFileName()
    else:
        return filenameToCheck
    
mapCodeList = parseMapCode(sys.argv[1])

image = Image.open("mapImages/epic-map.png").convert("RGBA")

for fill in mapCodeList:
    ImageDraw.floodfill(image, fill[0], fill[1])

imageFilenameAndPath = "mapImages/" + generateImageFileName()
image.save(imageFilenameAndPath)
print(imageFilenameAndPath)
sys.stdout.flush()