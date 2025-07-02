# Design commentary

## Intro

> What shaped piece(s) is needed to make Subbit.xyz useable?

We're reasonably happy with the L1 part of the story. The L2 part is a harder
nut to crack, especially in lieu of some real world experience. It took several
iterations to arrive here, and surely there will be more to come once its
undergone use.

What follows is some commentary on the design and what might have motivated some
of the design choices.

## Observations

### Mostly decoupled

From the perspective of the L2, subbits are mostly decoupled. We can treat each
independently. When discussing actions, they are generally working at a per
subbit level.

However the role of "mostly" nods towards caveats.

Caveat one: when interfacing with the L1 in particular, it is more practical to
do some operations in batch. This is straightforward.

Caveat two: Subbits on the L1 do not have IDs, in the sense of unique IDs. This
was a conscious design decision: They aren't required to keep users safe from
one another. However, from the perspective of following the chain, they would
have certainly made life easier.

The absence of unique IDs leaves open important "what happens if..." questions.
For example, _what happens if two subbits at the L1 tip have identical
`constants`?_. The important constants are the IOU key and the tag. Together
these determine whether or not an IOU is valid.

We introduce the notion of **keytag** of a subbit. It is the concatenation of
the IOU key and the tag. Internally this is `Buffer` or `Uint8Array`, and
externally is hex encoded, unless stated otherwise. Note that the IOU key is of
fixed length, thus it is straightforward to decompose a keytag into its
constituent IOU key and tag.

From the perspective of the L2, the keytag is an ID of a subbit. In the context
of SubbitMan, we talk of **DB subbit** and a **L1 subbit**. In normal contexts,
during the operation of the subbit, the will be a single L1 subbit corresponding
to the DB subbit. Either through a more exotic use case, a mistake, or an
attempt at malice there may be more than L1 subbit with matching keytag. In
either case, while the DB subbit is useable (later will call this "Opened"),
then there must be a L1 subbit **underwriting** it.

### L1 liaison assumptions

The L1 liaison has two roles:

- Sync SubbitMan with the L1 subbits.
- Fetch IOUs for tx building (and then build the txs)

The sync function must perform a map filter on the UTXO set as described in the
endpoint section.

In a previous design, this functionality was part of SubbitMan but this idea was
ditched. By excising the L1 liaison off, SubbitMan needs to know nothing of the
blockchain interface: be it directly via a Cardano node, via ogmios, or chain
indexer such as kupo, or via a third party service such as Blockfrost. It also
means that SubbitMan does not depend on the tx builder code (not the friendliest
dependency), nor does it duplicate much if any of the functionality.

We make weak assumptions on the liveliness of the L1 liaison. This is relevant
only when syncing data from the L1 to SubbitMan. The assumptions are:

1. Subbits will not be rolled-back
2. All (relevant) opened subbits are present in a sync

We assume that all L1 subbits provided to SubbitMan from the L1 liaison are
sufficiently confirmed. That is, we are confident they won't be rolled-back. The
threshold of "sufficiently confirmed" is a down to the provider. It is a
compromise between their safety and their user's convenience, and is no
different to, say, that of an exchange where a user deposits ada and withdraws
fiat. The issue of "sufficiently confirmed" is pushed up-stream to the L1
liaison component.

The assumption of "sufficiently confirmed" avoids a potentially unsafe scenario
described as follows. Suppose an L1 subbit is opened or added to in a tx that is
rolled back. If this is synced to SubbitMan, it can result in DB subbits with
`tot` that is not underwritten by funds on the L1. Thus it is unsafe for the
provider. Were this to happen, a new sync would prevent further funds being put
at risk.

We do not rely on the sufficiently confirmed assumption for scenarios beyond the
one outlined. For example, syncing after a roll back has occurred does not, say,
result in the DB being in an inconsistent state.

To meet the "sufficiently confirmed" condition, it very likely requires a delay
between the L1 tip and that being synced with SubbitMan. It is necessary that
this delay is smaller, and likely quite a bit smaller than the close period.
Beyond this, there are no further assumptions on the freshness of the sync data.
For example, a UTXO provided may have already been spent by the time it is
included in a sync.

