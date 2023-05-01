import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import config from 'config';

import { ogg } from './voice-converter.js';
import { openai } from './openai.js';

const sessions = new Map();

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.command('start', async (ctx) => {
   sessions.set(ctx.message.from.id, []);
   await ctx.reply('Жду ваш вопрос голосом или текстом');
});

bot.command('new', async (ctx) => {
   sessions.set(ctx.message.from.id, []);
   await ctx.reply('Жду ваш вопрос голосом или текстом');
});

bot.on(message('voice'), async (ctx) => {
   ctx.session = sessions.get(ctx.message.from.id);
   try {
      await ctx.reply(code('Сообщение принял, жду ответ от сервера...'));
      const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
      const userId = String(ctx.message.from.id);
      const oggPath = await ogg.create(link.href, userId);
      const mp3Path = await ogg.toMp3(oggPath, userId);
      const question = await openai.transcription(mp3Path);
      await ctx.reply(code(`Ваш запрос: ${question}`));

      let messages = sessions.get(ctx.message.from.id);
      if (!messages) {
         sessions.set(ctx.message.from.id, []);
         messages = sessions.get(ctx.message.from.id);
      }
      messages.push({
         role: openai.roles.user,
         content: question
      });

      const message = await openai.ask(messages);
      if (message && message.content) {
         messages.push(message);
         await ctx.reply(message.content);
      } else {
         await ctx.reply('GPT не смог дать ответ');
      }
   } catch (e) {
      console.error(`Error while handle voice message: ${e}`);
   }
});

bot.on(message('text'), async (ctx) => {
   try {
      await ctx.reply(code('Сообщение принял, жду ответ от сервера...'));
      let messages = sessions.get(ctx.message.from.id);
      if (!messages) {
         sessions.set(ctx.message.from.id, []);
         messages = sessions.get(ctx.message.from.id);
      }
      messages.push({
         role: openai.roles.user,
         content: ctx.message.text
      });

      const message = await openai.ask(messages);
      if (message && message.content) {
         messages.push(message);
         await ctx.reply(message.content);
      } else {
         await ctx.reply('GPT не смог дать ответ');
      }
   } catch (e) {
      console.error(`Error while handle text message: ${e}`);
   }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
