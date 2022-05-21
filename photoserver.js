import fs from 'fs/promises'
import {createReadStream} from 'fs'
import crypto from 'crypto'
import net from 'net'
import lzma from 'lzma-native'


const PORT = 3000;
let sentList = {};

const loadFile = async () => {
    return fs.readFile('sendFile.json', 'utf8')
}

const hashStream = async () => {
    const files = await fs.readdir('photos')
    return Promise.all(files
        .map(file => {
            return new Promise(resolve => {
                const path = `photos/${file}`
                const hash = crypto.createHash('md5');
                hash.setEncoding("hex")
                createReadStream(path).pipe(hash)
                    .on('finish', () => {
                        resolve({
                            fileName: file,
                            hex: hash.read(),
                        })
                    })
            })
        }))
}

const listenForDataEvent = (socket, filesToSend) => {
    socket.on('data', async (data) => {
        const ready = String(data)
        if (ready === 'Ready') {
            const start = Date.now()
            console.log('Ready to send files')
            for (let i = 0; i < filesToSend.length; i++) {
                const file = filesToSend[i];
                console.log(file)
                console.log(`file ${i+1} of ${filesToSend.length}`)
                await processPhoto(file, socket)
                console.log('next file')
                socket.write("END OF FILE")
                filesToSend[i] = undefined
            }
            const end = Date.now()
            console.log('time taken in seconds', (end - start)/ 1000)
            socket.write("FINISHED")
            console.log('finished')

        }
    })
}

const processPhoto = async (photo, socket) => {
    return new Promise(resolve => {
        if (!socket.destroyed) {
            const compressor = lzma.createCompressor();
            const steam = createReadStream(`photos/${photo.fileName}`)
            console.log(`steam created for file ${photo.fileName}`)
            steam.pipe(compressor).on('data', (data) => {
                socket.write(data)
            }).on('end', async () => {
                sentList[photo.hex] = photo.hex
                console.log('writing to sendFile.json, last file to be sent : ', photo.fileName)
                await fs.writeFile('sendFile.json', JSON.stringify(sentList))
                steam.close()
                resolve()
            })
        }
    })

}


(async () => {
    console.log('loading list of previous sent files')
    let data = await loadFile()
    if (data) {
        sentList = JSON.parse(data)
    }
    console.log('loading list completed')

    console.log('started file hashing')
    const hashes = await hashStream()
    console.log('ended file hashing')

    const server = net.createServer(async (socket) => {
        console.log('Server Created!');
        const filesToSend = hashes.filter(({hex}) => !(hex in sentList))
        if (filesToSend.length < 1) {
            console.log("no files to send")
            console.log('exiting program')
            process.exit(0)
        }
        listenForDataEvent(socket, filesToSend)

    });

    server.listen(PORT, () => {
        console.log(`starting server on  port ${PORT}`)
    });

    server.on('error', (err) => {
        throw err;
    });

})()






