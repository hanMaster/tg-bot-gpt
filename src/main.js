import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import config from 'config';

import fs from 'fs';
import util from 'util';
const log_stdout = process.stdout;

console.log = function (d) {
   fs.appendFileSync('access.log', util.format(d) + '\n');
   log_stdout.write(util.format(d) + '\n');
};

import { ogg } from './voice-converter.js';
import { openai } from './openai.js';

const sessions = new Map();

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));
const accessCode = config.get('ACCESS_CODE');

bot.command('start', async (ctx) => {
   const date = new Date().toLocaleDateString();
   const time = new Date().toLocaleTimeString();
   console.log(`${date}, ${time}, Access from ${ctx.message.from.username}`);
   await ctx.reply('Введите код доступа');
});

bot.command('new', async (ctx) => {
   if (sessions.has(ctx.message.from.id)) {
      sessions.set(ctx.message.from.id, []);
      await ctx.reply('Жду ваш вопрос голосом или текстом');
      return;
   }
   await ctx.reply('Пожалуйста начните с команды /start');
});

bot.on(message('voice'), async (ctx) => {
   if (sessions.has(ctx.message.from.id)) {
      try {
         await ctx.reply(code('Сообщение принял, жду ответ от сервера...'));
         const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
         const userId = String(ctx.message.from.id);

         const userName = String(ctx.message.from.username);
         const oggPath = await ogg.create(link.href, userId);
         const mp3Path = await ogg.toMp3(oggPath, userName ?? userId);
         const question = await openai.transcription(mp3Path);
         await ctx.reply(code(`Ваш запрос: ${question}`));

         let messages = sessions.get(ctx.message.from.id);
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
   } else {
      await ctx.reply('Пожалуйста начните с команды /start');
   }
});

bot.on(message('text'), async (ctx) => {
   if (sessions.has(ctx.message.from.id)) {
      try {
         await ctx.reply(code('Сообщение принял, жду ответ от сервера...'));
         let messages = sessions.get(ctx.message.from.id);
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
   } else if (ctx.message.text === accessCode) {
      sessions.set(ctx.message.from.id, []);
      await ctx.reply('Жду ваш вопрос голосом или текстом');
   } else {
      await ctx.reply('К сожалению Вы не имеете права общаться со мной... Попробуйте начать с команды /start');
   }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
