import { Configuration, OpenAIApi } from 'openai';
import config from 'config';
import { createReadStream } from 'fs';

class OpenAI {
   roles = {
      SYSTEM: 'system',
      user: 'user',
      ASSISTANT: 'assistant'
   };
   constructor(apiKey) {
      const configuration = new Configuration({
         apiKey
      });
      this.oai = new OpenAIApi(configuration);
   }

   async ask(messages) {
      try {
         console.log(`[ask] started: ${JSON.stringify(messages, null, 2)}`);
         const response = await this.promiseTimeout(
            30000,
            this.oai.createChatCompletion({
               model: 'gpt-3.5-turbo',
               messages
            })
         );
         console.log(`[ask] finished: ${JSON.stringify(response.data.choices[0].message, null, 2)}`);
         return response.data.choices[0].message;
      } catch (e) {
         console.error('Failed to get answer from GPT');
      }
   }

   async transcription(mp3Path) {
      try {
         console.log('[transcription] started');
         const response = await this.oai.createTranscription(createReadStream(mp3Path), 'whisper-1');
         const question = response.data.text;
         console.log(`[transcription] Question asked: ${question}`);
         return question;
      } catch (e) {
         console.error('Failed to transcript question from mp3');
      }
   }

   promiseTimeout(ms, promise) {
      // Create a promise that rejects in <ms> milliseconds
      let id;
      const timeout = new Promise((resolve, reject) => {
         id = setTimeout(() => {
            clearTimeout(id);
            reject(`Timed out in ${ms}ms.`);
         }, ms);
      });
      return Promise.race([promise, timeout]).then((result) => {
         if (id) {
            clearTimeout(id);
         }
         return result;
      });
   }
}

export const openai = new OpenAI(config.get('OPENAI_API_KEY'));
