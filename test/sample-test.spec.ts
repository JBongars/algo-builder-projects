import { AccountStore, getProgram, Runtime } from '@algo-builder/runtime';
import { types } from '@algo-builder/web';
import { LogicSigAccount } from 'algosdk';

const minBalance = BigInt(1e6);
const masterBalance = BigInt(10e6);
const amount = BigInt(1e6);

describe('Sample Test', function () {
    let master: AccountStore;
    let fundReceiver: AccountStore;

    let runtime: Runtime;
    let lsig: LogicSigAccount;
    let feeCheckProgram = getProgram('fee-check.teal');

    beforeEach(async function () {
        master = new AccountStore(masterBalance);
        fundReceiver = new AccountStore(minBalance);
        runtime = new Runtime([master, fundReceiver]);

        lsig = runtime.createLsigAccount(feeCheckProgram, []);
        lsig.sign(master.account.sk);
    });

    function syncAccounts(): void {
        master = runtime.getAccount(master.address);
        fundReceiver = runtime.getAccount(fundReceiver.address);
    }

    it('Should not fail because txn fees is equal to or greater than 10000 microAlgos', () => {
        const validTxFee = 10000;
        expect(fundReceiver.balance()).toEqual(minBalance);
        expect(master.balance()).toEqual(masterBalance);

        runtime.executeTx([
            {
                type: types.TransactionType.TransferAlgo,
                sign: types.SignType.LogicSignature,
                lsig: lsig,
                fromAccountAddr: master.address,
                toAccountAddr: fundReceiver.address,
                amountMicroAlgos: amount,
                payFlags: { totalFee: validTxFee }
            }
        ]);
        syncAccounts();
        expect(fundReceiver.balance()).toEqual(minBalance + amount);
        expect(master.balance()).toEqual(masterBalance - amount - BigInt(validTxFee));
    });

    it('Should fail because txn fees is less than 10000 microAlgos', () => {
        const invalidTxFee = 1000;
        const initialFundRecBalance = fundReceiver.balance();
        const initialMasterBalance = master.balance();

        try {
            runtime.executeTx([
                {
                    type: types.TransactionType.TransferAlgo,
                    sign: types.SignType.LogicSignature,
                    lsig: lsig,
                    fromAccountAddr: master.address,
                    toAccountAddr: fundReceiver.address,
                    amountMicroAlgos: amount,
                    payFlags: { totalFee: invalidTxFee }
                }
            ]);
        } catch (error) {
            console.log(error);
        }
        syncAccounts();
        // verify balance is unchanged
        expect(fundReceiver.balance()).toEqual(initialFundRecBalance);
        expect(master.balance()).toEqual(initialMasterBalance);
    });
});
