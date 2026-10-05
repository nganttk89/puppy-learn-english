from PIL import Image

def convertImage():
    img = Image.open('/Users/tngan/.gemini/antigravity/brain/e916e105-a73c-4dda-84d0-9dcd7120d43f/red_cloche_1791194790949.jpg')
    img = img.convert("RGBA")
    datas = img.getdata()
    newData = []
    
    for item in datas:
        # Check if the pixel is very close to white
        if item[0] > 230 and item[1] > 230 and item[2] > 230:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save('/Users/tngan/Documents/puppy-learn-english/FindIt_v1/images/shuffle/cup.png', "PNG")

convertImage()
