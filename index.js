const { Bot, InlineKeyboard, InputFile } = require("grammy");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const PRICE = process.env.PRICE ?? "2500 birr";
const PAYMENT_INFO = process.env.PAYMENT_INFO ?? "Payment info not set";
const MAX_NUMBER = Number(process.env.MAX_NUMBER ?? 2500);
const DB_FILE = "data.json";

function load() {
  let db = {};
  try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch (e) { db = {}; }
  db.entries = db.entries ?? [];
  db.requests = db.requests ?? {};
  db.users = db.users ?? {};
  return db;
}
function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const HOLD_STEPS = ["name", "proof", "pending"];

function takenSet(db) {
  const s = new Set(db.entries.map((e) => e.number));
  for (const u of Object.values(db.users)) {
    if (u.number && HOLD_STEPS.includes(u.step)) {
      s.add(u.number);
    }
  }
  return s;
}
function freeNumbers(db) {
  const t = takenSet(db);
  const f = [];
  for (let n = 1; n <= MAX_NUMBER; n++) {
    if (!t.has(n)) f.push(n);
  }
  return f;
}

const bot = new Bot(BOT_TOKEN);
const isAdmin = (ctx) => ctx.from?.id === ADMIN_ID;

bot.command("myid", (ctx) => ctx.reply("Your ID: " + ctx.from.id));

bot.command("start", (ctx) => {
  if (isAdmin(ctx)) return ctx.reply("Admin commands: /list /export /numbers");
  const db = load();
  const u = db.users[ctx.from.id];
  if (u?.step !== "pending") {
    db.users[ctx.from.id] = { step: "choose", number: null, fullName: null };
    save(db);
  }
  return ctx.reply(
    "Welcome! Ticket price: " + PRICE +
    "\n\nSend the lucky number you want (1 to " + MAX_NUMBER + ")." +
    "\nUse /numbers to see the available numbers."
  );
});

bot.command("numbers", async (ctx) => {
  const db = load();
  const f = freeNumbers(db);
  if (!f.length) return ctx.reply("All numbers are taken.");
  await ctx.reply("Available numbers (" + f.length + " left):
