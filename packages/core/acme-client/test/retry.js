const { assert } = require('chai');
const Promise = require('bluebird');
const util = require('../src/util');

let count = 0;
async function apiRequest() {
    count += 1;
    console.log(new Date(), 'retry count:', count);
    await Promise.delay(2000);
    return count;
}

async function waitForValidStatus() {
    const verifyFn = async (abort) => {
        const resp = await apiRequest();

        /* Verify status */
        console.log(new Date(), 'Item has status', resp);
        if (count < 3) {
            abort();
            throw new Error(`${new Date()}error`, count);
        }

        console.log(new Date(), 'success');
        return 'success';

        // if (resp.data.status === 'invalid') {
        //     abort();
        //     throw new Error(util.formatResponseError(resp));
        // }
        // else if (resp.data.status === 'pending') {
        //     throw new Error('Operation is pending');
        // }
        // else if (resp.data.status === 'valid') {
        //     return resp.data;
        // }
        //
        // throw new Error(`Unexpected item status: ${resp.data.status}`);
    };

    console.log(new Date(), 'Waiting for valid status from', this.backoffOpts);
    return util.retry(verifyFn, this.backoffOpts);
}
/**
 */
describe('util', () => {
    it('retry', async function() {
        this.timeout(100000);
        try {
            await waitForValidStatus();
        }
        catch (e) {
            console.error('1111', e);
        }


        // await Promise.delay(100000);
    });
});
