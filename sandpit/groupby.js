import _ from "lodash";

function main() {
  const collection = [
    { keytag: Buffer.from("deadbeef", "hex"), other: "this" },
    { keytag: Buffer.from("deadbeef", "hex"), other: "that" },
    { keytag: Buffer.from("001100", "hex"), other: "then" },
  ];
  const grouped = _.groupBy(collection, "keytag");
  const grouped2 = collection
    .map((x) => [x.keytag.toString("hex"), x])
    .reduce(groupBy, {});
  console.log(grouped);
  console.log(grouped2);
  console.log(_.map(grouped, (val, key) => Buffer.from(key)));
}

function groupBy(acc, curr) {
  const [keytag, dbl1] = curr;
  (acc[keytag] || (acc[keytag] = [])).push(dbl1);
  return acc;
}

main();
