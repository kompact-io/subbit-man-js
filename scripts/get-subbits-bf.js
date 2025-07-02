// Get subbits from bf

import { request } from "undici";
import { Command } from "commander";

// Target
// {
//     "iouKey" : "{{iou_key}}",
//     "tag" : "{{tag}}" ,
//     "txId" : "{{tx_id}}" ,
//     "outputIdx" : "{{output_idx}}",
//     "sub" : "{{sub}}" ,
//     "subbitAmt" : "{{subbit_amt}}"
// }

function conv(bfUtxo) {
  //{
  //  "address": "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
  //  "tx_hash": "39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58",
  //  "output_index": 0,
  //  "amount": [
  //    {
  //      "unit": "lovelace",
  //      "quantity": "42000000"
  //    }
  //  ],
  //  "block": "7eb8e27d18686c7db9a18f8bbcfe34e3fed6e047afaa2d969904d15e934847e6",
  //  "data_hash": "9e478573ab81ea7a8e31891ce0648b81229f408d596a3483e6f4f9b92d3cf710",
  //  "inline_datum": null,
  //  "reference_script_hash": null
  //},
}

function get(address) {
  return request(utxoUrl(address), {
    method: "GET",
    headers: { Project_id: getToken() },
  });
}

function utxoUrl(address) {
  return `https://cardano-preview.blockfrost.io/api/v0/addresses/${address}/utxos`;
}

function getToken() {
  return process.env["BLOCKFROST_PROJECT_ID"];
}

function main() {
  cli().parse();
}

function cli() {
  const cmd = new Command();
  cmd
    .name("get-subbits-bf")
    .description("Get subbits from blockfrost")
    .version("0.0.1");
  cmd
    .option(
      "--address <address>",
      "Subbit validator address",
      "addr_test1wq833v4j6sfldkrr275xm9vqzkeyp65d45kzrf2qfwe3y0c9dnk2h",
    )
    .action((opts) => {
      return get(opts.address).then();
    });
  return cmd;
}

main();
