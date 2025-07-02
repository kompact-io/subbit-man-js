const a = [1, 2, 5, 6, 9, 10];
const b = [3, 4, 7, 8];

async function* gen1(a, ia = 0) {
  while (ia < a.length) {
    yield Promise.resolve(a[ia++]);
  }
}

async function* gen(a, b) {
  let ia = 0;
  let ib = 0;
  while (ia < a.length && ib < b.length) {
    if (a[ia] <= b[ib]) {
      yield Promise.resolve(a[ia++]);
    } else {
      yield Promise.resolve(b[ib++]);
    }
  }
  if (ia < a.length) {
    for await (const x of gen1(a, ia)) {
      yield x;
    }
  } else {
    for await (const x of gen1(b, ib)) {
      yield x;
    }
  }
}

async function main() {
  const g = gen(a, b);
  for await (const num of g) {
    console.log("NUM", num);
  }
}
main();