We assume that all UTXOs at tip corresponding to "Opened" subbits are present in
the body. The absence of a subbit in the request implies there is no subbit on
the L1 underwriting an associated cost. Any subbit in the DB that has no
"Opened" subbit at tip is "Suspended".

We upstream to the L1 liaison the mapping of the "raw" UTXO data into the form
required here. The L1 liaison is responsible for filtering on the stage
"Opened", but can otherwise can be agnostic to the provider's config. That is,
it may or may not also filter on

- provider key (equals the config provider key)
- currency (equals the config currency)
- close period (is at least the config close period)
- tag length (is no greater than config tag length)

All these are to keep the provider safe from unsafe, or simply tedious
behaviour.

Note: Upstreaming the mapping of UTXOs avoids the need to deserialize datums in
SubbitMan itself.

### HTTP methods

The HTTP methods do not comfortably align with the logic of SubbitMan. For
example, in AccMan the tot request uses the get method without offending the
HTTP specs, while in SubbitMan, the tot request is not necessarily idempotent
and therefore ought not to use "get". More precisely, if the credential is an
IOU then it is not idempotent, while the "fixed" credential is idempotent.

Of the two non-idempotent methods, post and patch, which is most correct depends
on the interpretation of "resource". In the SubbitMan DB each amount is stored
as a separate entry. An alternative design may perhaps have a single entry per
subbit with all amounts. Interpreting each entry as a separate "resources" would
suggest that in the present implementation the "patch" method is a bad fit. This
leaves us with "post" as the most appropriate HTTP method for a tot request. The
post method is essentially the "none of the above" option.

## Components

### Config

The config is used to set global constants.

The config is assembled from "options". There are default options specified in
`src/index.js`.

Options can be set or overwritten by env vars by using `SUBBIT_MAN_` followed by
the variable name in screaming camel case. For example:

```ini
SUBBIT_MAN_PROVIDER=0000...
```

The provider defaults to 32 null bytes. The provider must be set. All others
have default values.

#### DB path

The location of the DB path

#### Provider key

This is the provider verification key. It is provided as a hex encoded string
(should be 64 characters). It is used to filter UTXOs at the subbit address.
SubbitMan itself does not build or sign transactions, and does not seed the
signing key.

#### Currency

The supported currency. Defaults to Ada.

To specify:

```ini
SUBBIT_MAN_CURRENCY=ada
SUBBIT_MAN_CURRENCY=byHash:0000...
SUBBIT_MAN_CURRENCY=byClass:0000...
```

In the case of "byHash", the string following the colon is script hash, hex
encoded. In the case of "byClass", the string following the colon is script hash
followed by the asset name, hex encoded (aka the unit).

#### Close period

The minimum permissible close period on a subbit. Like all time, this is
measured in milliseconds.

Default is 1 day.

#### Tag length

The maximum possible tag length (inclusive). The tag is chosen by the consumer.
There is no danger to the provider if the tag is empty of many 100s of bytes.
However there is no need to have long tags, and they increase resource usage.
Thus, it is sensible to ignore subbits with long tag names.

Default is 20.

#### Now threshold

The permitted age of timestamp credential. If set then allow the use of the
timestamp credential, else do not allow timestamps.

Default is 5 seconds. To prevent using timestamp credentials, set the env var to
an empty string.

#### Fixed seed

The fixed seed is an integer (as a string) set by the provider. If set then
allow the use of the fixed credential, else do not allow fixed credentials.

Default is 1234567890. To prevent using timestamp credentials, set the env var
to an empty string.

#### Init Cost

The default cost of initializing a subbit.

### Credentials

A credential is included in the headers of requests coming from consumers. It is
used to verify the source of the request and query the associated `tot`.

There are three types of credential:

1. IOU
2. (Time)Stamp
3. Fixed

The credentials have a cbor encoding as follows:

```cddl
cred = [iou_key, iou // stamp // fixed , signature]
iou = #6.121([tag, amount])
stamp = #6.122([tag, now])
fixed = #6.122([tag, seed])
iou_key = byte .size 32
tag = bytes
amount = uint
now = uint
seed = uint
```

