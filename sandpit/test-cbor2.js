import * as cbor from "cbor2";

class Iou {
  _cborTag = 121;
  constructor(tag, amount) {
    this.tag = tag;
    this.amount = amount;
  }

  toCbor(_writer, _options) {
    return [this._cborTag, [this.tag, this.amount]];
  }

  toCBOR(_writer, _options) {
    return this.toCbor(_writer, _options);
  }

  static fromCbor(raw) {
    const { tag, contents: c } = cbor.decode(raw);
    console.log(JSON.stringify(cbor.decode(raw)));
    if (tag != 121) throw `wrong tag ${tag}`;
    return new this(c[0], BigInt(c[1]));
  }
}

// class Data122 {
//   constructor(aaaa, b, c, d) {
//     this.aaaa = aaaa;
//     this.b = b;
//     this.c = c;
//     this.d = d;
//   }
//   toTag() {
//     return new cbor.Tag([this.aaaa, this.b, this.c, this.d], 122);
//   }
//
//   static fromTag(tag) {
//     return new this(tag.value[0], tag.value[1], tag.value[2], tag.value[3]);
//   }
//
//   static fromCbor(encoder, cbor) {
//     return this.fromTag(encoder.decode(cbor))
//   }
// }
//
// const froms = {
//   121: Data121.fromTag,
//   122: Data122.fromTag,
// };

function fromTag(tag) {
  return froms[tag.tag](tag);
}

function main() {
  // const encoder = new cbor.Encoder({ useRecords: false });
  const iou = new Iou(Buffer.from("deadbeef", "hex"), 1232n);
  const hex121 = cbor.encode(iou).toString("hex");
  console.log("1", Iou.fromCbor(cbor.encode(iou)));
}

main();
