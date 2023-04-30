import { session, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import config from 'config';

import { ogg } from './voice-converter.js';
import { openai } from './openai.js';

const INITIAL_SESSION = {
   messages: []
};

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session());

bot.on(message('voice'), async (ctx) => {
   ctx.session ??= INITIAL_SESSION;
   try {
      await ctx.reply(code('Сообщение принял, жду ответ от сервера...'));
      const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
      const userId = String(ctx.message.from.id);
      const oggPath = await ogg.create(link.href, userId);
      const mp3Path = await ogg.toMp3(oggPath, userId);
      const question = await openai.transcription(mp3Path);
      await ctx.reply(code(`Ваш запрос: ${question}`));

      ctx.session.messages.push({
         role: openai.roles.user,
         content: question
      });

      const message = await openai.ask(ctx.session.messages);
      ctx.session.messages.push(message);
      await ctx.reply(message.content);
   } catch (e) {
      console.log(`Error while handle voice message: ${e}`);
   }
});

bot.on(message('text'), async (ctx) => {
   ctx.session ??= INITIAL_SESSION;
   try {
      await ctx.reply(code('Сообщение принял, жду ответ от сервера...'));

      ctx.session.messages.push({
         role: openai.roles.user,
         content: ctx.message.text
      });

      const message = await openai.ask(ctx.session.messages);
      ctx.session.messages.push(message);
      await ctx.reply(message.content);
   } catch (e) {
      console.log(`Error while handle voice message: ${e}`);
   }
});

bot.command('start', async (ctx) => {
   ctx.session = INITIAL_SESSION;
   await ctx.reply('Жду ваш вопрос голосом или текстом');
});

bot.command('new', async (ctx) => {
   ctx.session = INITIAL_SESSION;
   await ctx.reply('Жду ваш вопрос голосом или текстом');
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