Each of these contains a signature. If the data is well structured, and the
signature is valid, then we say that the credential is well-formed.

#### Credential : IOU

The IOU is as defined on the L1. It may be used by the provider to `sub` from
the associated subbit the amount declared.

Once a subbit has been used in a `sub` it is necessarily public knowledge, since
it is on the blockchain. We assume that all issued IOUs are public knowledge.
Thus, the same IOU should not be accepted more than once.

In some cases it is not possible for the consumer to determine prior to the
request the cost of servicing the request. Instead they can provide an IOU with
an upper bound amount. This introduces the need to differentiate between the two
amounts:

1. The amount on the IOU
2. The amount "owed" to the provider, aka _cost_

We assume the consumer can verify the cost on the response, and assess whether
they are content with the bit of service.

The divergence between the cost and the IOU amount makes it possible for a
scenario in which the consumer may have `tot` enough to service a request
without needing to issue a new IOU. This gives rise to the need for alternative
credentials.

#### Credential : Stamp

If the provider has configured the `now_threshold` paramter, then the server
accepts timestamp credentials. The timestamp `now`, posix time in milliseconds,
must be recent with respect to the server. That is the servers current time
`now_server` must be such that

```math
0 <= now_server - now <= now_threshold
```

#### Credential : Fixed

The fixed credential is treated like shared secret as in http basic auth or
AccMan. In this sense, it can employed such that SubbitMan is a drop-in
replacement of AccMan also for the client. (SubbitMan is already a drop-in
replacement with respect to the server.)

If the provider has configured a fixed seed, then the consumer may used a fixed
credential.

The inclusion of the seed is not strictly necessary. It does allow us to
distinguish between ill-formed and bad signature errors. That is, if the seed is
wrong then it is ill-formed.

## Endpoints

The interface to external systems is via HTTP endpoints. Endpoints are grouped
in terms of which external system they are intended for, and making it easy to
restrict access of one external system to other endpoints. For example, L1
endpoints are needed to liaise with the L1, but are not be needed by the user
facing services.

### EP : L2

Endpoint : `/l2`

Used by the services that is serving end users. This is akin the AccMan api.

#### EP : L2 : Tot

Endpoint: `/tot&cred=<cred>`

Any (configured) credential can be used for `cred`. The `cred` is base 64
encoded. The endpoint checks that signature is valid.

In the case that the credential is an IOU, the DB incurs an IOU event.

Returns: The associated `tot` is retrieved from the DB and returned.

Errors:

1. `BadStructure` - If the data is not parse-able (not base 64 or not expected
   form).
2. `BadSignature` - If the signature is wrong.
3. `NoSubbit` - No subbit matching key tag. This may occur if the L1 subbit is
   recent an not yet been synced, or the L1 subbit is considered malformed, such
   as wrong currency, or insufficient close period.
4. `Suspended(reason)` - There is a subbit, but service is suspended. Reasons
   include: 1. Manual suspension 2. L1 Subbit no longer opened 3. Other

#### EP : L2 : Mod

Endpoint: `/mod&cred=<cred>&by=<by>`

The credential `<cred>` as in the tot endpoint. `<by>` is a (stringified) int.

The DB incurs a mod event.

Note that here the credential is assumed to be well-formed. This follows from
the assumption that a mod request happens after a tot request, and a tot fails
if the credential is ill-formed. The credential is inspected insofar as to pull
out the keytag required for extracting the tot amount.

Returns:

The associated `tot` is retrieved from the DB and returned.

Errors:

1. `BadStructure`
2. `NoSubbit`
3. `Suspended(reason)`

Each of these _ought_ to be impossible under normal working assumptions. It is
possible, say, to imagine a subbit being suspended between a tot request and a
mod request.

### EP : L1

Endpoint : `/l1`

Used by the L1 liaison to sync L1 subbit states and construct transactions that
`sub` and `settle`.

### EP : L1 : Sync

Endpoint: `/sync`

Body:

