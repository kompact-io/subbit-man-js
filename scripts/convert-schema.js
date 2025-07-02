import fs from "node:fs";
import path from "node:path";

function render(schema) {
  return [
    `export const schema = `,
    `/** @type {const} @satisfies {import('json-schema-to-ts').JSONSchema}*/`,
    `  (${schema})`,
  ].join("\n");
}

function main() {
  const [_node, _self, root_] = process.argv;
  const root = root_ || "./";
  const schemaDir = path.join(root, "schema");
  const scrDir = path.join(root, "src");
  fs.readdirSync(schemaDir).forEach((p) => {
    if (fs.statSync(p).isDirectory()) {
      //const output = ()
    }
    console.log(path);
  });
}

function oneFileMain() {
  const [_node, _self, input, output] = process.argv;
  if (input == undefined) throw new Error("Input required");
  if (output == undefined) throw new Error("Output required");
  conv(input, output);
}

function conv(input, output) {
  fs.writeFileSync(output, render(fs.readFileSync(input, "utf8")), "utf8");
}

oneFileMain();
