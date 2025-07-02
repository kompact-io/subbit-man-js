import * as cbor from "cbor-x";

class Data121 {
  constructor(aaaa, b, c, d) {
    this.aaaa = aaaa;
    this.b = b;
    this.c = c;
    this.d = d;
  }
  toTag() {
    return new cbor.Tag([this.aaaa, this.b, this.c, this.d], 121);
  }
  static fromTag(tag) {
    return new Data121(tag.value[0], tag.value[1], tag.value[2], tag.value[3]);
  }
}

class Data122 {
  constructor(aaaa, b, c, d) {
    this.aaaa = aaaa;
    this.b = b;
    this.c = c;
    this.d = d;
  }
  toTag() {
    return new cbor.Tag([this.aaaa, this.b, this.c, this.d], 122);
  }

  static fromTag(tag) {
    return new this(tag.value[0], tag.value[1], tag.value[2], tag.value[3]);
  }

  static fromCbor(encoder, cbor) {
    return this.fromTag(encoder.decode(cbor));
  }
}

const froms = {
  121: Data121.fromTag,
  122: Data122.fromTag,
};

function fromTag(tag) {
  return froms[tag.tag](tag);
}

function main() {
  const encoder = new cbor.Encoder({ useRecords: false });
  const data121 = new Data121(12312, "this", -1, 3n);
  const hex121 = encoder.encode(data121.toTag()).toString("hex");
  const data122 = new Data122(12312, "this", -1, 3n);
  const hex122 = encoder.encode(data122.toTag()).toString("hex");
  console.log("1", hex121);
  console.log("2", hex122);
  console.log(Data122.fromCbor(encoder, Buffer.from(hex122, "hex")));
}

main();