```ts
type subbitUtxo = {
    txId : Hex,
    outputIdx : Int,
    provider : Hex,
    currency : "Ada" | { "ByHash" : Hex } | { "ByClass" : Hex },
    closePeriod : Int,
    iouKey : Hex,
    tag : Hex,
    subbitAmt : Int,
    sub : Int,
}
body = subbitUtxo[]
```

The L1 liaison sends, as the body, the UTXOs representing Opened subbits at tip.

Entries are grouped and ordered by keytag. The DB is queried for all opened
subbits, and the two objects are merged:

```js
{...Object.fromEntries(dbKeytags.map(k => [k, []])), ...l1Subbits }
```

This results in all existing DB subbits defaulting to having an empty list as
value, which overwritten by L1 subbits if any exist. In addition, any new
subbits are present.

The entries are iterated over. For each keytag and list of associated L1 subbits
the following actions are taken:

- If there is a DB subbit but no L1 subbit, then the DB subbit is suspended
- If there is a DB subbit and at least one L1 subbit, then:
  - If the DB subbit state differs from the L1 subbit of max sub-able value,
    then update
  - Else no action.
- If there is no DB subbit for which there is at least one L1 subbit, a DB
  subbit is inserted with the L1 subbit of max sub-able value.

Note: Previous versions of the design had a much more elaborate handling of
stage and state of subbits in the DB. Handling the extra information can
increase responsiveness and support additional functionality. However, this
comes at the cost of added complexity. Eventually the design was pared back to
the _necessary_, and pushing some issues upstream.

Note: The design minimizes the logic between a `get` and `put` (of consequence).
LevelDB iterators return keys and values at the time of instantiation not the
current state of the DB. For example:

```js
const db = new MemoryLevel();
await db.put("a", 1);
const i0 = db.iterator();
await db.put("b", 2);
const i1 = db.iterator();
let s0 = "";
for await (const [k, v] of i0) {
  s0 += `${k}:${v}, `;
}
let s1 = "";
for await (const [k, v] of i1) {
  s1 += `${k}:${v}, `;
}
console.log(s0); // a:1,
console.log(s1); // a:1, b:2
```

There is potentially a gap between the `db.getOpened` key tags and the upserting
of the L1 subbits. Each upsert operation begins with `getInfo` to minimize the
window between the get and put.

Suppose instead we rely on a single iterator for all data. If `sync` is called
twice in quick succession it could result in an `insert` occuring where an
`update` or `noAction` would be correct. If in addition a `putMod` or `putIou`
occurred in the window between the two `insert`s then the provider would have
potentially lost funds. Certainly the DB would not be in the desired state. IRL,
this would be unlikely to occur, and very hard to then also exploit. On
underwhelming hardware, LevelDB can handle ~50000 puts and gets per second. This
is surely not going to be our first set of scaling issues. For perspective, if
the L1 was entirely handling subbits, the throughput might optimistically be
~240 subbits a block, equivalent to 12 subbits a second.

Safer still would be lock the DB while the sync is in process, and permit only
one sync at a time. However, this would result in SubbitMan being unresponsive
to other requests during the sync period which is undesirable and unnecessary.

Returns: A report of the result.

There are some _what happens if..._ questions here. What happens if ...

1. ... sync is called twice in very quick succession. It is safe. The action is
   idempotent with respect to the effect on the DB, although the response will
   be different.
2. ... the payload contains subbits from txs that are rolled-back. This we break
   down into each of the steps:

   - Open or Add: This may be unsafe! In certain contexts, this will lead to DB
     subbits with `tot` that is not underwritten by funds on the L1.
   - Close: This is safe. The DB subbit will be suspended. Even if the close
     step fails to make it on chain, the tx existed in the Mempool of honest
     nodes (we assumes) and so it is sufficient proof that the consumer intended
     to close the subbit.
   - Sub: This is safe. A sub should change the `sub` and `subbitAmt` by the
     same amount, and so has no effect on `tot`. -
   - Settle: This is safe, since it is not relevant.

3. ... the payload is derived from a stale tip. We assume this is not older than
   a previous, block still on-chain. In particular, it is not older than a sub
   already synced

### EP : L1 : IOUs

Endpoint: `/ious`

It is for the L1 liaison to choose which ious to batch into transactions.

