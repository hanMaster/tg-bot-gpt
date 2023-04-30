import axios from 'axios';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import { removeFile } from './util.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

class VoiceConverter {
   constructor() {
      ffmpeg.setFfmpegPath(installer.path);
   }

   toMp3(inputPath, output) {
      try {
         const outputPath = resolve(dirname(inputPath), `${output}.mp3`);
         return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
               .inputOption('-t 30')
               .output(outputPath)
               .on('end', () => {
                  removeFile(inputPath);
                  resolve(outputPath);
               })
               .on('error', (err) => reject(err.message))
               .run();
         });
      } catch (e) {
         console.log(`Failed to convert ogg to mp3: ${e}`);
      }
   }

   async create(url, filename) {
      try {
         const oggPath = resolve(__dirname, `../voices/${filename}.ogg`);
         const response = await axios({
            method: 'get',
            url,
            responseType: 'stream'
         });

         return new Promise((resolve) => {
            const stream = createWriteStream(oggPath);
            response.data.pipe(stream);
            stream.on('finish', () => {
               resolve(oggPath);
            });
         });
      } catch (e) {
         console.log(`Failed to get voice file: ${e}`);
      }
   }
}

export const ogg = new VoiceConverter();
