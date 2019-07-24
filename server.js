// REQUIREMENTS
const dotenv = require("dotenv");
const express = require("express");
const Telegraf = require("telegraf");
const Model = require("./model");
const winston = require("winston");
const Extra = require('telegraf/extra')
const fs = require('fs')

const AnimationUrl1 = 'https://media.giphy.com/media/ya4eevXU490Iw/giphy.gif'
const AnimationUrl2 = 'https://media.giphy.com/media/LrmU6jXIjwziE/giphy.gif'

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

const PORT = process.env.PORT || 8000;

const app = express();
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});
// DOTENV SETUP

dotenv.config();

// BOT SETUP

const bot = new Telegraf(process.env.BOT_TOKEN);
const website = `https://api.telegram.org/bot${
  process.env.BOT_TOKEN
}/sendDocument`;

bot.telegram.getMe().then(botInfo => {
  bot.options.username = botInfo.username;
});

// START COMMAND

bot.start(ctx => {
  let message = "";
  message +=
    "This is a telegram bot created to keep track of scores for FWOC! ";
  message += "Only admins can make view and change scores.\n";
  message += "\n";
  message += "*Commands:* \n";
  message += "Get user ID.\n";
  message += "/who\n";
  message += "\n";
  message += "Display score.\n";
  message += "/displayscore\n";
  message += "\n";
  message += "Add (score) to (districtId). (Admin)\n";
  message += "/adddistrictscore (districtId) (score)\n";
  message += "\n";
  message += "Display rank.\n";
  message += "COMING SOON\n";
  message += "\n";
  /*
  message += "Add an admin (you must be an admin) (userId).\n";
  message += "/addadmin (userId)\n";
  message += "\n";
  message += "Add a new District. \n";
  message += "/adddistrict (districtId) (districtName). \n";
  message += "\n";
  message += "Remove a district.\n";
  message += "/removedistrict (districtId)\n";
  message += "\n";
  message +=
    "Obtain a .csv file of current points and reset all points to zero\n";
  message += "/reset";
  */
  return ctx.reply(message);
});

// HELP COMMAND

bot.help(ctx => {
  let message = "";
  message +=
    "This is a telegram bot created to keep track of scores for FWOC! ";
  message += "Only admins can make view and change scores.\n";
  message += "\n";
  message += "*Commands:* \n";
  message += "Get user ID.\n";
  message += "/who\n";
  message += "\n";
  message += "Display score.\n";
  message += "/displayscore\n";
  message += "\n";
  message += "Add a new District. \n";
  message += "/adddistrict (districtId) (districtName). \n";
  message += "\n";
  message += "Add (score) to (districtId).\n";
  message += "/adddistrictscore (districtId) (score)\n";
  message += "\n";
  message += "Remove a district.\n";
  message += "/removedistrict (districtId)\n";
  message += "\n";
  message +=
    "Obtain a .csv file of current points and reset all points to zero\n";
  message += "/reset";
  return ctx.telegram.sendMessage(ctx.chat.id, message, {
    parse_mode: "Markdown",
    reply_to_message_id: ctx.message.message_id
  });
});

// addhousescore COMMAND

bot.command(["addhousescore"], ctx => {
  const args = ctx.message.text.split(" ");
  const houseId = args[1];
  const score = Number(args[2]);
  const userId = ctx.from.id;

  Model.addHouseScore(houseId, score, userId)
    .then(res => {
      const newScore = res.house.ogs.reduce(
        (accumulator, og) => accumulator + og.score,
        res.house.score
      );
      const message = `*${res.house.name}* has *${newScore}* points.`;
      return ctx.telegram.sendMessage(ctx.chat.id, message, {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message.message_id
      });
    })
    .catch(err => ctx.reply(err));
});

// ADDDISTRICTSCORE COMMAND

bot.command(["adddistrictscore"], ctx => {
  const args = ctx.message.text.split(" ");
  const districtId = args[1];
  const score = Number(args[2]);
  const userId = ctx.from.id;

  Model.addDistrictScore(districtId, score, userId)
    .then(res => {
      const message = `*${res.district.name}* has *${res.district.score}* points.`;
      return ctx.telegram.sendMessage(ctx.chat.id, message, {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message.message_id
      });
    })
    .catch(err => ctx.reply(err));
});

// ADDOGSCORE COMMAND

bot.command(["addogscore", "s"], ctx => {
  const args = ctx.message.text.split(" ");
  const houseId = args[1];
  const ogId = args[2];
  const score = Number(args[3]);
  const userId = ctx.from.id;

  Model.addOgScore(houseId, ogId, score, userId)
    .then(res => {
      const message = `*${res.og.name}* from *${res.house.name}* has *${
        res.og.score
      } points*`;
      return ctx.telegram.sendMessage(ctx.chat.id, message, {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message.message_id
      });
    })
    .catch(err => ctx.reply(err));
});
// ADDUSER COMMAND

bot.command(["addadmin", "u"], ctx => {
  const args = ctx.message.text.split(" ");
  const targetId = Number(args[1]);
  const userId = ctx.from.id;

  Model.addUser(targetId, userId)
    .then(res => ctx.reply(res))
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: ADDADMIN" + err
      });
      return ctx.reply(err);
    });
});

// DISPLAYSCORE COMMAND

bot.command(["displayscore", "ds"], ctx => {
  const userId = ctx.from.id;

  Model.ds(userId)
    .then(res => ctx.replyWithMarkdown(res))
    .catch(err => {
      logger.log({
        level: "Command: DISPLAYSCORE" + "info",
        message: err
      });
      return ctx.reply(err);
    });
});