**Danger**: The L1 liaison _must not_ construct a tx with an iou corresponding
to an entry in the DB with `stage = "Opened"` that on chain is `closed`. In
other words, IOUs form subbits marked as "Opened" can only be used in txs if the
corresponding L1 subbit is `Opened`. Syncing the DB will resolve this
divergence: the DB entry will then be marked "Suspended", and the L1 liaison can
perform a settle step.

Returns: An object of the type
`Record<Keytag : { iouAmt : Int, sig: Hex, txId? : Hex, outputIdx? : Int}>`. If
the DB subbit is in an Opened stage, the associated value contains the subbit
underwriting it.

### EP : Exec

Endpoint : `/exec`

This group of endpoints is intended to be used by the provider to manage
consumer accounts manually. There is much scope to expand this endpoint to meet
providers' needs. Those needs will become apparent on use.

#### EP : Exec : Show

Endpoint : `/show`

See all the entries in the db.

Returns:

An array of `Info`.

#### EP : Exec : Edit

Endpoint : `/edit`

The provider can modify an entry. This is intended to be used when suspending a
subbit. Note that when "unsuspending", when setting the stage to "Opened", the
executor must ensure that the L1 subbit details are accurate. At worst, they
should immediately sync with the L1 after the edit.

The body of the post is a record, keys are hex encoded keytags, values are
actions. An action can indicate a suspend, an unsuspend, or a mod. For example:

```js
{
    "00000..." : { kind : "suspend" },
    "10000..." : { kind : "unsuspend" },
    "20000..." : { kind : "mod", by : "9999" },
}
```

Note that an unsuspend can be unsafe. A provider should `sync` immediately
following an unsuspend to ensure the L1 subbit underwriting the DB subbit is
accurate. If they are concerned, they may sandwich the `unsuspend` and `sync`
with two `mods`, ensuring the account is not usable before the sync is complete.
Note also, it is not safe to attempt multiple edits on a single keytag.

#### EP : Exec : Drop

Endpoint : `/drop`

**DANGER**. This will delete data in the database.

There are three types of drop:

1. By keytags
2. By time since suspended.
3. Events older than X amount of time

The body of the post is an object, where the kind indicates , and the value
additional information. An action can indicate a suspend, an unsuspend, or a
mod. Examples:

```js
let case1 = { kind: "keytag", value: ["00000..."] };
let case2 = { kind: "time", value: { olderThan: "timedelta" } };
let case3 = { kind: "events", value: { olderThan: "timedelta" } };
```

When dropping subbits, only suspended subbits may be dropped. A drop of a subbit
will delete the IOUs. The executor must be sure that the IOUs have been
utilised. Dropping a subbit will also delete its event history. When dropping
events, the associated DB subbit may be in an opened or suspended stage. The
latest IOU is still available as part of the DB subbit entries.

Result: Ok / Fail. A fail happens at a per subbit level.

At the time of writing, this has not yet been implemented.

## DB

The DB is a LevelDB database.

We aim for something approximating an event driven design. Each event, if it
passes checks, is inserted into the Db, together with additional `put` actions.

### DB Keys

The DB is split into two: state and events. State is treated a mutable, while
events are immutable.

```ini
state = 0
event = 255
```

Each subbit has its state recorded in a set of consecutive entries. An entry
corresponding to a subbit has following bytes in its key.

```js
const base = Buffer.from([...iouKey, ...tag]);
```

For state, we then have the following suffixes:

```ini
stage = 0
cost = 1
iouAmt = 2
sub = 3
subbitAmt = 4
sig = 5
```

The corresponding key is then:

```
const key = (x) => Buffer.from([state, ...iouKey, ...cbor.encode(tag), suffix(x)]);
```

We refer to the following component as the base

```js
const keytag = Buffer.from([...iouKey, ...tag]);
```

For events, the keys are of the form:

```js
const event = Buffer.from([event, ...keytag, cbor.encode(Date.now())]);
```

We ensure that the date is encoded as a fixed (9) number of bytes. Thuse we can
safely straightforwardly extract the keytag and timestamp from the DB key.

### DB Values

#### Stage

