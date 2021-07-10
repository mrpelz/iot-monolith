import {
  bitLengthPayload,
  byteLengthAddress,
  maxAddress,
  maxPayload,
} from '../device/ev1527.js';
import { EVENT_IDENTIFIER } from '../device/index.js';
import { Rf433 } from '../events/rf433/index.js';
import { Transport } from './index.js';
import { humanPayload } from '../data/index.js';
import { logger } from '../../app/logging.js';

// PACKET FORMAT
//
// event (from device):
// |                                         |                  |
// | address (20 bits, 1st byte left-padded) | payload (4 bits) |
// |                                         |                  |
// |                                         |                  |

export class Ev1527Transport extends Transport {
  private readonly _ev1527Log = logger.getInput({ head: 'Ev1527Transport' });

  constructor(event: Rf433) {
    super(null, 3, false);

    event.observable.observe(({ protocol, value }) =>
      this._handleMessage(protocol, value)
    );
  }

  /**
   * handle incoming messages
   */
  private _handleMessage(protocol: number, value: number) {
    if (protocol !== 1) return;

    // eslint-disable-next-line no-bitwise
    const address = value >> bitLengthPayload;
    if (address > maxAddress) return;

    // eslint-disable-next-line no-bitwise
    const payload = value & maxPayload;
    if (payload > maxPayload) return;

    const deviceIdentifier = Buffer.alloc(byteLengthAddress);
    deviceIdentifier.writeUIntBE(address, 0, byteLengthAddress);

    const payloadBuffer = Buffer.of(payload);

    this._ev1527Log.debug(
      () =>
        `msg incoming\nfrom: ${[...deviceIdentifier]
          .map((octet) => octet.toString(16))
          .join(':')}\n\n${humanPayload(payloadBuffer)}`
    );

    this._ingestIntoDeviceInstances(
      deviceIdentifier,
      Buffer.concat([Buffer.from([EVENT_IDENTIFIER]), payloadBuffer])
    );
  }
}