// WHO COMMAND

bot.command("who", ctx => {
  return ctx.replyWithMarkdown(
    `${ctx.from.first_name} your ID is \`${ctx.from.id}\``
  );
});

bot.command("reset", async ctx => {
  const userId = ctx.from.id;
  const message = await Model.ds(userId);

  Model.reset(userId)
    .then(res => {
      ctx.replyWithMarkdown(message);
      return ctx.replyWithDocument({ source: res });
    })
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: WHO" + err
      });
      return ctx.reply(err);
    });
});

bot.command("addhouse", ctx => {
  const args = ctx.message.text.split(" ");
  const houseId = args[1];
  const houseName = args[2];
  const userId = ctx.from.id;

  Model.addHouse(houseId, houseName, userId)
    .then(res => ctx.reply(res))
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: ADDHOUSE" + err
      });
      return ctx.reply(err);
    });
});

bot.command("adddistrict", ctx => {
  const args = ctx.message.text.split(" ");
  const districtId = args[1];
  const districtName = args[2];
  const userId = ctx.from.id;

  Model.addDistrict(districtId, districtName, userId)
    .then(res => ctx.reply(res))
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: ADDDISTRICT" + err
      });
      return ctx.reply(err);
    });
});

bot.command("addog", ctx => {
  const args = ctx.message.text.split(" ");
  const houseId = args[1];
  const ogId = args[2];
  const ogName = args[3];
  const userId = ctx.from.id;

  Model.addOg(houseId, ogId, ogName, userId)
    .then(res => ctx.reply(res))
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: ADDOG" + err
      });
      return ctx.reply(err);
    });
});

bot.command("removeog", ctx => {
  const args = ctx.message.text.split(" ");
  const houseId = args[1];
  const ogId = args[2];
  const userId = ctx.from.id;

  Model.removeOg(houseId, ogId, userId)
    .then(res => ctx.reply(res))
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: REMOVEOG" + err
      });
      return ctx.reply(err);
    });
});
// BOT POLL

bot.command("removehouse", ctx => {
  const args = ctx.message.text.split(" ");
  const houseId = args[1];
  const userId = ctx.from.id;

  Model.removeHouse(houseId, userId)
    .then(res => ctx.reply(res))
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: REMOVEHOUSE" + err
      });
      return ctx.reply(err);
    });
});

bot.command("removedistrict", ctx => {
  const args = ctx.message.text.split(" ");
  const districtId = args[1];
  const userId = ctx.from.id;

  Model.removeDistrict(districtId, userId)
    .then(res => ctx.reply(res))
    .catch(err => {
      logger.log({
        level: "info",
        message: "Command: REMOVEDISTRICT" + err
      });
      return ctx.reply(err);
    });
});

process.on("uncaughtException", err => {
  logger.log({
    level: "error",
    message: err
  });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.log({
    level: "error",
    message: "Unhandled Rejection at:" + reason.stack || reason
  });
});

bot.startPolling();

bot.command("local", (ctx) => ctx.replyWithPhoto({ source: '/SSH/Screenshot 2019-07-14 at 11.24.06 AM.png' }))
bot.command('stream', (ctx) => ctx.replyWithPhoto({ source: fs.createReadStream('/cats/cat2.jpeg') }))
bot.command('buffer', (ctx) => ctx.replyWithPhoto({ source: fs.readFileSync('/cats/cat3.jpeg') }))
bot.command('pipe', (ctx) => ctx.replyWithPhoto({ url: 'https://picsum.photos/200/300/?random' }))
bot.command('url', (ctx) => ctx.replyWithPhoto('https://picsum.photos/200/300/?random'))
bot.command('animation', (ctx) => ctx.replyWithAnimation(AnimationUrl1))
bot.command('pipe_animation', (ctx) => ctx.replyWithAnimation({ url: AnimationUrl1 }))

bot.command('caption', (ctx) => ctx.replyWithPhoto('https://picsum.photos/200/300/?random', {
  caption: 'Caption *text*',
  parse_mode: 'Markdown'
}))

bot.command('album', (ctx) => {
  ctx.replyWithMediaGroup([
    {
      'media': 'AgADBAADXME4GxQXZAc6zcjjVhXkE9FAuxkABAIQ3xv265UJKGYEAAEC',
      'caption': 'From file_id',
      'type': 'photo'
    },
    {
      'media': 'https://picsum.photos/200/500/',
      'caption': 'From URL',
      'type': 'photo'
    },
    {
      'media': { url: 'https://picsum.photos/200/300/?random' },
      'caption': 'Piped from URL',
      'type': 'photo'
    },
    {
      'media': { source: '/cats/cat1.jpeg' },
      'caption': 'From file',
      'type': 'photo'
    },
    {
      'media': { source: fs.createReadStream('/cats/cat2.jpeg') },
      'caption': 'From stream',
      'type': 'photo'
    },
    {
      'media': { source: fs.readFileSync('/cats/cat3.jpeg') },
      'caption': 'From buffer',
      'type': 'photo'
    }
  ])
})

bot.command('edit_media', (ctx) => ctx.replyWithAnimation(AnimationUrl1, Extra.markup((m) =>
  m.inlineKeyboard([
    m.callbackButton('Change media', 'swap_media')
  ])
)))

bot.action('swap_media', (ctx) => ctx.editMessageMedia({
  type: 'animation',
  media: AnimationUrl2
}))