The stage indicates whether or not a request can be safely serviced. The stage
is either "Opened" or "Suspended". A subbit in opened stage can be safely
serviced, while a suspended one cannot.

Design note: the use of "stage" changed a lot during the design process. It
still remains unclear exactly what and how to store as part of this "L2
component", coupled with what functionality is available from the L1 liaise and
the functionality desired downstream.

We lean into the fact we are already making heavy use of cbor.

```cddl
stage = opened // suspened
opened = #6.121([tx_id, output_idx])
suspended = #6.122([timestamp, reason])
tx_id = bytes
output_idx = uint
timestamp = uint
reason =   0 # Edit
        // 1 # Closed
```

The opened stage tracks the UTXO (ie L1 subbit) by which the associated cost is
being underwritten. This is used to ensure that an IOU from an "Opened" DB
subbit, is not used to settle an L1 subbit, since this would be unsafe.

When stage is suspended, the timestamp indicates "when suspended". This is used
by logic to drop "old" DB subbits, which have been settled.

#### Amounts

The cost, IOU amount, sub, and subbit amount are all integer values. They are
cbor encoded.

#### Bytes

The signature value is just the bytes (no cbor).

### Events

#### Event : IOU

Add a new IOU.

Checks:

- Stage is opened
- New IOU amount is strictly greater than the current (in DB) IOU amount.

Put:

- New IOU amount
- New signature

The signature is assumed checked by the endpoint handler.

#### Event : Mod

Modify the cost.

The credential is recorded in the event. The current cost is first queried,
inorder to then be modified. **Warning**: There is possibily a race condition
here. Tbc whether this is of consequence.

Put:

- Stage is opened
- Modded cost

### Event : L1

Upsert subbit from L1 state.

We must handle the cases in which there is no, one, or more than one UTXO at tip
with matching keytag. For this reason, we assume that the function is handling a
list of UTXOs per keytag, and selects the "most preferred".

If the subbit does not exist in the DB then put:

- Cost is initial cost
- IOU amount is 0
- Sub is as present
- Subbit amount is as present
- The signature is blank

Else if the subbit does exist, then:

Check:

- Stage is opened

And put:

- Update timestamp
- Sub is as present
- Subbit amount is as present

The "most prefered" utxo is the one for which the provider can sub the greatest
amount. This is depends on the IOU amount, the sub, and the subbit amount. Note
that because it depends on the IOU amount, we cannot select the most prefered
utxo until we've queried the current IOU amount.

#### Event : Edit

These are triggered by exec actions. They can suspend, unsuspend or mod a
subbit.

### DB Queries

There are several DB queries.

In a previous version, there had been some attempts to optimise queries, pulling
precisely the data required for each query. Currently, there is essentially one
query at a per subbit level, `getInfo`, and all other querries cherry pick the
fields required.

Other queries include: get tot, get IOUs, get opened, get infos (ie for info for
each DB subbit).

As with AccMan, the ability to query the past is not yet exposed.

## Notes

### Serde (hell)

It is an artifact of the trigger happy tagging from plutus that an `iou` body
message has the alternate constructor tag `121`. We can use this to ensure that
a `stamp` and `fixed` is distinct from an `iou`, despite having otherwise
identical form.

Plutus lists are always serialized on-chain as having indefinite length[^1]. We
require the Iou at least to match this encoding in order for the signature, to
be accepted on-chain.

We were able to "trick" cbor-x to give us indefinite arrays by converting an
array to a generator. We had align the serialization of `stamp` to match that of
`iou`, which is not necessary - fixed legth array would also work fine.

However, cbor-x required additional hackery when handling bigints. It defaults
to encoding `bigint` as at least `1b`, even if a more compact encoding is
available. On further twiddling, it didn't
[seem to be encoding integers correctly](https://github.com/kriszyp/cbor-x/issues/124).
We ditched cbor-x for cbor2. Only then to re-solve the same indefinite length
issue again. I'd actually forgotten about this until some e2e tests failed. I
should have used golden tests, and not soley roundtrips.

It is our implicit assumption here that stamps are "secret" for at least as long
as the threshold, and fixed creds are always secret.

[^1]: Citation needed, but its definitely a thing.
