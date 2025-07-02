import { MemoryLevel } from "memory-level";

class Db {
  constructor() {
    this._ = {};
  }

  async get(key) {
    return Promise.resolve(this._[key]);
  }
  async put(key, value) {
    this._[key] = value;
  }
  iterator(params) {
    return Object.entries(this._);
  }
}

async function main() {
  // Create a database
  const n = Number(process.argv[2] || 0);
  const db = new MemoryLevel({ valueEncoding: "json" });
  await Promise.all(
    [...Array(n).keys()].map(async (idx) => {
      await db.put(`K${idx}`, idx);
    }),
  );
  const i = db.iterator({ gt: "K", values: false });

  let cnt = 0;
  for await (const [key, _] of i) {
    cnt += await db.get(key);
  }
  console.log("Cnt", cnt - (n * (n - 1)) / 2);
}

async function iteratorSnapshots() {
  const db = new MemoryLevel();
  await db.put("a", 1);
  const i02 = db.iterator();
  await db.put("b", 2);
  const i12 = db.iterator();
  let all0 = "";
  for await (const [key, value] of i02) {
    all0 += `${key}:${value}, `;
  }
  let all1 = "";
  for await (const [key, value] of i12) {
    all1 += `${key}:${value}, `;
  }
  console.log("0", all0, "1", all1);
  console.log("ooops");
}

main();
