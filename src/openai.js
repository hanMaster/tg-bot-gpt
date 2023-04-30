import { Configuration, OpenAIApi } from 'openai';
import config from 'config';
import { createReadStream } from 'fs';

class OpenAI {
   roles = {
      SYSTEM: 'system',
      user: 'user',
      ASSISTANT: 'assistant',
   }
   constructor(apiKey) {
      const configuration = new Configuration({
         apiKey
      });
      this.oai = new OpenAIApi(configuration);
   }

   async ask(messages) {
      try {
         const response = await this.oai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages
         });
         return response.data.choices[0].message;
      } catch (e) {
         console.log('Failed to get answer from GPT');
      }
   }

   async transcription(mp3Path) {
      try {
         const response = await this.oai.createTranscription(createReadStream(mp3Path), 'whisper-1');
         const question = response.data.text;
         console.log(`Question asked: ${question}`);
         return question;
      } catch (e) {
         console.log('Failed to transcript question from mp3');
      }
   }
}

export const openai = new OpenAI(config.get('OPENAI_API_KEY'))