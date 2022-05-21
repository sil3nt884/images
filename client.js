import fs from "fs/promises";
import zlib from "zlib";
import net from "net";
import lzma from 'lzma-native'
import { createWriteStream } from 'fs'
import { Readable } from 'stream'


const fileWriteStream = (buffer) => {
    const readable = new Readable()
    readable._read = () => {} // _read is required but you can noop it
    readable.push(buffer)
    readable.push(null)
    return readable
}

let buffer = [];
(async () => {

    const socket = new net.Socket();
    socket.connect(3000, "90.196.49.188", function () {
        console.log("Client: Connected to server");
        socket.write("Ready")
        setInterval(()=>{
            socket.write("alvie pusle")
        }, 6)

    });
    socket.setKeepAlive(true,60000)
    socket.on('data', async (data) => {
        const string = String(data)
        try {

            if(!string.includes('END OF FILE') && data) {
                buffer.push(data)
            }
            if (string.includes('END OF FILE')) {
                    //const decompressor = lzma.createDecompressor()
                    const buf = Buffer.concat(buffer)
                    fileWriteStream(buf)
                        .pipe(createWriteStream(`recievedPhotos/${new Date().toISOString().substring(0,18).replace(/[:.]/gm, '-')}.xz`))
                    buffer = []
            }
            if(string.includes("FINISHED")) {
                console.log("finished all files")
            }

        }catch (e) {
            console.log('errors', e)
        }
    })
    socket.on('end', ()=> socket.write("\n"))
})()