import { LogicSigAccount } from "algosdk";
import algosdk from "algosdk";

import YAMLData from "~/artifacts/cache/htlc.yaml";

const token =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const server = "http://localhost";
const port = 4001;
let algodClient = new algosdk.Algodv2(token, server, port);

const LAST_ROUND = "last-round";
const CONFIRMED_ROUND = "confirmed-round";

const escrowAddress = YAMLData.compiledHash; //"YEUJZXDQAUA3J6WK3RZQJKHCM3S7E6UQF3I6AKRGTIGACFXDKFSKBYCYKU";

const waitForConfirmation = async function (txId) {
  let response = await algodClient.status().do();
  let lastround = response[LAST_ROUND];
  while (true) {
    const pendingInfo = await algodClient
      .pendingTransactionInformation(txId)
      .do();
    if (
      pendingInfo[CONFIRMED_ROUND] !== null &&
      pendingInfo[CONFIRMED_ROUND] > 0
    ) {
      //Got the completed Transaction
      return (
        "Transaction " +
        txId +
        " confirmed in round " +
        pendingInfo[CONFIRMED_ROUND]
      );
    }
    lastround++;
    await algodClient.statusAfterBlock(lastround).do();
  }
};

async function getEscrowDetails() {
  const escrowInfo = await algodClient.accountInformation(escrowAddress).do();
  return {
    address: escrowAddress,
    balance: escrowInfo.amount,
  };
}

async function WithdrawHtlc(receiver, secret, amount) {
  const secretBytes = new Uint8Array(Buffer.from(secret));

  const lsig = new LogicSigAccount(YAMLData.base64ToBytes, [secretBytes]);
  if (lsig.tag) {
    lsig.tag = Uint8Array.from(lsig.tag);
  }

  const params = await algodClient.getTransactionParams().do();
  params.fee = 1000;
  params.flatFee = true;

  const closeToRemainder = undefined;
  const note = undefined;
  const txn = algosdk.makePaymentTxnWithSuggestedParams(
    escrowAddress,
    receiver,
    amount,
    closeToRemainder,
    note,
    params
  );

  let signedTx = await algosdk.signLogicSigTransactionObject(txn, lsig);
  let sentTx = await algodClient.sendRawTransaction(signedTx.blob).do();
  let resp = await waitForConfirmation(sentTx.txId);

  return "Escrow withdrawal successful. " + resp;
}

export { getEscrowDetails, WithdrawHtlc };
