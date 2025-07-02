base_url:=env('SUBBIT_MAN_URL', "http://127.0.0.1:7822")

provider_skey_def := "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
provider_vkey_def := shell("node ./scripts/mk-key.js $1 | jq '.vkhHex' | tr -d '\"' ", provider_skey_def )
currency_def := "Ada"
close_period_def := "3600000"
iou_skey_def := "0000000000000000000000000000000000000000000000000000000000000001"
iou_key_def := shell("node ./scripts/mk-key.js $1 | jq '.vkeyHex' | tr -d '\"' ", iou_skey_def )
tag_def := "deadbeef000000"
keytag_def := shell("echo ${1}${2}", iou_key_def, tag_def)
now_def := shell('date +"%s%3N"')
tx_id_def := "6666666666666666666666666666666666666666666666666666666666666666"
output_idx_def := "123"
sub_def := "0"
subbit_amt_def := "100000000"
address_def := "addr_test1wq833v4j6sfldkrr275xm9vqzkeyp65d45kzrf2qfwe3y0c9dnk2h"
file_def := "/tmp/subbit-man-l1s.json"

help: 
  just -l

# Convert schemas to types for type hints
schemas2types:
  pnpm prettier schemas.json -w
  pnpm json2ts -i schemas.json -o src/schemaTypes.d.ts --unreachableDefinitions

# Get tot by cred (iou or stamp)
tot cred:
  curl -X POST "{{base_url}}/l2/tot?cred={{cred}}" -w "\n"

tot-iou amt tag=tag_def iou_skey=iou_skey_def:
  just tot $(node ./scripts/mk-iou.js {{amt}} {{tag}} {{iou_skey}})

tot-stamp now=now_def tag=tag_def iou_skey=iou_skey_def:
  just tot $(node ./scripts/mk-stamp.js {{now}} {{tag}} {{iou_skey}})

# Info (components of tot)
info cred:
  curl -X GET "{{base_url}}/l2/info?cred={{cred}}" -w "\n"

# Info (components of tot)
info-stamp  tag=tag_def iou_skey=iou_skey_def:
  just info $(node ./scripts/mk-stamp.js {{now_def}} {{tag}} {{iou_skey}})

# Mod tot of cred 
mod cred by:
  curl -X PATCH "{{base_url}}/l2/mod?cred={{cred}}&by={{by}}" -w "\n"

# Mod tot of cred 
mod-stamp by tag=tag_def iou_skey=iou_skey_def:
  just mod $(node ./scripts/mk-stamp.js {{now_def}} {{tag}} {{iou_skey}}) {{by}}

# Sync L1s
sync-one tag=tag_def output_idx=output_idx_def sub=sub_def subbit_amt=subbit_amt_def tx_id=tx_id_def iou_key=iou_key_def provider=provider_vkey_def currency=currency_def close_period=close_period_def:
  curl -X POST "{{base_url}}/l1/sync" -H "Content-Type: application/json" -w "\n" -d '[{"currency" : "{{currency}}", "provider" : "{{provider}}", "closePeriod" : "{{close_period}}", "iouKey" : "{{iou_key}}", "tag" : "{{tag}}" , "txId" : "{{tx_id}}" , "outputIdx" : "{{output_idx}}", "sub" : "{{sub}}" , "subbitAmt" : "{{subbit_amt}}" }]'

# Get ious
ious:
  curl -X GET "{{base_url}}/l1/ious" -H "Content-Type: application/json" -w "\n"

# Sync L1s
mk-l1s n file=file_def:
  node ./scripts/mk-l1s.js {{file}} {{n}}

# Sync L1s
sync file=file_def:
  echo {{provider_vkey_def}}
  curl -X POST "{{base_url}}/l1/sync" -H "Content-Type: application/json" -w "\n"  -d "@{{file}}" 

# Show
show:
  curl -X GET "{{base_url}}/exec/show" -H "Accept-Type: application/json" | jq

# Suspend by keytag
suspend keytag=keytag_def:
  curl -X POST "{{base_url}}/exec/edit" -H "Content-Type: application/json" -w "\n"  -d "{ \"{{keytag}}\" : { \"kind\" : \"suspend\" } }"

# Unsuspend by keytag
unsuspend keytag=keytag_def:
  curl -X POST "{{base_url}}/exec/edit" -H "Content-Type: application/json" -w "\n"  -d "{ \"{{keytag}}\" : { \"kind\" : \"unsuspend\" } }"

# Mod by amount
edit-mod by keytag=keytag_def:
  curl -X POST "{{base_url}}/exec/edit" -H "Content-Type: application/json" -w "\n"  -d "{ \"{{keytag}}\" : { \"kind\" : \"mod\" , \"by\" : "{{by}}" } }"

# Prettify a cbor hex
pretty-cbor cborHex:
  echo "{{cborHex}}" | xxd -r -p | cbor2pretty.rb

