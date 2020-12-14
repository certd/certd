/**
 * ACME auto helper
 */
const Promise = require('bluebird')
const debug = require('debug')('acme-client')
const forge = require('./crypto/forge.cjs')

const defaultOpts = {
  csr: null,
  email: null,
  preferredChain: null,
  termsOfServiceAgreed: false,
  skipChallengeVerification: false,
  challengePriority: ['http-01', 'dns-01'],
  challengeCreateFn: async () => { throw new Error('Missing challengeCreateFn()') },
  challengeRemoveFn: async () => { throw new Error('Missing challengeRemoveFn()') }
}

/**
 * ACME client auto mode
 *
 * @param {AcmeClient} client ACME client
 * @param {object} userOpts Options
 * @returns {Promise<buffer>} Certificate
 */

module.exports = async function (client, userOpts) {
  const opts = Object.assign({}, defaultOpts, userOpts)
  const accountPayload = { termsOfServiceAgreed: opts.termsOfServiceAgreed }

  if (!Buffer.isBuffer(opts.csr)) {
    opts.csr = Buffer.from(opts.csr)
  }

  if (opts.email) {
    accountPayload.contact = [`mailto:${opts.email}`]
  }

  /**
     * Register account
     */

  debug('[auto] Checking account')

  try {
    client.getAccountUrl()
    debug('[auto] Account URL already exists, skipping account registration')
  } catch (e) {
    debug('[auto] Registering account')
    await client.createAccount(accountPayload)
  }

  /**
     * Parse domains from CSR
     */

  debug('[auto] Parsing domains from Certificate Signing Request')
  const csrDomains = await forge.readCsrDomains(opts.csr)
  const domains = [csrDomains.commonName].concat(csrDomains.altNames)

  debug(`[auto] Resolved ${domains.length} domains from parsing the Certificate Signing Request`)

  /**
     * Place order
     */

  debug('[auto] Placing new certificate order with ACME provider')
  const orderPayload = { identifiers: domains.map((d) => ({ type: 'dns', value: d })) }
  const order = await client.createOrder(orderPayload)
  const authorizations = await client.getAuthorizations(order)

  debug(`[auto] Placed certificate order successfully, received ${authorizations.length} identity authorizations`)

  /**
     * Resolve and satisfy challenges
     */

  debug('[auto] Resolving and satisfying authorization challenges')

  async function challengeHandle (authz) {
    const d = authz.identifier.value

    /* Select challenge based on priority */
    const challenge = authz.challenges.sort((a, b) => {
      const aidx = opts.challengePriority.indexOf(a.type)
      const bidx = opts.challengePriority.indexOf(b.type)

      if (aidx === -1) return 1
      if (bidx === -1) return -1
      return aidx - bidx
    }).slice(0, 1)[0]

    if (!challenge) {
      throw new Error(`Unable to select challenge for ${d}, no challenge found`)
    }

    debug(`[auto] [${d}] Found ${authz.challenges.length} challenges, selected type: ${challenge.type}`)

    /* Trigger challengeCreateFn() */
    debug(`[auto] [${d}] Trigger challengeCreateFn()`)
    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge)

    try {
      await opts.challengeCreateFn(authz, challenge, keyAuthorization)

      /* Challenge verification */
      if (opts.skipChallengeVerification === true) {
        debug(`[auto] [${d}] Skipping challenge verification since skipChallengeVerification=true`)
      } else {
        debug(`[auto] [${d}] Running challenge verification`)
        await client.verifyChallenge(authz, challenge)
      }

      /* Complete challenge and wait for valid status */
      debug(`[auto] [${d}] Completing challenge with ACME provider and waiting for valid status`)
      await client.completeChallenge(challenge)
      await client.waitForValidStatus(challenge)
    } finally {
      /* Trigger challengeRemoveFn(), suppress errors */
      debug(`[auto] [${d}] Trigger challengeRemoveFn()`)

      try {
        await opts.challengeRemoveFn(authz, challenge, keyAuthorization)
      } catch (e) {
        debug(`[auto] [${d}] challengeRemoveFn threw error: ${e.message}`)
      }
    }
  }

  debug('[auto] Waiting for challenge valid status')
  // await Promise.all(challengePromises)
  for (const authz of authorizations) {
    debug('------------------------------------------------')
    await challengeHandle(authz)
    await Promise.delay(1000)
    debug('------------------------------------------------')
  }
  /**
     * Finalize order and download certificate
     */

  debug('[auto] Finalizing order and downloading certificate')
  await client.finalizeOrder(order, opts.csr)
  return client.getCertificate(order, opts.preferredChain)
}
