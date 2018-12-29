/*
server
9cf492dcd4a1724470181fcfeff833710eec58fd6a4e926a8b760266dfde9659
TsX1TGWi6Ss6CPNz7kcGSq5be7Q1ogVyerK

client
f91b705c29978d7f5472201129f3edac61da67e4e2ec9dde1f6b989582321dbf
TsRDtJmAbavWHUEaDcCjG7YwDRJThhAnafp
*/

const bitcore = require('bitcore-lib')
var explorers = require('bitcore-explorers');
const insight = new explorers.Insight('https://testnet.decred.org'); // https://mainnet.decred.org/
const network = bitcore.Networks.dcrtestnet // dcrdlivenet

// generate server pub/priv key
const serverPrivateKey = new bitcore.PrivateKey('9cf492dcd4a1724470181fcfeff833710eec58fd6a4e926a8b760266dfde9659', network);
const serverPublicKey = bitcore.PublicKey(serverPrivateKey);
const serverAddress = serverPublicKey.toAddress(network) 

// generate client pub/priv key
const clientPrivateKey = new bitcore.PrivateKey('f91b705c29978d7f5472201129f3edac61da67e4e2ec9dde1f6b989582321dbf', network)
const clientPublicKey = bitcore.PublicKey(clientPrivateKey)
const clientAddress = clientPublicKey.toAddress(network)

// ln invoice
const preimage = 'c104ac676ab0b9005222043de34195f6666d92382e1e161eac7c9358f6eddeb0'
const hash = '685db6a78d5af37aae9cb7531ffc034444a562c774e54a73201cc17d7388fcbd'

fund()
async function fund() {
  const script = bitcore      
  .Script()
  .add('OP_SHA2')
  .add(new Buffer(hash, 'hex')) 
  .add('OP_EQUAL')
  // .add('OP_IF')
  // .add('OP_SHA256')
  // .add(new Buffer(hash, 'hex')) // hash of preimage
  // .add('OP_EQUALVERIFY')
  // .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(serverAddress.toString()))) // send DCR here
  // .add('OP_ELSE') 
  // .add(bitcore.crypto.BN.fromNumber(1545950398).toScriptNumBuffer())
  // .add('OP_CHECKLOCKTIMEVERIFY')
  // .add('OP_DROP')
  // .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(clientAddress.toString())))
  // .add('OP_ENDIF');

  console.log('fund', bitcore.Address.payingTo(script))
  return bitcore.Address.payingTo(script).toString()
}

claim('Tcff8NbANCwTfMzpUNbNHw4Cz5tCbL2da1U', 'c104ac676ab0b9005222043de34195f6666d92382e1e161eac7c9358f6eddeb0')
async function claim(fundAddress, preimage) {
  // get info from fund address
  const fundUtxos = await getUnspentUtxos(fundAddress)
  const fundBalance = fundUtxos.reduce((prev, curr) => {return curr.atoms + prev}, 0)

  const lockScript = bitcore      
  .Script()
  .add('OP_SHA2') // node_modules/bitcore-lib/lib/opcode.js
  .add(new Buffer(hash, 'hex')) 
  .add('OP_EQUAL')
  // .add('OP_IF')
  // .add('OP_SHA256')
  // .add(new Buffer(hash, 'hex')) // hash of preimage
  // .add('OP_EQUALVERIFY')
  // .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(serverAddress.toString()))) // send DCR here
  // .add('OP_ELSE') 
  // .add(bitcore.crypto.BN.fromNumber(1545950398).toScriptNumBuffer())
  // .add('OP_CHECKLOCKTIMEVERIFY')
  // .add('OP_DROP')
  // .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(clientAddress.toString())))
  // .add('OP_ENDIF');
  
  // scriptAddress from fund() Tckv47Y8KfZb9e3FM6wHVY7ozDirBNWEReS
  const transaction = new bitcore
    .Transaction(network)
    .from({
      txId: 'dd9e1da14ea4bd53339e093d9d865e3d35dc974b6cb5b47b888bd34c3c02694e',
      vout: 0,
      scriptPubKey: lockScript.toScriptHashOut(),
      amount: 200 || fundBalance
    })
    .to(serverAddress, 20000000000 - 1000 || fundBalance)
    .lockUntilDate(1545950399); // CLTV
   
  // the CLTV opcode requires that the input's sequence number not be finalized
  transaction.inputs[0].sequenceNumber = 0 

  const signature = bitcore.Transaction.sighash.sign(
    transaction,
    serverPrivateKey,
    bitcore.crypto.Signature.SIGHASH_ALL,
    0,
    lockScript
  )

  const unlockScript = bitcore.Script
  .empty()
  // .add(signature.toTxFormat())
  .add(new Buffer(preimage, 'hex'))
  // .add('OP_TRUE') // choose the time-delayed refund code path
  .add(lockScript.toBuffer())

  console.log('\n\n\n', unlockScript, lockScript)

  // setup the scriptSig of the spending transaction to spend the p2sh-cltv-p2pkh
  transaction.inputs[0].setScript(unlockScript)

  console.log('claim', transaction)
 }

