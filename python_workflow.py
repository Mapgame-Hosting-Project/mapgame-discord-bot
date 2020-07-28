with open('./docs/index.html', 'w+') as output, open('README.html', 'r') as input:
    while True:
        data = input.read(100000)
        if data == '':  # end of file reached
            break
        output.write(data)