// refund('Tcff8NbANCwTfMzpUNbNHw4Cz5tCbL2da1U')
async function refund(fundAddress) {
  // get info from fund address
  const fundUtxos = await getUnspentUtxos(fundAddress)
  const fundBalance = fundUtxos.reduce((prev, curr) => {return curr.atoms + prev}, 0)

  const script = bitcore      
  .Script()
  .add('OP_IF')
  .add('OP_SHA256')
  .add(new Buffer(hash, 'hex')) // hash of preimage
  .add('OP_EQUALVERIFY')
  .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(serverAddress.toString()))) // send DCR here
  .add('OP_ELSE') 
  .add(bitcore.crypto.BN.fromNumber(1545950398).toScriptNumBuffer())
  .add('OP_CHECKLOCKTIMEVERIFY')
  .add('OP_DROP')
  .add(bitcore.Script.buildPublicKeyHashOut(bitcore.Address.fromString(clientAddress.toString())))
  .add('OP_ENDIF');

  // scriptAddress from fund() Tckv47Y8KfZb9e3FM6wHVY7ozDirBNWEReS
  const transaction = new bitcore
    .Transaction(network)
    .from({
      txId: '0f3463fcd6c14d467f2c6eeb4741587f56b9fc96f7170c0a662ded3dfb546d8f',
      vout: 1,
      scriptPubKey: script.toScriptHashOut(),
      amount: 200 || fundBalance
    })
    .to(clientAddress, 20000000000 - 1000 || fundBalance)
    .lockUntilDate(1545950398); // CLTV
    
  // the CLTV opcode requires that the input's sequence number not be finalized
  transaction.inputs[0].sequenceNumber = 0 

  const signature = bitcore.Transaction.sighash.sign(
    transaction,
    clientPrivateKey,
    bitcore.crypto.Signature.SIGHASH_ALL,
    0,
    script
  )

  // setup the scriptSig of the spending transaction to spend the p2sh-cltv-p2pkh
  transaction.inputs[0].setScript(
    bitcore.Script.empty()
    .add(signature.toTxFormat())
    .add(new Buffer(clientPublicKey.toString(), 'hex'))
    .add('OP_FALSE') // choose the time-delayed refund code path
    .add(script.toBuffer())
)

console.log('refund', transaction)
}

function broadcastTransaction(transaction) {
  return new Promise((res, rej) => {
    insight.broadcast(transaction, (err, txId) => {
      if (err) rej(err)
      res(txId)
    })

  })
}
function getUnspentUtxos(address) {
  return new Promise((res, rej) => {
    insight.getUnspentUtxos(address, (err, utxos) => {
      if (err) rej(err)
      res(utxos)
    })
  })
}
function toHex(str) {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
      hex += '' + str.charCodeAt(i).toString(16)
  }
  return hex
}






// spend(1, 'Tcff8NbANCwTfMzpUNbNHw4Cz5tCbL2da1U')
async function spend(amount, toAddress) {
  const transaction = new bitcore
  .Transaction(network)
  .from(await getUnspentUtxos(serverAddress))
  .to(toAddress, amount * 100000000) // 100000000 atoms == 1 DCR
  .change(clientAddress)
  .sign(clientPrivateKey)
  console.log('spend', transaction)
}